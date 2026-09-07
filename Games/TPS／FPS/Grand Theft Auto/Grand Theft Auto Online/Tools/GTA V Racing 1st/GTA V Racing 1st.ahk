#NoEnv
#NoTrayIcon
#SingleInstance Force
SplitPath A_ScriptName,,,,A_FileName
IfEqual A_IsCompiled,,Run % "..\Compiler\Ahk2Exe.exe /in """A_ScriptFullPath """ /out ""..\"A_FileName ".exe""" (FileExist(A_FileName ".ico")?" /icon """A_FileName ".ico""":""),,UseErrorLevel
IfEqual A_IsCompiled,,ExitApp
IfEqual A_IsAdmin,0,Run *RunAs "%A_ScriptFullPath%",,UseErrorLevel
IfEqual A_IsAdmin,0,ExitApp
Gui +AlwaysOnTop
Gui Add,Button,gButton x-1 y0 w264 h78,&1st Button
Gui Add,StatusBar,,Please click '1st Button'.
Gui Show,w262 h99,GTA V Racing 1st
Return

Button:
Suspend("GTA5.exe",1)
Suspend("GTA5_Enhanced.exe",1)
SB_SetText("Stop key: Esc")
Sleep(10000,"Esc")
Suspend("GTA5.exe",0)
Suspend("GTA5_Enhanced.exe",0)
SB_SetText("Please click '1st Button'.")
Return

GuiClose:
ExitApp

Suspend(PID_or_Name,Mode:=0){
  PID := (InStr(PID_or_Name,".")) ? ProcExist(PID_or_Name) : PID_or_Name
  h:=DllCall("OpenProcess", "uInt", 0x1F0FFF, "Int", 0, "Int", pid)
  If !h
    Return -1
  If Mode=0
  {
    While(IsProcessSuspended(Pid)=1)
    DllCall("ntdll.dll\NtResumeProcess", "Int", h)
  }
  If Mode=1
  {
    If(IsProcessSuspended(Pid)!=1)
    DllCall("ntdll.dll\NtSuspendProcess", "Int", h)
  }
  DllCall("CloseHandle", "Int", h)
}

ProcExist(PID_or_Name=""){
    Process Exist,% (PID_or_Name="")?DllCall("GetCurrentProcessID"):PID_or_Name
    Return Errorlevel
}

IsProcessSuspended(pid) {
    For thread in ComObjGet("winmgmts:").ExecQuery("Select * from Win32_Thread WHERE ProcessHandle = " pid)
        If (thread.ThreadWaitReason != 5)
            Return False
    Return True
}

Sleep(milliseconds:=0, exitKey:="")
{
    StartTickCount := A_TickCount
    Loop
    {
        If ((A_TickCount - StartTickCount) >= milliseconds)
            Break
        If (exitKey != "" && GetKeyState(exitKey, "P"))
            Break
    }
}