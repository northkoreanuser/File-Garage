#SingleInstance Force
SplitPath A_ScriptName,,,,A_FileName
IfEqual A_IsCompiled,,Run % "..\Compiler\Ahk2Exe.exe /in """A_ScriptFullPath """ /out ""..\"A_FileName ".exe""" (FileExist(A_FileName ".ico")?" /icon """A_FileName ".ico""":""),,UseErrorLevel
IfEqual A_IsCompiled,,ExitApp
Menu Tray,NoStandard
Menu Tray,Add ,종료(&X),ExitApp
Gui +AlwaysOnTop +ToolWindow
Gui Color, Black
Gui Font, s36 Bold, Segoe UI
Gui Add, Text, vT x-25 y19 w320 h80 Center cLime BackgroundTrans, 00:00.000
Return

global Aborted := false

!T::
Aborted := false
Delay1 := 500
Delay2 := 3000
Delay3 := 35000
SetTimer Update, 10
end := A_TickCount + Delay1 + Delay2 + Delay3
Gui Show, x0 y0 w270 h110, Teleport Timer
Active()
Send {Space 10}
CustomSleep(Delay1)
if (Aborted)
    Goto, Cancel
Active()
Send {Enter 10}
CustomSleep(Delay2)
if (Aborted)
    Goto, Cancel
Active()
Send !{F4}
CustomSleep(Delay3)
if (Aborted)
    Goto, Cancel
Active()
Send {ESC 10}
SoundPlay % RegExReplace(A_ScriptName,"\.[^.]*$")".mp3"
Return

Cancel:
SetTimer Update, Off
Gui Hide
Return

Update:
    left := end - A_TickCount
    if (left <= 0) {
        SetTimer Update, Off
        SoundBeep 1000, 300
        Gui Hide
    }
    GuiControl,, T, % (left <= 0 ? "00:00.000" : Format("{:02}:{:02}.{:03}", Floor(left/60000), Floor(Mod(left,60000)/1000), Mod(left,1000)))
Return

Active()
{
    WinActivate ahk_exe GTA5.exe
    WinActivate ahk_exe GTA5_Enhanced.exe
}

CustomSleep(milliseconds:=0)
{
    global Aborted
    StartTickCount := A_TickCount
    Loop
    {
        If ((A_TickCount - StartTickCount) >= milliseconds)
            Break
        If (GetKeyState("Escape", "P"))
        {
            Aborted := true
            Break
        }
    }
}

ExitApp:
ExitApp
