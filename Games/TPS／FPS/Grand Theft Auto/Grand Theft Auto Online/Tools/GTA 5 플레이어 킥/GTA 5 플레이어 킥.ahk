#SingleInstance Force
SplitPath A_ScriptName,,,,A_FileName
IfEqual A_IsCompiled,,Run % "..\Compiler\Ahk2Exe.exe /in """A_ScriptFullPath """ /out ""..\"A_FileName ".exe""" (FileExist(A_FileName ".ico")?" /icon """A_FileName ".ico""":""),,UseErrorLevel
IfEqual A_IsCompiled,,ExitApp
If Not A_IsAdmin
{
  Run *RunAs "%A_ScriptFullPath%",,UseErrorLevel
  ExitApp
}
Process_Resume("GTA5_Enhanced.exe")
Gui Add,Button,gButton x0 y0 w356 h63,플레이어 전원 추방(&K)
Gui Add,StatusBar
SB_SetIcon("imageres.dll",110)
SB_SetText("제작 : mickey90427@naver.com")
Gui Show,w355 h81,GTA 5 플레이어 킥
Return

Button:
Process Exist,GTA5_Enhanced.exe
If ErrorLevel=0
{
  SB_SetIcon("imageres.dll",80)
  SB_SetText("시스템 : GTA5_Enhanced.exe가 실행중이 아님.")
  Return
}
SB_SetIcon("imageres.dll",195)
Timer:=10
SetTimer CountDown,1000
Process_Suspend("GTA5_Enhanced.exe")
If(Sleep(10000,"ESC"))
{
  SB_SetIcon("imageres.dll",209)
  Process_Resume("GTA5_Enhanced.exe")
  SetTimer CountDown,Off
  SB_SetText("시스템 : 추방 취소됨.")
  Return
}
SB_SetIcon("imageres.dll",209)
Process_Resume("GTA5_Enhanced.exe")
SetTimer CountDown,Off
SB_SetText("시스템 : 플레이어 추방 완료.")
Return

CountDown:
Timer--
SB_SetText("시스템 : 추방중...("Timer ")")
Return

GuiContextMenu:
Run wf.msc,,UseErrorLevel
Return

GuiEscape:
Return

GuiClose:
ExitApp

Process_Suspend(PID_or_Name){
    PID := (InStr(PID_or_Name,".")) ? ProcExist(PID_or_Name) : PID_or_Name
    h:=DllCall("OpenProcess", "uInt", 0x1F0FFF, "Int", 0, "Int", pid)
    If !h
        Return -1
    DllCall("ntdll.dll\NtSuspendProcess", "Int", h)
    DllCall("CloseHandle", "Int", h)
}
Process_Resume(PID_or_Name){
    PID := (InStr(PID_or_Name,".")) ? ProcExist(PID_or_Name) : PID_or_Name
    h:=DllCall("OpenProcess", "uInt", 0x1F0FFF, "Int", 0, "Int", pid)
    If !h
        Return -1
    DllCall("ntdll.dll\NtResumeProcess", "Int", h)
    DllCall("CloseHandle", "Int", h)
}
ProcExist(PID_or_Name=""){
    Process, Exist, % (PID_or_Name="") ? DllCall("GetCurrentProcessID") : PID_or_Name
    Return Errorlevel
}

Sleep(milliseconds:=0, exitKey:="")
{
    StartTickCount := A_TickCount
    Loop
    {
        If ((A_TickCount - StartTickCount) >= milliseconds)
            Break
        If (exitKey != "" && GetKeyState(exitKey, "P"))
            Return True
    }
}