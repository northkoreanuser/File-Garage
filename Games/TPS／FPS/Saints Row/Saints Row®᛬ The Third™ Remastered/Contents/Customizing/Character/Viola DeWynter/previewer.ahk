; ============================================================
; 순수 AutoHotkey v1 정적 파일 로컬 서버 + WebView2(Edge/Chromium) 임베드 뷰어
; 이 스크립트를 호스팅할 폴더에 두고 실행하면
;   http://127.0.0.1:8000  으로 그 폴더를 서빙하면서
;   같은 창 안에 WebView2로 바로 렌더링해서 보여준다.
; GET 요청만 처리하는 최소 구현 (로컬 개발/테스트용).
;
; * 필수 준비물 *
;   1) WebView2 Runtime - 최신 Windows 10/11엔 대부분 이미 설치돼 있음.
;      없으면: https://developer.microsoft.com/microsoft-edge/webview2/
;   2) WebView2Loader.dll - 이 스크립트와 같은 폴더에 넣어야 함.
;      NuGet 패키지 Microsoft.Web.WebView2 를 받으면
;      runtimes\win-x64\native\WebView2Loader.dll (64비트 AutoHotkeyU64용)
;      runtimes\win-x86\native\WebView2Loader.dll (32비트 AutoHotkey용)
;      둘 중 실행할 AHK.exe 비트수와 맞는 걸 복사해 넣을 것 - 안 맞으면 DllCall이 실패함.
;
; * 수정 요약 (빈 화면 문제) *
;   - Controller / CoreWebView 에 AddRef 필수 (안 하면 콜백 리턴 직후 COM 객체가 해제됨)
;   - 핸들러 객체(Env/Ctrl/Nav) 전부 전역 + 영구 유지
;   - put_Bounds / put_IsVisible 순서 정리 + 네비 후 한 번 더 바운드 갱신
;   - NavigationCompleted 미발화 원인 추적 로그 강화
; ============================================================
#NoEnv
#Persistent
#SingleInstance, Force
SetWorkingDir, %A_ScriptDir%
SetBatchLines, -1

; 로그 사용 여부 - 1: webview2_debug.log 생성 + 기록 (기본값, 디버깅용)
;              0: 로그 관련 동작 전부 비활성화 - 파일 생성/기록은 물론
;                 Log() 호출 자체가 즉시 리턴되어 메시지 조립 결과를 어디에도 남기지 않음.
; 안정화되면 이 값만 0으로 바꿀 것.
global EnableLog := 0

; 풀스크린 모드 - 1: 실행한 모니터의 화면 크기(A_ScreenWidth x A_ScreenHeight)를 계산해서
;                  그 크기로 창을 띄움(테두리/제목표시줄은 유지, 크기만 화면 전체)
;              0: 기본 1000x700 창 (기본값)
global Fullscreen := 1

; ===================== 설정 =====================
global RootDir := A_ScriptDir
global Port    := 8000   ; 이 포트가 사용 중이면 아래 바인딩 단계에서 1씩 증가시키며 재시도함
global WM_SOCKET := 0x5555
global WV2Loader := A_ScriptDir . "\WebView2Loader.dll"
global WV2UserDataDir := A_Temp . "\WebView2UserData"
global LogFile := A_ScriptDir . "\webview2_debug.log"
global Controller := 0
global CoreWebView := 0
global Environment := 0
global MainHwnd

; 핸들러 객체/vtable 은 반드시 전역. 로컬이면 비동기 콜백 시점에 메모리가 깨짐.
global EnvHandlerVtbl, EnvHandlerObj
global CtrlHandlerVtbl, CtrlHandlerObj
global NavHandlerVtbl, NavHandlerObj
global g_cbQI, g_cbAR, g_cbRel

global MimeMap := { "html": "text/html; charset=utf-8"
                   , "htm":  "text/html; charset=utf-8"
                   , "json": "application/json; charset=utf-8"
                   , "css":  "text/css"
                   , "js":   "application/javascript"
                   , "png":  "image/png"
                   , "jpg":  "image/jpeg"
                   , "jpeg": "image/jpeg"
                   , "gif":  "image/gif"
                   , "svg":  "image/svg+xml"
                   , "ico":  "image/x-icon"
                   , "txt":  "text/plain; charset=utf-8" }

global ListenSock

; ===================== Winsock 초기화 =====================
DllCall("LoadLibrary", "Str", "Ws2_32.dll")
VarSetCapacity(WSAData, 400, 0)
if (DllCall("Ws2_32\WSAStartup", "UShort", 0x0202, "Ptr", &WSAData) != 0)
{
    MsgBox, Winsock 초기화 실패
    ExitApp
}

ListenSock := DllCall("Ws2_32\socket", "Int", 2, "Int", 1, "Int", 6, "Ptr")  ; AF_INET, SOCK_STREAM, IPPROTO_TCP

optval := 1
DllCall("Ws2_32\setsockopt", "Ptr", ListenSock, "Int", 0xFFFF, "Int", 4, "Ptr", &optval, "Int", 4) ; SO_REUSEADDR

; 지능적으로 포트 선택: Port(기본 8000)가 이미 사용 중이면 bind가 실패하므로,
; 그때마다 포트를 1씩 올려서 다시 시도 - 최대 maxPortTries번.
bound := false
startPort := Port
maxPortTries := 20
Loop, %maxPortTries%
{
    VarSetCapacity(sockaddr, 16, 0)
    NumPut(2, sockaddr, 0, "UShort")                                                      ; sin_family = AF_INET
    NumPut(DllCall("Ws2_32\htons", "UShort", Port, "UShort"), sockaddr, 2, "UShort")       ; sin_port
    NumPut(DllCall("Ws2_32\inet_addr", "AStr", "127.0.0.1", "UInt"), sockaddr, 4, "UInt")  ; sin_addr = 127.0.0.1

    if (DllCall("Ws2_32\bind", "Ptr", ListenSock, "Ptr", &sockaddr, "Int", 16) != -1)
    {
        bound := true
        break
    }
    Port++  ; 이 포트는 사용 중 - 다음 포트로 재시도
}

if !bound
{
    MsgBox, % startPort . " ~ " . (Port - 1) . " 사이 포트를 모두 사용 중입니다. 다른 프로그램을 종료하거나 Port 값을 바꿔보세요."
    ExitApp
}

; 실제로 바인딩에 성공한 포트로 확정
; localhost 대신 127.0.0.1 명시 (WebView2 별도 네트워크 스택이 IPv6 먼저 시도하는 경우 방지)
global ServerUrl := "http://127.0.0.1:" . Port

DllCall("Ws2_32\listen", "Ptr", ListenSock, "Int", 5)
DllCall("Ws2_32\WSAAsyncSelect", "Ptr", ListenSock, "Ptr", A_ScriptHwnd, "UInt", WM_SOCKET, "Int", 0x08) ; FD_ACCEPT

OnMessage(WM_SOCKET, "SocketEvent")
OnMessage(0x0232, "OnExitSizeMove")  ; WM_EXITSIZEMOVE - 리사이즈/이동 끝난 직후 바운드 한 번 더 확정
OnExit("Cleanup")

TrayTip, 로컬 서버 시작됨, % ServerUrl . "`n" . RootDir, 5

; ===================== WebView2 초기화 =====================
if !FileExist(WV2Loader)
{
    MsgBox, 48, WebView2Loader.dll 없음, WebView2Loader.dll을 스크립트와 같은 폴더에 넣어주세요.`n(NuGet 패키지 Microsoft.Web.WebView2 안의 runtimes\win-x64\native\WebView2Loader.dll)`n`n일단 기본 브라우저로 대신 엽니다.
    Run, %ServerUrl%
    return
}

if (EnableLog)
    FileDelete, %LogFile%

coHr := DllCall("ole32\CoInitializeEx", "Ptr", 0, "UInt", 0x2)  ; COINIT_APARTMENTTHREADED
Log("0/4 CoInitializeEx hr=" . coHr . " (0=S_OK, 1=S_FALSE 이미 초기화됨)")

FileCreateDir, %WV2UserDataDir%

SplitPath, RootDir, FolderName

; ===================== folders.json 읽기 (제목 / 트레이 아이콘 / 허용 경로 화이트리스트) =====================
; RootDir 바로 밑에 folders.json, favicon.ico, 이 스크립트가 나란히 있는 구조를 전제로 함.
global PageTitle := FolderName   ; folders.json이 없거나 title이 없으면 폴더 이름으로 대체

; 서버가 실제로 응답해주는 경로의 화이트리스트. 여기 없는 경로는 무조건 403 -
; folders.json에 나열된 폴더가 아니면 그 폴더 자체가 안 보이고, 나열된 폴더 안에서도
; 그 폴더의 order.json에 적힌 파일이 아니면 안 보임(하위 폴더/그 외 파일 전부 차단).
global AllowedPaths := {}
AllowedPaths["/"]             := true
AllowedPaths["/index.html"]   := true
AllowedPaths["/folders.json"] := true
AllowedPaths["/favicon.ico"]  := true

FoldersJsonPath := RootDir . "\folders.json"
if FileExist(FoldersJsonPath)
{
    FileRead, foldersJson, *P65001 %FoldersJsonPath%  ; UTF-8로 읽기 (title/subtitle에 한글 들어갈 수 있음)
    jTitle    := JsonStr(foldersJson, "title")
    jSubtitle := JsonStr(foldersJson, "subtitle")

    if (jTitle != "")
        PageTitle := (jSubtitle != "") ? (jTitle . " - " . jSubtitle) : jTitle

    for idx, folderName in JsonStringArray(foldersJson, "folders")
    {
        ; 이 폴더의 order.json 자체는 항상 허용(폴더 안에 실제로 있는지는 FileExist가 걸러줌)
        AllowedPaths["/" . folderName . "/order.json"] := true

        orderJsonFile := RootDir . "\" . folderName . "\order.json"
        if FileExist(orderJsonFile)
        {
            FileRead, orderJson, *P65001 %orderJsonFile%
            for jdx, imgFile in JsonImageFiles(orderJson)
                AllowedPaths["/" . folderName . "/" . imgFile] := true
        }
    }
}

; 트레이 아이콘: favicon.ico로 고정(하드코딩) - folders.json의 favicon 필드는 더 이상
; 읽지 않고, 스크립트 옆에 favicon.ico가 있으면 그대로 사용.
FaviconPath := RootDir . "\favicon.ico"
if FileExist(FaviconPath)
    Menu, Tray, Icon, %FaviconPath%

Gui, +Resize +LastFound +OwnDialogs
if (Fullscreen)
{
    ; A_ScreenWidth/Height는 모니터 물리 해상도 전체(작업표시줄 영역까지 포함)라서
    ; 그대로 쓰면 창 아래쪽이 작업표시줄 뒤로 들어가 버림 - 작업표시줄을 뺀
    ; "작업 영역(work area)"을 대신 사용.
    SysGet, WorkArea, MonitorWorkArea
    winX := WorkAreaLeft
    winY := WorkAreaTop
    winW := WorkAreaRight - WorkAreaLeft
    winH := WorkAreaBottom - WorkAreaTop
    Gui, Show, % "x" . winX . " y" . winY . " w" . winW . " h" . winH, %PageTitle%
}
else
{
    winX := ""
    winY := ""
    winW := 1000
    winH := 700
    Gui, Show, % "w" . winW . " h" . winH, %PageTitle%
}
MainHwnd := WinExist()

; Windows 10/11은 크기조절 히트테스트/그림자용 투명 여백을 창 사각형 자체에 포함시켜서,
; WinMove/Gui Show로 x0 y0에 맞춰도 "보이는" 테두리는 몇 픽셀 안쪽에서 시작함(왼쪽 틈이
; 뜨는 원인). 풀스크린일 때만 DWM의 실제 보이는 프레임 크기를 조회해서 그 여백만큼
; 반대로 보정.
if (Fullscreen)
    FitWindowToRect(MainHwnd, winX, winY, winW, winH)
Log("0/4 MainHwnd=" . MainHwnd)

; IUnknown 공통 콜백은 한 번만 등록
g_cbQI  := RegisterCallback("WV2_QI", "F", 3)
g_cbAR  := RegisterCallback("WV2_AddRef", "F", 1)
g_cbRel := RegisterCallback("WV2_Release", "F", 1)
cbEnvInv := RegisterCallback("WV2_EnvCompleted", "", 3)
Log("0/4 RegisterCallback QI=" . g_cbQI . " AddRef=" . g_cbAR . " Release=" . g_cbRel . " EnvCompleted=" . cbEnvInv)

; --- 환경 생성 완료 핸들러 (전역, 영구) ---
VarSetCapacity(EnvHandlerVtbl, 4 * A_PtrSize, 0)
NumPut(g_cbQI,    EnvHandlerVtbl, 0 * A_PtrSize, "Ptr")
NumPut(g_cbAR,    EnvHandlerVtbl, 1 * A_PtrSize, "Ptr")
NumPut(g_cbRel,   EnvHandlerVtbl, 2 * A_PtrSize, "Ptr")
NumPut(cbEnvInv,  EnvHandlerVtbl, 3 * A_PtrSize, "Ptr")
VarSetCapacity(EnvHandlerObj, A_PtrSize, 0)
NumPut(&EnvHandlerVtbl, EnvHandlerObj, 0, "Ptr")
Log("0/4 EnvHandlerObj=" . (&EnvHandlerObj) . " vtbl=" . (&EnvHandlerVtbl))

hr := DllCall(WV2Loader . "\CreateCoreWebView2EnvironmentWithOptions"
    , "Ptr", 0                  ; browserExecutableFolder = NULL
    , "WStr", WV2UserDataDir    ; userDataFolder
    , "Ptr", 0                  ; environmentOptions = NULL
    , "Ptr", &EnvHandlerObj
    , "UInt")

Log("1/4 CreateCoreWebView2EnvironmentWithOptions hr=" . hr . " (MainHwnd=" . MainHwnd . ")")

if (hr != 0)
{
    MsgBox, 48, 오류, % "CreateCoreWebView2EnvironmentWithOptions 실패 (HRESULT: " . hr . ")`nWebView2 런타임 설치 여부를 확인하세요."
    Run, %ServerUrl%
}
return

; ===================== 소켓 이벤트 처리 =====================
SocketEvent(wParam, lParam) {
    global ListenSock, WM_SOCKET
    Event := lParam & 0xFFFF

    if (wParam = ListenSock && Event = 0x08)  ; FD_ACCEPT
    {
        Client := DllCall("Ws2_32\accept", "Ptr", ListenSock, "Ptr", 0, "Ptr", 0, "Ptr")
        if (Client != -1)
            DllCall("Ws2_32\WSAAsyncSelect", "Ptr", Client, "Ptr", A_ScriptHwnd, "UInt", WM_SOCKET, "Int", 0x21) ; FD_READ|FD_CLOSE
        return
    }

    if (Event = 0x01)  ; FD_READ
    {
        HandleRequest(wParam)
        DllCall("Ws2_32\closesocket", "Ptr", wParam)
        return
    }

    if (Event = 0x20)  ; FD_CLOSE
    {
        DllCall("Ws2_32\closesocket", "Ptr", wParam)
        return
    }
}

; ===================== 요청 처리 =====================
HandleRequest(Client) {
    global RootDir, MimeMap, AllowedPaths

    VarSetCapacity(buf, 8192, 0)
    received := DllCall("Ws2_32\recv", "Ptr", Client, "Ptr", &buf, "Int", 8192, "Int", 0)
    if (received <= 0)
        return

    request := StrGet(&buf, received, "UTF-8")
    if !RegExMatch(request, "im)^GET\s+(\S+)\s+HTTP", m)
        return

    reqPath := StrSplit(m1, "?")[1]
    reqPath := UrlDecode(reqPath)

    if InStr(reqPath, "..")
    {
        SendText(Client, 403, "text/plain; charset=utf-8", "403 Forbidden")
        return
    }

    ; folders.json에 나열된 폴더 + 그 폴더의 order.json에 적힌 파일, 그리고 루트의
    ; index.html/folders.json/favicon.ico 딱 이것들만 허용. 화이트리스트에 없으면
    ; 실제로 파일이 있어도 서빙하지 않음(하위 폴더/그 외 파일 접근 차단).
    if !AllowedPaths.HasKey(reqPath)
    {
        SendText(Client, 403, "text/plain; charset=utf-8", "403 Forbidden: " . reqPath)
        return
    }

    localPath := RootDir . StrReplace(reqPath, "/", "\")

    if (SubStr(localPath, 0) = "\")
        localPath .= "index.html"
    else if InStr(FileExist(localPath), "D")
        localPath .= "\index.html"

    if !FileExist(localPath)
    {
        SendText(Client, 404, "text/plain; charset=utf-8", "404 Not Found: " . reqPath)
        return
    }

    SplitPath, localPath, , , ext
    StringLower, ext, ext
    contentType := MimeMap.HasKey(ext) ? MimeMap[ext] : "application/octet-stream"

    FileGetSize, sz, %localPath%
    FileRead, body, *c %localPath%
    SendHttp(Client, 200, contentType, &body, sz)
}

; ===================== 응답 전송 =====================
SendHttp(Client, status, contentType, bodyPtr, bodyLen) {
    statusText := (status = 200) ? "OK" : (status = 403) ? "Forbidden" : "Not Found"
    header := "HTTP/1.1 " . status . " " . statusText . "`r`n"
             . "Content-Type: " . contentType . "`r`n"
             . "Content-Length: " . bodyLen . "`r`n"
             . "Connection: close`r`n"
             . "`r`n"

    headerLen := StrPut(header, "UTF-8") - 1
    total := headerLen + bodyLen
    VarSetCapacity(respBuf, total, 0)
    StrPut(header, &respBuf, "UTF-8")
    if (bodyLen > 0)
        DllCall("RtlMoveMemory", "Ptr", &respBuf + headerLen, "Ptr", bodyPtr, "Ptr", bodyLen)

    sentTotal := 0
    while (sentTotal < total)
    {
        sent := DllCall("Ws2_32\send", "Ptr", Client, "Ptr", &respBuf + sentTotal, "Int", total - sentTotal, "Int", 0)
        if (sent <= 0)
            break
        sentTotal += sent
    }
}

SendText(Client, status, contentType, text) {
    VarSetCapacity(buf, StrPut(text, "UTF-8"), 0)
    len := StrPut(text, &buf, "UTF-8") - 1
    SendHttp(Client, status, contentType, &buf, len)
}

; ===================== 유틸 =====================
; 완전한 JSON 파서는 아니고, 우리 생성기(index.html)가 실제로 내놓는 단순한 구조
; (최상위 "key": "값" 문자열 필드, 문자열만 든 배열, {file,caption} 객체 배열)만
; 정규식으로 뽑아내는 가벼운 도구들.

JsonUnescape(val) {
    val := StrReplace(val, "\" . Chr(34), Chr(34))
    val := StrReplace(val, "\/", "/")
    val := StrReplace(val, "\n", "`n")
    val := StrReplace(val, "\t", "`t")
    val := StrReplace(val, "\\", "\")
    return val
}

; "key": "값" 형태의 최상위 문자열 필드 하나를 꺼냄.
JsonStr(json, key) {
    q := Chr(34)  ; "
    if !RegExMatch(json, q . key . q . "\s*:\s*" . q . "((?:\\.|[^" . q . "\\])*)" . q, m)
        return ""
    return JsonUnescape(m1)
}

; "key": [ ... ] 배열의 몸통(대괄호 안쪽)을 대괄호 짝을 실제로 맞춰가며 정확히 잘라냄.
; 문자열 값 안에 "]"가 들어있으면(예: 캡션에 [링크](텍스트) 같은 마크다운 문자열) 얕은
; 정규식 "\[(.*?)\]"은 그 안의 "]"에서 멈춰버려 배열 뒷부분(뒤 항목들)을 통째로 잘라먹는다.
; 그래서 문자열 안쪽은 무시(이스케이프 포함)하고 대괄호 깊이만 세서 진짜 닫는 대괄호를 찾는다.
JsonArrayBody(json, key) {
    q := Chr(34)
    startPos := RegExMatch(json, q . key . q . "\s*:\s*\[", m)
    if !startPos
        return ""
    openPos := startPos + StrLen(m) - 1  ; m의 마지막 글자가 '[' 이므로 그 위치

    depth := 0
    inStr := false
    strLen := StrLen(json)
    i := openPos
    Loop
    {
        if (i > strLen)
            break
        ch := SubStr(json, i, 1)
        if (inStr)
        {
            if (ch = "\")
                i += 1  ; 이스케이프된 다음 글자는 통째로 건너뜀
            else if (ch = q)
                inStr := false
        }
        else
        {
            if (ch = q)
                inStr := true
            else if (ch = "[")
                depth += 1
            else if (ch = "]")
            {
                depth -= 1
                if (depth = 0)
                    return SubStr(json, openPos + 1, i - openPos - 1)
            }
        }
        i += 1
    }
    return ""
}

; "key": [ "a", "b", ... ] 형태의 문자열 배열을 순서대로 꺼냄.
; (folders.json의 "folders"가 이 형태 - 생성기가 항상 평범한 문자열 배열로만 저장함)
JsonStringArray(json, key) {
    arr := []
    q := Chr(34)
    body := JsonArrayBody(json, key)
    if (body = "")
        return arr
    pos := 1
    Loop
    {
        foundPos := RegExMatch(body, q . "((?:\\.|[^" . q . "\\])*)" . q, mm, pos)
        if !foundPos
            break
        arr.Push(JsonUnescape(mm1))
        pos := foundPos + StrLen(mm)
    }
    return arr
}

; order.json의 "images": [ {"file":"...", "caption":"..."}, ... ] 배열에서
; 각 항목의 file 값만 순서대로 꺼냄. (혹시 과거 형식처럼 "images"가 그냥
; 문자열 배열("a.png","b.png")이면 그것도 폴백으로 처리)
JsonImageFiles(json) {
    files := []
    q := Chr(34)
    body := JsonArrayBody(json, "images")
    if (body = "")
        return files

    pos := 1
    Loop
    {
        foundPos := RegExMatch(body, q . "file" . q . "\s*:\s*" . q . "((?:\\.|[^" . q . "\\])*)" . q, mm, pos)
        if !foundPos
            break
        files.Push(JsonUnescape(mm1))
        pos := foundPos + StrLen(mm)
    }

    if !files.MaxIndex()  ; "file" 키가 하나도 없었으면(평문자열 배열) 최상위 문자열들을 대신 뽑음
    {
        pos := 1
        Loop
        {
            foundPos := RegExMatch(body, q . "((?:\\.|[^" . q . "\\])*)" . q, mm, pos)
            if !foundPos
                break
            files.Push(JsonUnescape(mm1))
            pos := foundPos + StrLen(mm)
        }
    }
    return files
}

UrlDecode(str) {
    str := StrReplace(str, "+", " ")
    VarSetCapacity(buf, StrLen(str) * 4, 0)
    outLen := 0
    pos := 1
    strLen := StrLen(str)
    while (pos <= strLen)
    {
        ch := SubStr(str, pos, 1)
        if (ch = "%" && pos + 2 <= strLen)
        {
            NumPut("0x" . SubStr(str, pos + 1, 2), buf, outLen, "UChar")
            outLen++
            pos += 3
        }
        else
        {
            VarSetCapacity(tmp, 8, 0)
            n := StrPut(ch, &tmp, "UTF-8") - 1
            Loop, %n%
                NumPut(NumGet(tmp, A_Index - 1, "UChar"), buf, outLen + A_Index - 1, "UChar")
            outLen += n
            pos++
        }
    }
    return StrGet(&buf, outLen, "UTF-8")
}

Log(msg) {
    global LogFile, EnableLog
    if !EnableLog
        return  ; 꺼져 있으면 파일 기록은 물론 문자열 조립 결과도 어디에도 남기지 않고 바로 리턴
    FileAppend, % A_Hour . ":" . A_Min . ":" . A_Sec . "." . A_MSec . "  " . msg . "`n", %LogFile%, UTF-8
}

; COM IUnknown::AddRef / Release 헬퍼
ComAddRef(p) {
    if !p
        return
    vt := NumGet(p + 0, "Ptr")
    fn := NumGet(vt + 0, 1 * A_PtrSize, "Ptr")  ; AddRef = index 1
    return DllCall(fn, "Ptr", p, "UInt")
}
ComRelease(p) {
    if !p
        return
    vt := NumGet(p + 0, "Ptr")
    fn := NumGet(vt + 0, 2 * A_PtrSize, "Ptr")  ; Release = index 2
    return DllCall(fn, "Ptr", p, "UInt")
}

Cleanup() {
    global ListenSock, Controller, CoreWebView, Environment
    if (Controller) {
        ; Close the controller so the browser process can exit cleanly
        vt := NumGet(Controller + 0, "Ptr")
        fnClose := NumGet(vt + 0, 24 * A_PtrSize, "Ptr")  ; Close = index 24
        DllCall(fnClose, "Ptr", Controller, "UInt")
        ComRelease(Controller)
        Controller := 0
    }
    if (CoreWebView) {
        ComRelease(CoreWebView)
        CoreWebView := 0
    }
    if (Environment) {
        ComRelease(Environment)
        Environment := 0
    }
    DllCall("Ws2_32\closesocket", "Ptr", ListenSock)
    DllCall("Ws2_32\WSACleanup")
    DllCall("ole32\CoUninitialize")
}

; ============================================================
; WebView2 콜백
; ============================================================

; --- 환경 생성 완료: HRESULT Invoke(this, HRESULT hr, ICoreWebView2Environment* env) ---
WV2_EnvCompleted(this, hResult, pEnvironment) {
    global MainHwnd, Environment, CtrlHandlerVtbl, CtrlHandlerObj, g_cbQI, g_cbAR, g_cbRel

    Log("2/4 WV2_EnvCompleted 진입 hResult=" . hResult . " pEnvironment=" . pEnvironment)

    if (hResult != 0 || !pEnvironment) {
        MsgBox, 48, 오류, % "WebView2 환경 생성 실패 (HRESULT: " . hResult . ")"
        return 0
    }

    ; 환경 객체도 우리가 들고 있어야 수명이 보장됨
    Environment := pEnvironment
    ComAddRef(Environment)
    Log("2/4 Environment AddRef 완료 ref~=" . ErrorLevel)

    ; 컨트롤러 생성 완료 핸들러 (전역)
    VarSetCapacity(CtrlHandlerVtbl, 4 * A_PtrSize, 0)
    NumPut(g_cbQI,  CtrlHandlerVtbl, 0 * A_PtrSize, "Ptr")
    NumPut(g_cbAR,  CtrlHandlerVtbl, 1 * A_PtrSize, "Ptr")
    NumPut(g_cbRel, CtrlHandlerVtbl, 2 * A_PtrSize, "Ptr")
    NumPut(RegisterCallback("WV2_CtrlCompleted", "", 3), CtrlHandlerVtbl, 3 * A_PtrSize, "Ptr")
    VarSetCapacity(CtrlHandlerObj, A_PtrSize, 0)
    NumPut(&CtrlHandlerVtbl, CtrlHandlerObj, 0, "Ptr")

    ; ICoreWebView2Environment::CreateCoreWebView2Controller - vtable index 3
    vt := NumGet(pEnvironment + 0, "Ptr")
    fn := NumGet(vt + 0, 3 * A_PtrSize, "Ptr")
    hr2 := DllCall(fn, "Ptr", pEnvironment, "Ptr", MainHwnd, "Ptr", &CtrlHandlerObj, "UInt")
    Log("2/4 CreateCoreWebView2Controller 요청 hr=" . hr2)
    return 0
}

; --- 컨트롤러 생성 완료: HRESULT Invoke(this, HRESULT hr, ICoreWebView2Controller* controller) ---
WV2_CtrlCompleted(this, hResult, pController) {
    global Controller, CoreWebView, MainHwnd, ServerUrl
    global NavHandlerVtbl, NavHandlerObj, g_cbQI, g_cbAR, g_cbRel

    Log("3/4 WV2_CtrlCompleted 진입 hResult=" . hResult . " pController=" . pController)

    if (hResult != 0 || !pController) {
        MsgBox, 48, 오류, % "WebView2 컨트롤러 생성 실패 (HRESULT: " . hResult . ")"
        return 0
    }

    ; ★ 핵심: 컨트롤러를 우리가 소유해야 함. AddRef 없으면 이 함수 리턴 직후 해제되어 빈 화면이 됨.
    Controller := pController
    refCnt := ComAddRef(Controller)
    Log("3/4 Controller AddRef 후 refCnt=" . refCnt)

    vt := NumGet(Controller + 0, "Ptr")

    ; 먼저 바운드 설정 (클라이언트 영역 전체)
    GetClientSize(MainHwnd, w, h)
    UpdateWebViewBounds(w, h)
    Log("3/4 put_Bounds " . w . "x" . h)

    ; 그 다음 보이기
    fnVis := NumGet(vt + 0, 4 * A_PtrSize, "Ptr")  ; put_IsVisible = index 4
    hrVis := DllCall(fnVis, "Ptr", Controller, "Int", 1, "UInt")
    Log("3/4 put_IsVisible(1) hr=" . hrVis)

    ; ICoreWebView2Controller::get_CoreWebView2 - vtable index 25
    ; 이 호출은 이미 AddRef된 포인터를 돌려줌
    fn := NumGet(vt + 0, 25 * A_PtrSize, "Ptr")
    hr3 := DllCall(fn, "Ptr", Controller, "Ptr*", CoreWebView, "UInt")
    Log("3/4 get_CoreWebView2 hr=" . hr3 . " CoreWebView=" . CoreWebView)

    if (hr3 != 0 || !CoreWebView) {
        MsgBox, 48, 오류, % "get_CoreWebView2 실패 (HRESULT: " . hr3 . ")"
        return 0
    }
    ; 추가로 한 번 더 들고 있어도 무방 (안전)
    ComAddRef(CoreWebView)

    vtWv := NumGet(CoreWebView + 0, "Ptr")

    ; NavigationCompleted 핸들러 등록
    VarSetCapacity(NavHandlerVtbl, 4 * A_PtrSize, 0)
    NumPut(g_cbQI,  NavHandlerVtbl, 0 * A_PtrSize, "Ptr")
    NumPut(g_cbAR,  NavHandlerVtbl, 1 * A_PtrSize, "Ptr")
    NumPut(g_cbRel, NavHandlerVtbl, 2 * A_PtrSize, "Ptr")
    NumPut(RegisterCallback("WV2_NavCompleted", "", 3), NavHandlerVtbl, 3 * A_PtrSize, "Ptr")
    VarSetCapacity(NavHandlerObj, A_PtrSize, 0)
    NumPut(&NavHandlerVtbl, NavHandlerObj, 0, "Ptr")

    ; ICoreWebView2::add_NavigationCompleted - vtable index 15
    fnAddNav := NumGet(vtWv + 0, 15 * A_PtrSize, "Ptr")
    VarSetCapacity(token, 8, 0)
    hrAdd := DllCall(fnAddNav, "Ptr", CoreWebView, "Ptr", &NavHandlerObj, "Ptr", &token, "UInt")
    Log("3/4 add_NavigationCompleted hr=" . hrAdd)

    ; Settings: 기본 스크롤/줌/컨텍스트메뉴 등 명시적으로 켜기
    ; ICoreWebView2::get_Settings - vtable index 3
    pSettings := 0
    fnGetSet := NumGet(vtWv + 0, 3 * A_PtrSize, "Ptr")
    hrSet := DllCall(fnGetSet, "Ptr", CoreWebView, "Ptr*", pSettings, "UInt")
    if (pSettings) {
        vtS := NumGet(pSettings + 0, "Ptr")
        ; put_IsZoomControlEnabled (index 11), put_AreDefaultContextMenusEnabled (index 12)
        ; put_IsStatusBarEnabled (index 9), put_AreDevToolsEnabled (index 10)
        ; 인덱스: get/put pairs after IUnknown
        ; 3 get_IsScriptEnabled, 4 put, 5 get_IsWebMessageEnabled, 6 put,
        ; 7 get_AreDefaultScriptDialogsEnabled, 8 put,
        ; 9 get_IsStatusBarEnabled, 10 put,
        ; 11 get_AreDevToolsEnabled, 12 put,
        ; 13 get_AreDefaultContextMenusEnabled, 14 put,
        ; 15 get_AreHostObjectsAllowed, 16 put,
        ; 17 get_IsZoomControlEnabled, 18 put,
        ; 19 get_IsBuiltInErrorPageEnabled, 20 put
        DllCall(NumGet(vtS + 0, 10 * A_PtrSize, "Ptr"), "Ptr", pSettings, "Int", 1, "UInt") ; StatusBar
        DllCall(NumGet(vtS + 0, 12 * A_PtrSize, "Ptr"), "Ptr", pSettings, "Int", 1, "UInt") ; DevTools
        DllCall(NumGet(vtS + 0, 14 * A_PtrSize, "Ptr"), "Ptr", pSettings, "Int", 1, "UInt") ; ContextMenus
        DllCall(NumGet(vtS + 0, 18 * A_PtrSize, "Ptr"), "Ptr", pSettings, "Int", 1, "UInt") ; ZoomControl
        ComRelease(pSettings)
        Log("3/4 Settings 적용 hrGet=" . hrSet)
    }

    ; Navigate
    fnNav := NumGet(vtWv + 0, 5 * A_PtrSize, "Ptr")  ; Navigate = index 5
    hr4 := DllCall(fnNav, "Ptr", CoreWebView, "WStr", ServerUrl, "UInt")
    Log("4/4 Navigate(" . ServerUrl . ") hr=" . hr4)

    ; 네비 직후에도 바운드/가시성 한 번 더 (타이밍 이슈 방지)
    UpdateWebViewBounds(w, h)
    DllCall(fnVis, "Ptr", Controller, "Int", 1, "UInt")

    ; 3초 후에도 NavigationCompleted가 안 오면 상태 덤프
    SetTimer, WV2_Watchdog, -3000
    return 0
}

WV2_Watchdog:
    global Controller, CoreWebView, ServerUrl
    Log("WATCHDOG: 3초 경과. Controller=" . Controller . " CoreWebView=" . CoreWebView)
    if (Controller) {
        GetClientSize(MainHwnd, w, h)
        UpdateWebViewBounds(w, h)
        vt := NumGet(Controller + 0, "Ptr")
        fnVis := NumGet(vt + 0, 4 * A_PtrSize, "Ptr")
        DllCall(fnVis, "Ptr", Controller, "Int", 1, "UInt")
        Log("WATCHDOG: bounds/visibility 재적용 " . w . "x" . h)
    }
    if (CoreWebView) {
        ; 현재 Source 읽어보기
        vtWv := NumGet(CoreWebView + 0, "Ptr")
        fnSrc := NumGet(vtWv + 0, 4 * A_PtrSize, "Ptr")  ; get_Source = index 4
        pSrc := 0
        hrSrc := DllCall(fnSrc, "Ptr", CoreWebView, "Ptr*", pSrc, "UInt")
        if (pSrc) {
            src := StrGet(pSrc, "UTF-16")
            DllCall("ole32\CoTaskMemFree", "Ptr", pSrc)
            Log("WATCHDOG: get_Source hr=" . hrSrc . " uri=[" . src . "]")
        } else {
            Log("WATCHDOG: get_Source hr=" . hrSrc . " (null)")
        }
        ; 재시도 Navigate
        fnNav := NumGet(vtWv + 0, 5 * A_PtrSize, "Ptr")
        hrRetry := DllCall(fnNav, "Ptr", CoreWebView, "WStr", ServerUrl, "UInt")
        Log("WATCHDOG: Navigate 재시도 hr=" . hrRetry)
    }
return

; --- NavigationCompleted: HRESULT Invoke(this, ICoreWebView2* sender, ICoreWebView2NavigationCompletedEventArgs* args) ---
WV2_NavCompleted(this, sender, args) {
    if !args {
        Log("NavigationCompleted args=null")
        return 0
    }
    vt := NumGet(args + 0, "Ptr")

    ; get_IsSuccess - index 3
    fnSuccess := NumGet(vt + 0, 3 * A_PtrSize, "Ptr")
    isSuccess := 0
    DllCall(fnSuccess, "Ptr", args, "Int*", isSuccess, "UInt")

    ; get_WebErrorStatus - index 4
    fnErr := NumGet(vt + 0, 4 * A_PtrSize, "Ptr")
    errStatus := 0
    DllCall(fnErr, "Ptr", args, "Int*", errStatus, "UInt")

    Log("NavigationCompleted IsSuccess=" . isSuccess . " WebErrorStatus=" . errStatus . " (0=성공)")
    TrayTip, WebView2 로드 완료, % "IsSuccess=" . isSuccess . " WebErrorStatus=" . errStatus, 5

    ; 성공 시 바운드 한 번 더 맞춰주기
    if (isSuccess) {
        GetClientSize(MainHwnd, w, h)
        UpdateWebViewBounds(w, h)
    }
    return 0
}

GetClientSize(hwnd, ByRef w, ByRef h) {
    VarSetCapacity(rc, 16, 0)
    DllCall("GetClientRect", "Ptr", hwnd, "Ptr", &rc)
    w := NumGet(rc, 8, "Int")
    h := NumGet(rc, 12, "Int")
    if (w < 1)
        w := 1
    if (h < 1)
        h := 1
}

; "보이는" 창 테두리가 정확히 targetX,targetY ~ targetW,targetH에 맞도록 보정.
; GetWindowRect가 돌려주는 사각형은 DWM의 투명 여백(크기조절 히트테스트/그림자용,
; 보통 좌/우/아래에만 몇 픽셀 존재하고 위는 0)까지 포함하고 있어서, 그 값 그대로
; WinMove하면 실제 보이는 프레임은 여백만큼 안쪽으로 들어가 버림.
; DwmGetWindowAttribute(DWMWA_EXTENDED_FRAME_BOUNDS)로 "진짜 보이는" 프레임을 조회해서
; GetWindowRect와의 차이(=여백)를 구하고, 그만큼 반대 방향으로 더 크게/치우쳐서
; 다시 WinMove하면 보이는 프레임이 목표 사각형에 정확히 맞음.
FitWindowToRect(hwnd, targetX, targetY, targetW, targetH) {
    WinMove, ahk_id %hwnd%, , %targetX%, %targetY%, %targetW%, %targetH%

    VarSetCapacity(winRect, 16, 0)
    DllCall("GetWindowRect", "Ptr", hwnd, "Ptr", &winRect)

    VarSetCapacity(visRect, 16, 0)
    hr := DllCall("dwmapi\DwmGetWindowAttribute", "Ptr", hwnd, "UInt", 9, "Ptr", &visRect, "UInt", 16)  ; DWMWA_EXTENDED_FRAME_BOUNDS = 9
    if (hr != 0)
        return  ; DWM 조회 실패 - 1차 WinMove 결과 그대로 둠 (구버전 Windows 등)

    wLeft   := NumGet(winRect, 0, "Int"),  wTop    := NumGet(winRect, 4, "Int")
    wRight  := NumGet(winRect, 8, "Int"),  wBottom := NumGet(winRect, 12, "Int")
    vLeft   := NumGet(visRect, 0, "Int"),  vTop    := NumGet(visRect, 4, "Int")
    vRight  := NumGet(visRect, 8, "Int"),  vBottom := NumGet(visRect, 12, "Int")

    padLeft   := vLeft - wLeft      ; 보통 양수 (몇 픽셀) - 왼쪽 틈이 뜨던 원인
    padTop    := vTop - wTop        ; 보통 0
    padRight  := wRight - vRight
    padBottom := wBottom - vBottom

    newX := targetX - padLeft
    newY := targetY - padTop
    newW := targetW + padLeft + padRight
    newH := targetH + padTop + padBottom

    WinMove, ahk_id %hwnd%, , %newX%, %newY%, %newW%, %newH%
}

; ICoreWebView2Controller::put_Bounds - vtable index 6
; RECT는 x64에서 포인터로 전달됨
UpdateWebViewBounds(w := 0, h := 0) {
    global Controller, MainHwnd
    if !Controller
        return
    if (w < 1 || h < 1)
        GetClientSize(MainHwnd, w, h)
    VarSetCapacity(rect, 16, 0)
    NumPut(0, rect, 0, "Int")   ; left
    NumPut(0, rect, 4, "Int")   ; top
    NumPut(w, rect, 8, "Int")   ; right
    NumPut(h, rect, 12, "Int")  ; bottom
    vt := NumGet(Controller + 0, "Ptr")
    fn := NumGet(vt + 0, 6 * A_PtrSize, "Ptr")
    hr := DllCall(fn, "Ptr", Controller, "Ptr", &rect, "UInt")
    ; 리사이즈/이동 후 부모 위치 변경 알림 (스크롤·팝업·접근성 관련)
    fnN := NumGet(vt + 0, 23 * A_PtrSize, "Ptr")
    DllCall(fnN, "Ptr", Controller, "UInt")
    return hr
}

; --- 최소 IUnknown 스텁 ---
; 완료 핸들러는 1회성이라 정교한 참조 카운팅 불필요.
; QI는 어떤 IID든 this를 돌려줌 (핸들러용으로 충분, 실사용에서 문제 적음).
WV2_QI(this, riid, ppv) {
    if (!ppv)
        return 0x80004003  ; E_POINTER
    NumPut(this, ppv + 0, 0, "Ptr")
    return 0  ; S_OK
}
WV2_AddRef(this) {
    return 1
}
WV2_Release(this) {
    return 1
}

; ===================== 창 이벤트 =====================
; GuiSize: 드래그 리사이즈 중에도 계속 호출됨 → 실시간으로 WebView 맞춤
GuiSize:
    if (A_EventInfo = 1)  ; minimized
        return
    ; A_GuiWidth/Height 는 클라이언트 영역. 더 정확하게 GetClientRect 사용
    UpdateWebViewBounds()
return

; WM_EXITSIZEMOVE (0x0232) 핸들러 본체. 등록(OnMessage)은 auto-execute 섹션 쪽으로 옮김 -
; 여기 있던 이전 위치는 위쪽 GuiSize: 라벨의 return 뒤라 실행 흐름이 지나가지 않는 자리라서
; 실제로는 한 번도 등록되지 않고 있었음 (죽은 코드).
OnExitSizeMove(wParam, lParam, msg, hwnd) {
    global MainHwnd
    if (hwnd = MainHwnd)
        UpdateWebViewBounds()
}

GuiClose:
GuiEscape:
    ExitApp
return