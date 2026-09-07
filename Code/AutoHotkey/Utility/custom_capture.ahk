; ============================================================
; 커스텀 캡쳐 툴 (AutoHotkey v1)
; PrintScreen 누르면 "현재 활성 창 전체"를 PNG로 캡쳐해서
; 사용자가 지정한 폴더에 01.png ~ 99.png 이름으로 저장.
; 저장 폴더는 GUI에서 직접 선택하며, 자동으로 만들어주지 않음 -
; 선택된 폴더가 나중에 사라지면 캡쳐 시점에 다시 선택창을 띄움.
; 외부 라이브러리 없이 Windows 기본 gdiplus.dll만 사용.
; ============================================================
#NoTrayIcon
#SingleInstance Force
#NoEnv
SetWorkingDir, %A_ScriptDir%

global SettingsFile := A_ScriptDir . "\settings.ini"
global CaptureDir := ""
global MainGuiHwnd := 0

Menu Tray, NoStandard
Menu Tray, Add, 설정 창 열기, ShowMainGui
Menu Tray, Add  ; 구분선
Menu Tray, Add, 종료(&X), ExitApp
Menu Tray, Default, 설정 창 열기
Menu Tray, Click, 1  ; 왼쪽 클릭 한 번으로도 기본 항목(설정 창) 실행

; 이전에 골라둔 폴더 불러오기 (없으면 빈 값 -> 첫 캡쳐 시 선택창 뜸)
IniRead, CaptureDir, %SettingsFile%, Settings, CaptureFolder,|
IfEqual CaptureDir,|,SetEnv,CaptureDir

Gui, +LastFound
Gui, Add, Text, x10 y12 w90, 캡쳐 저장 폴더:
Gui, Add, Edit, x105 y10 w300 h22 vFolderPathText ReadOnly, % CaptureDir
Gui, Add, Button, x410 y9 w90 h24 gSelectFolderBtn, 폴더 선택...
Gui, Add, Text, x10 y46 w490, 단축키: PrintScreen → 현재 활성 창 전체 캡쳐 (01.png ~ 99.png 순서로 저장)
Gui, Show, w512 h70, 커스텀 캡쳐 툴
MainGuiHwnd := WinExist()

global pToken := 0
Gdip_Startup()
OnExit("OnScriptExit")

TrayTip, 캡쳐 툴 시작됨, PrintScreen: 활성 창 캡쳐, 3
return

; ===================== GUI 이벤트 =====================
SelectFolderBtn:
EnsureCaptureFolder(true)
return

ShowMainGui:
Gui, Show
return

GuiClose:
GuiEscape:
Gui, Hide
return

; ===================== 핫키 =====================
^PrintScreen::CaptureActiveWindow()

; ===================== 폴더 관리 =====================
; forcePrompt=true 면 현재 폴더가 유효해도 무조건 선택창을 띄움 (버튼 클릭용).
; false 면 현재 CaptureDir이 실제 존재하는 폴더일 때만 그대로 통과시키고,
; 없거나(최초 실행) 사라졌으면 자동으로 선택창을 띄움.
EnsureCaptureFolder(forcePrompt := false) {
    global CaptureDir, SettingsFile, MainGuiHwnd

    if (!forcePrompt && CaptureDir != "" && InStr(FileExist(CaptureDir), "D"))
        return true

    if (CaptureDir != "" && !InStr(FileExist(CaptureDir), "D"))
        prompt := "이전에 선택한 폴더를 찾을 수 없습니다. 캡쳐 저장 폴더를 다시 선택하세요."
    else
        prompt := "캡쳐 저장 폴더를 선택하세요."

    selected := SelectFolderEx(CaptureDir, prompt, MainGuiHwnd)
    if (selected = "")
        return false

    CaptureDir := selected
    IniWrite, %CaptureDir%, %SettingsFile%, Settings, CaptureFolder
    GuiControl,, FolderPathText, % CaptureDir
    return true
}

; ===================== 캡쳐 =====================
CaptureActiveWindow() {
    global CaptureDir

    if !EnsureCaptureFolder()
    {
        TrayTip, 캡쳐 취소됨, 저장 폴더가 지정되지 않았습니다., 3
        return
    }

    WinGet, hwnd, ID, A
    if !hwnd
        return

    WinGetPos, , , w, h, ahk_id %hwnd%
    if (w < 1 || h < 1)
        return

    hdcScreen := DllCall("GetDC", "Ptr", 0, "Ptr")
    hdcMem    := DllCall("CreateCompatibleDC", "Ptr", hdcScreen, "Ptr")
    hBitmap   := DllCall("CreateCompatibleBitmap", "Ptr", hdcScreen, "Int", w, "Int", h, "Ptr")
    hOld      := DllCall("SelectObject", "Ptr", hdcMem, "Ptr", hBitmap, "Ptr")

    ; PW_RENDERFULLCONTENT(2) - DirectX/하드웨어 가속 렌더링 창(크롬 계열 등)도
    ; 검은 화면 없이 제대로 캡쳐되게 하는 플래그
    DllCall("PrintWindow", "Ptr", hwnd, "Ptr", hdcMem, "UInt", 2)

    DllCall("SelectObject", "Ptr", hdcMem, "Ptr", hOld)
    DllCall("DeleteDC", "Ptr", hdcMem)
    DllCall("ReleaseDC", "Ptr", 0, "Ptr", hdcScreen)

    ; HBITMAP -> GDI+ Bitmap 객체로 감싸서 파일로 저장
    pBitmap := 0
    DllCall("gdiplus\GdipCreateBitmapFromHBITMAP", "Ptr", hBitmap, "Ptr", 0, "Ptr*", pBitmap)

    outFile := CaptureDir . "\" . GetNextCaptureFilename() . ".png"

    result := GdipSaveBitmapToFile(pBitmap, outFile)

    DllCall("gdiplus\GdipDisposeImage", "Ptr", pBitmap)
    DllCall("DeleteObject", "Ptr", hBitmap)

    if (result = 0)
    {
        SoundBeep, 1000, 100
        TrayTip, 캡쳐 저장됨, %outFile%, 3
    }
    else
    {
        SoundBeep, 300, 200
        TrayTip, 캡쳐 실패, GdipSaveImageToFile 오류 코드: %result%, 5
    }
}

; 01~99 중 아직 없는 번호를 찾아서 반환 ("01" ~ "99" 문자열).
; 99까지 다 차 있으면 99를 그대로 덮어씀(더 늘리지 않음).
GetNextCaptureFilename() {
    global CaptureDir
    num := 99
    Loop, 99
    {
        n := Format("{:02}", A_Index)
        if !FileExist(CaptureDir . "\" . n . ".png")
        {
            num := A_Index
            break
        }
    }
    return Format("{:02}", num)
}

; ===================== GDI+ 유틸 =====================
Gdip_Startup() {
    global pToken
    if !DllCall("GetModuleHandle", "Str", "gdiplus", "Ptr")
        DllCall("LoadLibrary", "Str", "gdiplus.dll")
    VarSetCapacity(si, 24, 0)
    NumPut(1, si, 0, "UInt")  ; GdiplusVersion = 1
    DllCall("gdiplus\GdiplusStartup", "Ptr*", pToken, "Ptr", &si, "Ptr", 0)
}

Gdip_Shutdown() {
    global pToken
    if (pToken)
        DllCall("gdiplus\GdiplusShutdown", "Ptr", pToken)
}

; PNG 인코더 CLSID는 Windows에서 고정값이라 하드코딩 (인코더 목록 조회 생략)
GdipSaveBitmapToFile(pBitmap, sOutput) {
    static CLSID := "{557CF406-1A04-11D3-9A73-0000F81EF32E}"  ; PNG encoder
    VarSetCapacity(pCLSID, 16, 0)
    DllCall("ole32\CLSIDFromString", "WStr", CLSID, "Ptr", &pCLSID)
    return DllCall("gdiplus\GdipSaveImageToFile", "Ptr", pBitmap, "WStr", sOutput, "Ptr", &pCLSID, "Ptr", 0)
}

OnScriptExit() {
    Gdip_Shutdown()
}

; ==================================================================================================================================
; Shows a dialog to select a folder.
; Depending on the OS version the function will use either the built-in FileSelectFolder command (XP and previous)
; or the Common Item Dialog (Vista and later).
; Parameter:
;     StartingFolder -  the full path of a folder which will be preselected.
;     Prompt         -  a text used as window title (Common Item Dialog) or as text displayed withing the dialog.
;     ----------------  Common Item Dialog only:
;     OwnerHwnd      -  HWND of the Gui which owns the dialog. If you pass a valid HWND the dialog will become modal.
;     BtnLabel       -  a text to be used as caption for the apply button.
;  Return values:
;     On success the function returns the full path of selected folder; otherwise it returns an empty string.
; MSDN:
;     Common Item Dialog -> msdn.microsoft.com/en-us/library/bb776913%28v=vs.85%29.aspx
;     IFileDialog        -> msdn.microsoft.com/en-us/library/bb775966%28v=vs.85%29.aspx
;     IShellItem         -> msdn.microsoft.com/en-us/library/bb761140%28v=vs.85%29.aspx
; ==================================================================================================================================
SelectFolderEx(StartingFolder := "", Prompt := "", OwnerHwnd := 0, OkBtnLabel := "") {
   Static OsVersion := DllCall("GetVersion", "UChar")
        , IID_IShellItem := 0
        , InitIID := VarSetCapacity(IID_IShellItem, 16, 0)
                  & DllCall("Ole32.dll\IIDFromString", "WStr", "{43826d1e-e718-42ee-bc55-a1e261c37bfe}", "Ptr", &IID_IShellItem)
        , Show := A_PtrSize * 3
        , SetOptions := A_PtrSize * 9
        , SetFolder := A_PtrSize * 12
        , SetTitle := A_PtrSize * 17
        , SetOkButtonLabel := A_PtrSize * 18
        , GetResult := A_PtrSize * 20
   SelectedFolder := ""
   If (OsVersion < 6) { ; IFileDialog requires Win Vista+, so revert to FileSelectFolder
      FileSelectFolder, SelectedFolder, *%StartingFolder%, 3, %Prompt%
      Return SelectedFolder
   }
   OwnerHwnd := DllCall("IsWindow", "Ptr", OwnerHwnd, "UInt") ? OwnerHwnd : 0
   If !(FileDialog := ComObjCreate("{DC1C5A9C-E88A-4dde-A5A1-60F82A20AEF7}", "{42f85136-db7e-439c-85f1-e4075d135fc8}"))
      Return ""
   VTBL := NumGet(FileDialog + 0, "UPtr")
   ; FOS_CREATEPROMPT | FOS_NOCHANGEDIR | FOS_PICKFOLDERS
   DllCall(NumGet(VTBL + SetOptions, "UPtr"), "Ptr", FileDialog, "UInt", 0x00002028, "UInt")
   If (StartingFolder <> "")
      If !DllCall("Shell32.dll\SHCreateItemFromParsingName", "WStr", StartingFolder, "Ptr", 0, "Ptr", &IID_IShellItem, "PtrP", FolderItem)
         DllCall(NumGet(VTBL + SetFolder, "UPtr"), "Ptr", FileDialog, "Ptr", FolderItem, "UInt")
   If (Prompt <> "")
      DllCall(NumGet(VTBL + SetTitle, "UPtr"), "Ptr", FileDialog, "WStr", Prompt, "UInt")
   If (OkBtnLabel <> "")
      DllCall(NumGet(VTBL + SetOkButtonLabel, "UPtr"), "Ptr", FileDialog, "WStr", OkBtnLabel, "UInt")
   If !DllCall(NumGet(VTBL + Show, "UPtr"), "Ptr", FileDialog, "Ptr", OwnerHwnd, "UInt") {
      If !DllCall(NumGet(VTBL + GetResult, "UPtr"), "Ptr", FileDialog, "PtrP", ShellItem, "UInt") {
         GetDisplayName := NumGet(NumGet(ShellItem + 0, "UPtr"), A_PtrSize * 5, "UPtr")
         If !DllCall(GetDisplayName, "Ptr", ShellItem, "UInt", 0x80028000, "PtrP", StrPtr) ; SIGDN_DESKTOPABSOLUTEPARSING
            SelectedFolder := StrGet(StrPtr, "UTF-16"), DllCall("Ole32.dll\CoTaskMemFree", "Ptr", StrPtr)
         ObjRelease(ShellItem)
   }  }
   If (FolderItem)
      ObjRelease(FolderItem)
   ObjRelease(FileDialog)
   Return SelectedFolder
}

; Menu,Add의 세 번째 인자는 라벨/함수명이어야 해서, ExitApp 명령을 직접 못 받음 -
; 같은 이름의 라벨을 만들어서 우회 (다른 스크립트들과 동일 패턴)
ExitApp:
ExitApp
