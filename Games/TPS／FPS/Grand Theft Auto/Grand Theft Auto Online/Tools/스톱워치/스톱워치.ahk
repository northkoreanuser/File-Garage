#NoTrayIcon
#SingleInstance Force
SplitPath A_ScriptName,,,,A_FileName
IfEqual A_IsCompiled,,Run % "..\Compiler\Ahk2Exe.exe /in """A_ScriptFullPath """ /out ""..\"A_FileName ".exe""" (FileExist(A_FileName ".ico")?" /icon """A_FileName ".ico""":""),,UseErrorLevel
IfEqual A_IsCompiled,,ExitApp
SplitPath A_ScriptFullPath,,,,A_FileName
IniRead Gui_X,% A_FileName ".ini",Setting,Gui_X
IniRead Gui_Y,% A_FileName ".ini",Setting,Gui_Y
If Gui_X Is NotNumber
Gui_X:=
If Gui_Y Is NotNumber
Gui_Y:=
IfNotEqual Gui_X,,SetEnv,Gui_X,% "x"Gui_X
IfNotEqual Gui_Y,,SetEnv,Gui_Y,% "y"Gui_Y
Watch:=StopWatch_New()
Gui 45:+LabelStopWatch_GUI -Border +Owner +LastFound +AlwaysOnTop
GuiHwnd:=WinExist()
Gui 45:Add,Button,x0 y40 w120 h20 gStopWatch_StartOrStop,&Start/Stop
Gui 45:Add,Button,xp+120 yp wp hp gStopWatch_Reset,&Reset
Gui 45:Font,s22,OCR A Extended
Gui 45:Add,Edit,Center Disabled vStopWatch_Display -VScroll x0 y0 w240 h40
Gui 45:Show,%Gui_X% %Gui_Y% w240 h60,Stop Watch
StopWatch_Wid:=WinExist("Stop Watch ahk_class AutoHotkeyGUI")
GoSub,StopWatch_GUIUpdate
OnMessage(0x201,"WM_LBUTTONDOWN")
SetTimer Pos
Return

WM_LBUTTONDOWN()
{
  PostMessage,0xA1,2,,,A
  Return
}

Pos:
WinGetPos Gui_X,Gui_Y,,,ahk_id%GuiHwnd%
IfNotEqual Gui_X,% Gui_X_,IniWrite % Gui_X_:=Gui_X,% A_FileName ".ini",Setting,Gui_X
IfNotEqual Gui_Y,% Gui_Y_,IniWrite % Gui_Y_:=Gui_Y,% A_FileName ".ini",Setting,Gui_Y
Return

StopWatch_GUIClose:
Watch:=
Gui,45:Destroy
ExitApp

StopWatch_GUIUpdate:
GuiControl,45:,StopWatch_Display,% FormatTime(Watch.GetCurrentTime())
WinSetTitle,ahk_id %StopWatch_Wid%,,% "StopWatch (" . Watch.GetState() . ")"
Return

StopWatch_StartOrStop:
If (watch.GetState() == "running") {
	watch.Stop()
	SetTimer,StopWatch_GUIUpdate,Off
	GoSub,StopWatch_GUIUpdate
} Else {
	watch.Start()
	SetTimer,StopWatch_GUIUpdate,10
}
Return

StopWatch_Reset:
If (Watch.GetState() == "Reset")
	Return
Watch.Reset()
SetTimer,StopWatch_GUIUpdate,Off
GoSub,StopWatch_GUIUpdate
Return

FormatTime(ms,withFraction="true") {
	hour:=ms // (60 * 60 * 1000)
	min:=MakeZeroPadding(mod(ms // (60 * 1000),60),2)
	sec:=MakeZeroPadding(mod(ms // 1000,60),2)
	result:=hour . ":" . min . ":" . sec
	Return withFraction ? result "." MakeZeroPadding(mod(ms,1000),3) : result
}

MakeZeroPadding(num,padding) {
	If num is not Integer
		Return num
	len:=StrLen(num)
	Return padding > len ? SubStr("000000000000000000",1,padding - len) . num : num
}

StopWatch_New() {
	baseObj := Obj_NewBase("StopWatch", "Reset Start Stop GetState GetCurrentTime ToString")
	return Object("timePassedBeforeLastStop", 0
				, "lastStartTime", 0
				, "state", __StopWatch_ResetState_GetInstance()
				, "base", baseObj)
}

StopWatch_Reset(obj) {
	If (obj.state == __StopWatch_ResetState_GetInstance())
		return
	obj.state := __StopWatch_ResetState_GetInstance()
	obj.lastStartTime := 0
	obj.timePassedBeforeLastStop := 0
}

StopWatch_Start(obj) {
	If (obj.state == __StopWatch_RunningState_GetInstance())
		return
	obj.state := __StopWatch_RunningState_GetInstance()
	obj.lastStartTime := A_TickCount
}

StopWatch_Stop(obj) {
	If (obj.state == __StopWatch_StopState_GetInstance()
		|| obj.state == __StopWatch_ResetState_GetInstance())
		return
	obj.state := __StopWatch_StopState_GetInstance()
	obj.timePassedBeforeLastStop := obj.timePassedBeforeLastStop + A_TickCount - obj.lastStartTime
}

StopWatch_GetState(obj) {
	return obj.state.ToString()
}

StopWatch_GetCurrentTime(obj) {
	return obj.state.GetCurrentTime(obj)
}

StopWatch_ToString(obj) {
	return obj.Type() "[state=" obj.GetState() ",currentTime=" obj.GetCurrentTime() "]"
}

__StopWatch_ResetState_GetInstance() {
	static obj := Object("base", Obj_NewBase("__StopWatch_ResetState", "GetCurrentTime ToString"))
	return obj
}
__StopWatch_ResetState_GetCurrentTime(obj, watch) {
	return 0
}
__StopWatch_ResetState_ToString(obj) {
	return "reset"
}

__StopWatch_StopState_GetInstance() {
	static obj := Object("base", Obj_NewBase("__StopWatch_StopState", "GetCurrentTime ToString"))
	return obj
}
__StopWatch_StopState_GetCurrentTime(obj, watch) {
	return watch.timePassedBeforeLastStop
}
__StopWatch_StopState_ToString(obj) {
	return "stop"
}

__StopWatch_RunningState_GetInstance() {
	static obj := Object("base", Obj_NewBase("__StopWatch_RunningState", "GetCurrentTime ToString"))
	return obj
}
__StopWatch_RunningState_GetCurrentTime(obj, watch) {
	return watch.timePassedBeforeLastStop + A_TickCount - watch.lastStartTime
}
__StopWatch_RunningState_ToString(obj) {
	return "running"
}

Obj_NewBase(prefix, methods, getMethod="", setMethod="") {
	baseObj := Object()
	Loop, Parse, methods, %A_Space%
		baseObj[A_LoopField] := prefix . "_" . A_LoopField
	If (getMethod != "")
		baseObj["__Get"] := prefix . "_" . getMethod
	If (setMethod != "")
		baseObj["__Set"] := prefix . "_" . setMethod
	baseObj["_type"] := prefix
	baseObj["Type"] := "__Obj_Type"
	return baseObj
}

__Obj_Type(obj) {
	return obj._type
}