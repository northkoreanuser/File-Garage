; ============================================================
; AutoHotkey v1 - WebView2(Edge/Chromium) 임베디드 브라우저
; 이 스크립트를 켜면 고정된 주소(TargetUrl)를 창 안에
; WebView2로 바로 렌더링해서 보여준다. 로컬 서버 없음.
;
; * 필수 준비 *
;   1) WebView2 Runtime - 최신 Windows 10/11엔 대부분 이미 설치돼 있음.
;      없으면: https://developer.microsoft.com/microsoft-edge/webview2/
;   2) WebView2Loader.dll - 이 스크립트와 같은 폴더에 있어야 함.
;      NuGet 패키지 Microsoft.Web.WebView2 안의
;      runtimes\win-x64\native\WebView2Loader.dll (64비트 AutoHotkeyU64용)
;      runtimes\win-x86\native\WebView2Loader.dll (32비트 AutoHotkey용)
;      둘 중 실행 중인 AHK.exe 비트수에 맞는 걸 가져다 둘 것 - 이 파일이 없으면 DllCall이 실패함.
;
; * 참고 사항 (앞 버전에서 유지) *
;   - Controller / CoreWebView 는 AddRef 필수 (안 하면 콜백 스코프 벗어난 COM 객체가 사라짐)
;   - 핸들러 객체(Env/Ctrl/Nav) 전역 변수 유지 + 참조 유지
;   - put_Bounds / put_IsVisible 진입 유지 + 리사이즈 시 재적용
;   - NavigationCompleted 미발화 대비 워치독 로그 유지
; ============================================================
#NoEnv
#Persistent
#NoTrayIcon
#SingleInstance Force
SplitPath A_ScriptName,,,,A_FileName
IfEqual A_IsCompiled,,Run % "..\Compiler\Ahk2Exe.exe /in """A_ScriptFullPath """ /out ""..\"A_FileName ".exe""" (FileExist(A_FileName ".ico")?" /icon """A_FileName ".ico""":""),,UseErrorLevel
IfEqual A_IsCompiled,,ExitApp
SetWorkingDir, %A_ScriptDir%
SetBatchLines, -1

; 로그 기록 여부 - 1: webview2_debug.log 파일에 기록 (기본값, 켜짐)
;              0: 로그 파일 기록을 완전히 비활성화 - 성능/디버깅용
;                 Log() 호출 자체는 남아 있되 메시지 문자열 조립 없이 바로 리턴함.
; 배포할 땐 이 값을 0으로 바꿀 것.
global EnableLog := 0

; 풀스크린 여부 - 1: 모니터 작업영역 화면 크기(A_ScreenWidth x A_ScreenHeight)를 계산해서
;                  그 크기로 창을 띄움(테두리/제목표시줄 없이, 크기만 화면 전체)
;              0: 기본 1000x700 창 (기본값)
global Fullscreen := 1

; ===================== 설정 =====================
global TargetUrl := "https://gtaweb.eu/gtao-map"
FileInstall WebView2Loader.dll,% A_Temp . "\WebView2Loader.dll"
global WV2Loader := A_Temp . "\WebView2Loader.dll"
global WV2UserDataDir := A_Temp . "\WebView2UserData"
global LogFile := A_ScriptDir . "\webview2_debug.log"
global Controller := 0
global CoreWebView := 0
global Environment := 0
global MainHwnd

; 핸들러 객체/vtable 은 반드시 유지. 아니면 비동기 콜백 도중에 메모리가 사라짐.
global EnvHandlerVtbl, EnvHandlerObj
global CtrlHandlerVtbl, CtrlHandlerObj
global NavHandlerVtbl, NavHandlerObj
global g_cbQI, g_cbAR, g_cbRel

OnMessage(0x0232, "OnExitSizeMove")  ; WM_EXITSIZEMOVE - 리사이즈/이동 끝난 직후 바운즈 재확인
OnExit("Cleanup")

TrayTip, WebView2 브라우저 시작, %TargetUrl%, 5

; ===================== WebView2 초기화 =====================
if !FileExist(WV2Loader)
{
    MsgBox, 48, WebView2Loader.dll 없음, WebView2Loader.dll을 스크립트와 같은 폴더에 넣어주세요.`n(NuGet 패키지 Microsoft.Web.WebView2 안의 runtimes\win-x64\native\WebView2Loader.dll)`n`n일단 기본 브라우저로 엽니다.
    Run, %TargetUrl%
    return
}

if (EnableLog)
    FileDelete, %LogFile%

coHr := DllCall("ole32\CoInitializeEx", "Ptr", 0, "UInt", 0x2)  ; COINIT_APARTMENTTHREADED
Log("0/4 CoInitializeEx hr=" . coHr . " (0=S_OK, 1=S_FALSE 이미 초기화됨)")

FileCreateDir, %WV2UserDataDir%

Gui, +Resize +LastFound +OwnDialogs
if (Fullscreen)
{
    ; A_ScreenWidth/Height는 모니터 전체 해상도(작업표시줄 영역까지 포함)이라
    ; 그대로 쓰면 창 아래쪽이 작업표시줄에 가려 잘 보임 - 작업표시줄을 뺀
    ; "작업 영역(work area)"을 대신 사용.
    SysGet, WorkArea, MonitorWorkArea
    winX := WorkAreaLeft
    winY := WorkAreaTop
    winW := WorkAreaRight - WorkAreaLeft
    winH := WorkAreaBottom - WorkAreaTop
    Gui, Show, % "x" . winX . " y" . winY . " w" . winW . " h" . winH, GTAOMap
}
else
{
    winX := ""
    winY := ""
    winW := 1000
    winH := 700
    Gui, Show, % "w" . winW . " h" . winH, GTAOMap
}
MainHwnd := WinExist()

; Windows 10/11의 크리스털 하이라이트/그림자용 여백 때문에 창의 실제 사각형이
; WinMove/Gui Show에 x0 y0을 줘도 "보이는" 테두리와 몇 픽셀 오차가 생김(원인 아닌
; 결과 쪽). 풀스크린일 땐 DWM에 물어서 보이는 프레임의 크기를 역산해서 그 여백만큼
; 반대로 밀어줌.
if (Fullscreen)
    FitWindowToRect(MainHwnd, winX, winY, winW, winH)
Log("0/4 MainHwnd=" . MainHwnd)

; IUnknown 공용 콜백은 세 개만 등록
g_cbQI  := RegisterCallback("WV2_QI", "F", 3)
g_cbAR  := RegisterCallback("WV2_AddRef", "F", 1)
g_cbRel := RegisterCallback("WV2_Release", "F", 1)
cbEnvInv := RegisterCallback("WV2_EnvCompleted", "", 3)
Log("0/4 RegisterCallback QI=" . g_cbQI . " AddRef=" . g_cbAR . " Release=" . g_cbRel . " EnvCompleted=" . cbEnvInv)

; --- 환경 생성 완료 핸들러 (비동기, 최초 1회) ---
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
    MsgBox, 48, 실패, % "CreateCoreWebView2EnvironmentWithOptions 실패 (HRESULT: " . hr . ")`nWebView2 런타임 설치 여부를 확인하세요."
    Run, %TargetUrl%
}
return

; ===================== 유틸 =====================
Log(msg) {
    global LogFile, EnableLog
    if !EnableLog
        return  ; 로그 꺼놨을 땐 문자열 조립 없이 바로 리턴하게 해서 오버헤드 없앰
    FileAppend, % A_Hour . ":" . A_Min . ":" . A_Sec . "." . A_MSec . "  " . msg . "`n", %LogFile%, UTF-8
}

; COM IUnknown::AddRef / Release 래퍼
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
    global Controller, CoreWebView, Environment
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
        MsgBox, 48, 실패, % "WebView2 환경 생성 실패 (HRESULT: " . hResult . ")"
        return 0
    }

    ; 환경 객체도 우리가 계속 쥐고 있어야 안전함
    Environment := pEnvironment
    ComAddRef(Environment)
    Log("2/4 Environment AddRef 완료")

    ; 컨트롤러 생성 완료 핸들러 (비동기)
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
    global Controller, CoreWebView, MainHwnd, TargetUrl
    global NavHandlerVtbl, NavHandlerObj, g_cbQI, g_cbAR, g_cbRel

    Log("3/4 WV2_CtrlCompleted 진입 hResult=" . hResult . " pController=" . pController)

    if (hResult != 0 || !pController) {
        MsgBox, 48, 실패, % "WebView2 컨트롤러 생성 실패 (HRESULT: " . hResult . ")"
        return 0
    }

    ; 핵심: 컨트롤러는 우리가 유지해야 함. AddRef 안 하면 이 함수 끝난 순간 해제되어 빈 화면됨.
    Controller := pController
    refCnt := ComAddRef(Controller)
    Log("3/4 Controller AddRef 후 refCnt=" . refCnt)

    vt := NumGet(Controller + 0, "Ptr")

    ; 최초 바운즈 적용 (클라이언트 영역 전체)
    GetClientSize(MainHwnd, w, h)
    UpdateWebViewBounds(w, h)
    Log("3/4 put_Bounds " . w . "x" . h)

    ; 뷰 보이게 하기
    fnVis := NumGet(vt + 0, 4 * A_PtrSize, "Ptr")  ; put_IsVisible = index 4
    hrVis := DllCall(fnVis, "Ptr", Controller, "Int", 1, "UInt")
    Log("3/4 put_IsVisible(1) hr=" . hrVis)

    ; ICoreWebView2Controller::get_CoreWebView2 - vtable index 25
    ; 이 호출이 이미 AddRef된 포인터를 돌려줌
    fn := NumGet(vt + 0, 25 * A_PtrSize, "Ptr")
    hr3 := DllCall(fn, "Ptr", Controller, "Ptr*", CoreWebView, "UInt")
    Log("3/4 get_CoreWebView2 hr=" . hr3 . " CoreWebView=" . CoreWebView)

    if (hr3 != 0 || !CoreWebView) {
        MsgBox, 48, 실패, % "get_CoreWebView2 실패 (HRESULT: " . hr3 . ")"
        return 0
    }
    ; 추가로 한 번 더 잡아서 안전 (선택)
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

    ; Settings: 기본 오른쪽/줌/컨텍스트메뉴 등 정상적으로 켜기
    ; ICoreWebView2::get_Settings - vtable index 3
    pSettings := 0
    fnGetSet := NumGet(vtWv + 0, 3 * A_PtrSize, "Ptr")
    hrSet := DllCall(fnGetSet, "Ptr", CoreWebView, "Ptr*", pSettings, "UInt")
    if (pSettings) {
        vtS := NumGet(pSettings + 0, "Ptr")
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
    hr4 := DllCall(fnNav, "Ptr", CoreWebView, "WStr", TargetUrl, "UInt")
    Log("4/4 Navigate(" . TargetUrl . ") hr=" . hr4)

    ; 재적용 (타이밍 이슈 방지)
    UpdateWebViewBounds(w, h)
    DllCall(fnVis, "Ptr", Controller, "Int", 1, "UInt")

    ; 3초 후에도 NavigationCompleted가 안 왔으면 상태 점검
    SetTimer, WV2_Watchdog, -3000
    return 0
}

WV2_Watchdog:
    global Controller, CoreWebView, TargetUrl
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
        hrRetry := DllCall(fnNav, "Ptr", CoreWebView, "WStr", TargetUrl, "UInt")
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

    ; 성공 시 바운즈 한 번 더 맞춰주기
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

; "보이는" 창 테두리가 정확히 targetX,targetY ~ targetW,targetH가 되도록 보정.
; GetWindowRect가 돌려주는 사각형은 DWM의 보이지 않는 여백(크리스털 하이라이트/그림자용,
; 보통 좌/우/아래쪽엔 몇 픽셀 존재하고 위쪽은 0)까지 포함하고 있어서, 그 값 그대로
; WinMove하면 실제 보이는 프레임이 그 여백만큼 어긋나게 보임. DwmGetWindowAttribute
; (DWMWA_EXTENDED_FRAME_BOUNDS)로 "진짜 보이는" 프레임을 조회해서 GetWindowRect와의
; 차이(=여백)를 구하고, 그만큼 반대 방향으로 덧/뺀 크기·위치로 다시 WinMove하면
; 보이는 프레임이 목표 사각형과 정확히 일치.
FitWindowToRect(hwnd, targetX, targetY, targetW, targetH) {
    WinMove, ahk_id %hwnd%, , %targetX%, %targetY%, %targetW%, %targetH%

    VarSetCapacity(winRect, 16, 0)
    DllCall("GetWindowRect", "Ptr", hwnd, "Ptr", &winRect)

    VarSetCapacity(visRect, 16, 0)
    hr := DllCall("dwmapi\DwmGetWindowAttribute", "Ptr", hwnd, "UInt", 9, "Ptr", &visRect, "UInt", 16)  ; DWMWA_EXTENDED_FRAME_BOUNDS = 9
    if (hr != 0)
        return  ; DWM 조회 실패 - 1차 WinMove 결과 그대로 씀 (구버전 Windows 등)

    wLeft   := NumGet(winRect, 0, "Int"),  wTop    := NumGet(winRect, 4, "Int")
    wRight  := NumGet(winRect, 8, "Int"),  wBottom := NumGet(winRect, 12, "Int")
    vLeft   := NumGet(visRect, 0, "Int"),  vTop    := NumGet(visRect, 4, "Int")
    vRight  := NumGet(visRect, 8, "Int"),  vBottom := NumGet(visRect, 12, "Int")

    padLeft   := vLeft - wLeft      ; 왼쪽 여백 (몇 픽셀) - 원인 아닌 결과 값
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
    ; 리사이즈/이동 시 부모 위치 변경 알림 (스크롤/팝업앵커 유지용)
    fnN := NumGet(vt + 0, 23 * A_PtrSize, "Ptr")
    DllCall(fnN, "Ptr", Controller, "UInt")
    return hr
}

; --- 최소 IUnknown 구현 ---
; 완료 핸들러가 1회성이라 진짜 참조 카운트 불필요.
; QI는 어떤 IID든 this를 돌려줌 (핸들러 용도상 문제 없고, 실사용에선 권장 안 됨).
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
; GuiSize: 드래그 리사이즈 중에도 계속 호출돼서 실시간으로 WebView 따라옴
GuiSize:
    if (A_EventInfo = 1)  ; minimized
        return
    ; A_GuiWidth/Height 는 클라이언트 영역. 더 정확하게 GetClientRect 사용
    UpdateWebViewBounds()
return

; WM_EXITSIZEMOVE (0x0232) 핸들러 본체. 위(OnMessage)는 auto-execute 섹션 위쪽으로 옮김 -
; 라벨 아닌 함수 위치와 무관하게 GuiSize: 라벨 return 자리랑 실행 흐름이 겹치지 않는 자리에
; 실제로는 이 위에 등록만 하고 있음 (원본 유지).
OnExitSizeMove(wParam, lParam, msg, hwnd) {
    global MainHwnd
    if (hwnd = MainHwnd)
        UpdateWebViewBounds()
}

GuiClose:
GuiEscape:
    ExitApp
return
