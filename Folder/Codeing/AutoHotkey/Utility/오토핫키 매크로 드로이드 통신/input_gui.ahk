#NoEnv
#SingleInstance Force
#Persistent
SetWorkingDir %A_ScriptDir%
SetBatchLines, -1

; ================= 설정 =================
ListenPort := 9876     ; 로컬 수신 포트 (브라우저 쪽 TARGET_URL과 반드시 일치해야 함)
ListenSocket := -1
InputURL := ""          ; 받은 것을 재전송할 대상. 트레이 → URL 설정에서 입력, ini에 저장됨

; ini 파일 = 스크립트 이름(확장자만 .ini로 교체), 같은 폴더
SplitPath, A_ScriptName, , , , ScriptNameNoExt
IniFile := A_ScriptDir "\" ScriptNameNoExt ".ini"
IniRead, InputURL, %IniFile%, Settings, InputURL, http://192.168.0.11:8080/UrlPost   ; 없으면 빈 문자열 (ErrorLevel=1, 무시)
;IfEqual InputURL, ERROR, SetEnv, InputURL, http://192.168.0.11:8080/UrlPost

; 유저스크립트 원본 (localpost_sender.user.js, Base64) — 트레이 → 스크립트 보기에서 표시
ScriptB64 := "Ly8gPT1Vc2VyU2NyaXB0PT0KLy8gQG5hbWUgICAgICAgICBMb2NhbFBvc3QgU2VuZGVyCi8vIEBuYW1lc3BhY2UgICAgTG9jYWxQb3N0IFNlbmRlcgovLyBAdmVyc2lvbiAgICAgIDIuMAovLyBAbWF0Y2ggICAgICAgICo6Ly8qLyoKLy8gQGdyYW50ICAgICAgICBub25lCi8vID09L1VzZXJTY3JpcHQ9PQoKKCgpID0+IHsKICAgICd1c2Ugc3RyaWN0JzsKCiAgICBjb25zdCBUQVJHRVRfVVJMID0gJ2h0dHA6Ly8xMjcuMC4wLjE6OTg3Nic7ICAvLyBpbnB1dF9ndWkuYWhrIOyImOyLoCDshJzrsoQg7KO87IaMOu2PrO2KuCAo7Iqk7YK0IO2VhOyImCkKCiAgICAvLyDrhJjtjKjrk5wgLyDsmYAg64SY7Yyo65OcICog66W8IO2VqOq7mCDriITrpbTqs6Ag7J6I7Ja07JW8IOuwnOuPmSAo7Iic7IScIOyDgeq0gOyXhuydjCkKICAgIGxldCBkaXZpZGVQcmVzc2VkID0gZmFsc2U7CiAgICBsZXQgbXVsdGlwbHlQcmVzc2VkID0gZmFsc2U7CgogICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGUgPT4gewogICAgICAgIGlmIChlLmNvZGUgPT09ICdOdW1wYWREaXZpZGUnKQogICAgICAgICAgICBkaXZpZGVQcmVzc2VkID0gdHJ1ZTsKICAgICAgICBlbHNlIGlmIChlLmNvZGUgPT09ICdOdW1wYWRNdWx0aXBseScpCiAgICAgICAgICAgIG11bHRpcGx5UHJlc3NlZCA9IHRydWU7CiAgICAgICAgZWxzZQogICAgICAgICAgICByZXR1cm47CgogICAgICAgIGUucHJldmVudERlZmF1bHQoKTsKCiAgICAgICAgaWYgKCFkaXZpZGVQcmVzc2VkIHx8ICFtdWx0aXBseVByZXNzZWQpCiAgICAgICAgICAgIHJldHVybjsKCiAgICAgICAgLy8g7J2066+4IOywveydtCDsnojsnLzrqbQg66y07IucCiAgICAgICAgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsb2NhbHBvc3QtZGlhbG9nJykpCiAgICAgICAgICAgIHJldHVybjsKCiAgICAgICAgb3BlbkRpYWxvZygpOwogICAgfSk7CgogICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBlID0+IHsKICAgICAgICBpZiAoZS5jb2RlID09PSAnTnVtcGFkRGl2aWRlJykKICAgICAgICAgICAgZGl2aWRlUHJlc3NlZCA9IGZhbHNlOwogICAgICAgIGVsc2UgaWYgKGUuY29kZSA9PT0gJ051bXBhZE11bHRpcGx5JykKICAgICAgICAgICAgbXVsdGlwbHlQcmVzc2VkID0gZmFsc2U7CiAgICB9KTsKCiAgICBmdW5jdGlvbiBvcGVuRGlhbG9nKCkgewogICAgICAgIGNvbnN0IG92ZXJsYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTsKICAgICAgICBvdmVybGF5LmlkID0gJ2xvY2FscG9zdC1kaWFsb2cnOwoKICAgICAgICBvdmVybGF5LmlubmVySFRNTCA9IGAKICAgICAgICAgICAgPGRpdiBpZD0ibG9jYWxwb3N0LWJveCI+CiAgICAgICAgICAgICAgICA8ZGl2IGlkPSJsb2NhbHBvc3QtdGl0bGUiPkxvY2FsUG9zdDwvZGl2PgogICAgICAgICAgICAgICAgPGlucHV0IGlkPSJsb2NhbHBvc3QtdXJsIiB0eXBlPSJ0ZXh0IiB2YWx1ZT0iJHtlc2NhcGVIdG1sKGRlY29kZVVybChsb2NhdGlvbi5ocmVmKSl9Ij4KICAgICAgICAgICAgICAgIDxkaXYgaWQ9ImxvY2FscG9zdC1idXR0b25zIj4KICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGlkPSJsb2NhbHBvc3QtY2FuY2VsIj7st6jshow8L2J1dHRvbj4KICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGlkPSJsb2NhbHBvc3Qtb2siPu2ZleyduDwvYnV0dG9uPgogICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgIDwvZGl2PgogICAgICAgIGA7CgogICAgICAgIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTsKICAgICAgICBzdHlsZS50ZXh0Q29udGVudCA9IGAKICAgICAgICAgICAgI2xvY2FscG9zdC1kaWFsb2cgewogICAgICAgICAgICAgICAgcG9zaXRpb246IGZpeGVkOwogICAgICAgICAgICAgICAgaW5zZXQ6IDA7CiAgICAgICAgICAgICAgICB6LWluZGV4OiAyMTQ3NDgzNjQ3OwogICAgICAgICAgICAgICAgYmFja2dyb3VuZDogcmdiYSgwLDAsMCwuNik7CiAgICAgICAgICAgICAgICBkaXNwbGF5OiBmbGV4OwogICAgICAgICAgICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjsKICAgICAgICAgICAgICAgIGp1c3RpZnktY29udGVudDogY2VudGVyOwogICAgICAgICAgICAgICAgZm9udC1mYW1pbHk6IEFyaWFsLCBzYW5zLXNlcmlmOwogICAgICAgICAgICB9CiAgICAgICAgICAgICNsb2NhbHBvc3QtYm94IHsKICAgICAgICAgICAgICAgIHdpZHRoOiA0MzBweDsKICAgICAgICAgICAgICAgIHBhZGRpbmc6IDIwcHg7CiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiAjZmZmOwogICAgICAgICAgICAgICAgYm9yZGVyOiAycHggc29saWQgIzAwMDsKICAgICAgICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDEwcHg7CiAgICAgICAgICAgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OwogICAgICAgICAgICB9CiAgICAgICAgICAgICNsb2NhbHBvc3QtdGl0bGUgewogICAgICAgICAgICAgICAgZm9udC1zaXplOiAxOHB4OwogICAgICAgICAgICAgICAgZm9udC13ZWlnaHQ6IGJvbGQ7CiAgICAgICAgICAgICAgICBtYXJnaW4tYm90dG9tOiAxNXB4OwogICAgICAgICAgICAgICAgY29sb3I6ICMwMDA7CiAgICAgICAgICAgIH0KICAgICAgICAgICAgI2xvY2FscG9zdC11cmwgewogICAgICAgICAgICAgICAgd2lkdGg6IDEwMCU7CiAgICAgICAgICAgICAgICBoZWlnaHQ6IDM4cHg7CiAgICAgICAgICAgICAgICBtYXJnaW4tYm90dG9tOiAxMHB4OwogICAgICAgICAgICAgICAgcGFkZGluZzogMCAxMHB4OwogICAgICAgICAgICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsKICAgICAgICAgICAgICAgIGJvcmRlcjogMXB4IHNvbGlkICMwMDA7CiAgICAgICAgICAgICAgICBib3JkZXItcmFkaXVzOiA1cHg7CiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiAjZmZmOwogICAgICAgICAgICAgICAgY29sb3I6ICMwMDA7CiAgICAgICAgICAgICAgICBmb250LXNpemU6IDE0cHg7CiAgICAgICAgICAgICAgICBvdXRsaW5lOiBub25lOwogICAgICAgICAgICB9CiAgICAgICAgICAgICNsb2NhbHBvc3QtdXJsOmZvY3VzIHsKICAgICAgICAgICAgICAgIGJvcmRlci13aWR0aDogMnB4OwogICAgICAgICAgICB9CiAgICAgICAgICAgICNsb2NhbHBvc3QtYnV0dG9ucyB7CiAgICAgICAgICAgICAgICBkaXNwbGF5OiBmbGV4OwogICAgICAgICAgICAgICAganVzdGlmeS1jb250ZW50OiBmbGV4LWVuZDsKICAgICAgICAgICAgICAgIGdhcDogOHB4OwogICAgICAgICAgICAgICAgbWFyZ2luLXRvcDogNXB4OwogICAgICAgICAgICB9CiAgICAgICAgICAgICNsb2NhbHBvc3QtYnV0dG9ucyBidXR0b24gewogICAgICAgICAgICAgICAgcGFkZGluZzogN3B4IDE2cHg7CiAgICAgICAgICAgICAgICBib3JkZXI6IDFweCBzb2xpZCAjMDAwOwogICAgICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogNXB4OwogICAgICAgICAgICAgICAgYmFja2dyb3VuZDogI2ZmZjsKICAgICAgICAgICAgICAgIGNvbG9yOiAjMDAwOwogICAgICAgICAgICAgICAgY3Vyc29yOiBwb2ludGVyOwogICAgICAgICAgICB9CiAgICAgICAgICAgICNsb2NhbHBvc3QtYnV0dG9ucyBidXR0b246aG92ZXIgewogICAgICAgICAgICAgICAgYmFja2dyb3VuZDogIzAwMDsKICAgICAgICAgICAgICAgIGNvbG9yOiAjZmZmOwogICAgICAgICAgICB9CiAgICAgICAgYDsKCiAgICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdHlsZSk7CiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChvdmVybGF5KTsKCiAgICAgICAgY29uc3QgdXJsSW5wdXQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbG9jYWxwb3N0LXVybCcpOwogICAgICAgIHVybElucHV0LmZvY3VzKCk7CiAgICAgICAgdXJsSW5wdXQuc2VsZWN0KCk7CgogICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsb2NhbHBvc3Qtb2snKS5vbmNsaWNrID0gKCkgPT4gc2VuZCh1cmxJbnB1dC52YWx1ZS50cmltKCkpOwogICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdsb2NhbHBvc3QtY2FuY2VsJykub25jbGljayA9IGNsb3NlRGlhbG9nOwoKICAgICAgICBvdmVybGF5LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBlID0+IHsKICAgICAgICAgICAgaWYgKGUua2V5ID09PSAnRXNjYXBlJykKICAgICAgICAgICAgICAgIGNsb3NlRGlhbG9nKCk7CiAgICAgICAgICAgIGlmIChlLmtleSA9PT0gJ0VudGVyJykKICAgICAgICAgICAgICAgIHNlbmQodXJsSW5wdXQudmFsdWUudHJpbSgpKTsKICAgICAgICB9KTsKCiAgICAgICAgZnVuY3Rpb24gY2xvc2VEaWFsb2coKSB7CiAgICAgICAgICAgIG92ZXJsYXkucmVtb3ZlKCk7CiAgICAgICAgICAgIHN0eWxlLnJlbW92ZSgpOwogICAgICAgIH0KCiAgICAgICAgZnVuY3Rpb24gc2VuZChkYXRhKSB7CiAgICAgICAgICAgIGlmICghZGF0YSkKICAgICAgICAgICAgICAgIHJldHVybjsKCiAgICAgICAgICAgIGZldGNoKFRBUkdFVF9VUkwsIHsKICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLAogICAgICAgICAgICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ3RleHQvcGxhaW47IGNoYXJzZXQ9dXRmLTgnIH0sCiAgICAgICAgICAgICAgICBib2R5OiBkYXRhCiAgICAgICAgICAgIH0pLmNhdGNoKGVyciA9PiBjb25zb2xlLmVycm9yKCdMb2NhbFBvc3Qg7KCE7IahIOyLpO2MqDonLCBlcnIpKTsKCiAgICAgICAgICAgIGNsb3NlRGlhbG9nKCk7CiAgICAgICAgfQogICAgfQoKICAgIGZ1bmN0aW9uIGRlY29kZVVybChzdHIpIHsKICAgICAgICB0cnkgewogICAgICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHN0cik7CiAgICAgICAgfSBjYXRjaCAoZSkgewogICAgICAgICAgICByZXR1cm4gc3RyOyAgLy8g7J6Y66q765CcIOyduOy9lOuUqeydtOuptCDsm5Drs7gg6re464yA66GcCiAgICAgICAgfQogICAgfQoKICAgIGZ1bmN0aW9uIGVzY2FwZUh0bWwoc3RyKSB7CiAgICAgICAgcmV0dXJuIHN0cgogICAgICAgICAgICAucmVwbGFjZSgvJi9nLCAnJmFtcDsnKQogICAgICAgICAgICAucmVwbGFjZSgvIi9nLCAnJnF1b3Q7JykKICAgICAgICAgICAgLnJlcGxhY2UoLzwvZywgJyZsdDsnKQogICAgICAgICAgICAucmVwbGFjZSgvPi9nLCAnJmd0OycpOwogICAgfQp9KSgpOwo="

; ================= 트레이 메뉴 (기본 메뉴 제거) =================
Menu, Tray, NoStandard
Menu, Tray, Add, URL 설정, MenuURLSet
Menu, Tray, Add, 스크립트 보기, MenuShowScript
Menu, Tray, Add, 종료, MenuExit
Menu, Tray, Default, URL 설정

StartServer()
return

; ---- URL 설정 GUI (입력칸 1개) ----
MenuURLSet:
Gui, Font, s10, Malgun Gothic
Gui, Add, Text, x10 y15 w50, URL:
Gui, Add, Edit, x70 y12 w220 vInputURL, %InputURL%
Gui, Add, Button, x70 y45 w100 Default gBtnOK, 확인
Gui, Add, Button, x180 y45 w100 gBtnCancel, 취소
Gui, Show, w300 h85, URL 설정
return

BtnOK:
Gui, Submit, NoHide
IniWrite, %InputURL%, %IniFile%, Settings, InputURL
Gui, Destroy
return

BtnCancel:
GuiClose:
GuiEscape:
Gui, Destroy
return

; ---- 스크립트 보기 GUI (Edit + ReadOnly) ----
MenuShowScript:
scriptText := Base64Decode(ScriptB64)
scriptText := StrReplace(scriptText, "`n", "`r`n")   ; Edit 컨트롤 줄바꿈은 CRLF 필요
Gui, 2:Font, s10, Consolas
Gui, 2:Add, Edit, x10 y10 w620 h480 Multi ReadOnly -Wrap VScroll HScroll vScriptEdit, %scriptText%
Gui, 2:Add, Button, x530 y498 w100 gBtnScriptClose, 닫기
Gui, 2:Show, w640 h538, localpost_sender.user.js
return

BtnScriptClose:
2GuiClose:
2GuiEscape:
Gui, 2:Destroy
return

MenuExit:
CloseServer()
ExitApp
return

; ================= 수신 폴링 (타이머) =================
PollServer:
client := DllCall("Ws2_32.dll\accept", "Ptr", ListenSocket, "Ptr", 0, "Ptr", 0, "Ptr")
if (client = -1 or client = 0)
    return
HandleClient(client)
return

; ================= HTTP 서버 (WinSock DllCall, 외부 라이브러리 없음) =================
StartServer() {
    global ListenSocket, ListenPort

    VarSetCapacity(WSAData, 400, 0)
    DllCall("Ws2_32.dll\WSAStartup", "UShort", 0x0202, "Ptr", &WSAData)

    ListenSocket := DllCall("Ws2_32.dll\socket", "Int", 2, "Int", 1, "Int", 6, "Ptr")  ; AF_INET, SOCK_STREAM, IPPROTO_TCP
    if (ListenSocket = -1) {
        ;MsgBox, 16, 오류, 소켓 생성 실패
        return
    }

    ; sockaddr_in (16바이트)
    VarSetCapacity(sockaddr, 16, 0)
    NumPut(2, sockaddr, 0, "UShort")  ; AF_INET
    port_n := DllCall("Ws2_32.dll\htons", "UShort", ListenPort, "UShort")
    NumPut(port_n, sockaddr, 2, "UShort")
    NumPut(0, sockaddr, 4, "UInt")    ; INADDR_ANY

    if (DllCall("Ws2_32.dll\bind", "Ptr", ListenSocket, "Ptr", &sockaddr, "Int", 16) = -1) {
        ;MsgBox, 16, 오류, 포트 %ListenPort% bind 실패`n(이미 사용 중일 수 있습니다)
        return
    }

    DllCall("Ws2_32.dll\listen", "Ptr", ListenSocket, "Int", 5)

    mode := 1  ; 논블로킹 모드 (accept 폴링용)
    DllCall("Ws2_32.dll\ioctlsocket", "Ptr", ListenSocket, "Int", 0x8004667E, "UInt*", mode)  ; FIONBIO

    SetTimer, PollServer, 100
}

CloseServer() {
    global ListenSocket
    SetTimer, PollServer, Off
    if (ListenSocket != -1) {
        DllCall("Ws2_32.dll\closesocket", "Ptr", ListenSocket)
        ListenSocket := -1
    }
}

HandleClient(client) {
    global InputURL

    ; 수신 타임아웃 3초 (SOL_SOCKET, SO_RCVTIMEO)
    timeout := 3000
    DllCall("Ws2_32.dll\setsockopt", "Ptr", client, "Int", 0xFFFF, "Int", 0x1006, "UInt*", timeout, "Int", 4)

    VarSetCapacity(buf, 8192, 0)
    received := DllCall("Ws2_32.dll\recv", "Ptr", client, "Ptr", &buf, "Int", 8191, "Int", 0, "Int")

    if (received <= 0) {
        DllCall("Ws2_32.dll\closesocket", "Ptr", client)
        return
    }

    requestText := StrGet(&buf, received, "UTF-8")

    ; 최소 응답 (200 OK) 후 연결 종료
    response := "HTTP/1.1 200 OK`r`nContent-Length: 0`r`nConnection: close`r`n`r`n"
    DllCall("Ws2_32.dll\send", "Ptr", client, "AStr", response, "Int", StrLen(response), "Int", 0)
    DllCall("Ws2_32.dll\closesocket", "Ptr", client)

    ; 헤더/바디 분리 → 바디가 곧 browserUrl
    headerEnd := InStr(requestText, "`r`n`r`n")
    browserUrl := headerEnd ? SubStr(requestText, headerEnd + 4) : ""

    ;MsgBox, 0, 수신 (Debug), browserUrl: %browserUrl%`n`n보낼 곳(InputURL): %InputURL%

    ForwardPost(browserUrl)
}

; 받은 것을 InputURL로 그대로 재전송 (이중 POST)
ForwardPost(browserUrl) {
    global InputURL

    if (InputURL = "") {
        ;MsgBox, 48, 경고, InputURL이 설정되지 않았습니다. (트레이 → URL 설정)
        return
    }

    url := InputURL
    if !(InStr(url, "http://") = 1 || InStr(url, "https://") = 1)
        url := "http://" url

    try {
        http := ComObjCreate("WinHttp.WinHttpRequest.5.1")
        http.Open("POST", url, false)
        http.SetRequestHeader("Content-Type", "text/plain; charset=utf-8")
        http.Send(browserUrl)
    } catch e {
        ;MsgBox, 16, 전송 실패, % e.Message
    }
}

; Base64 → UTF-8 텍스트 (crypt32.dll, 외부 라이브러리 없음)
Base64Decode(base64Str) {
    outLen := 0
    DllCall("crypt32.dll\CryptStringToBinary", "Str", base64Str, "UInt", 0, "UInt", 0x1, "Ptr", 0, "UInt*", outLen, "Ptr", 0, "Ptr", 0)
    VarSetCapacity(buf, outLen, 0)
    DllCall("crypt32.dll\CryptStringToBinary", "Str", base64Str, "UInt", 0, "UInt", 0x1, "Ptr", &buf, "UInt*", outLen, "Ptr", 0, "Ptr", 0)
    return StrGet(&buf, outLen, "UTF-8")
}
