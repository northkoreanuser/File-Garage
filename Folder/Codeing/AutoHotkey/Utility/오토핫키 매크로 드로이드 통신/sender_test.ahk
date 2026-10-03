#NoEnv
#SingleInstance Force
SetWorkingDir %A_ScriptDir%

; ================= 설정 =================
TargetURL := "http://127.0.0.1:9876"   ; input_gui.ahk 수신 서버 (스킴 필수)

InputBox, browserUrl, Sender 테스트, 보낼 URL을 입력하세요, , 400, 130, , , , , https://example.com
if ErrorLevel   ; 취소
    ExitApp

try {
    http := ComObjCreate("WinHttp.WinHttpRequest.5.1")
    http.Open("POST", TargetURL, false)
    http.SetRequestHeader("Content-Type", "text/plain; charset=utf-8")
    http.Send(browserUrl)

    statusCode := http.Status
    responseText := http.ResponseText
    MsgBox, 0, 전송 완료, 상태 코드: %statusCode%`n응답: %responseText%
} catch e {
    MsgBox, 16, 전송 실패, % e.Message
}

ExitApp
