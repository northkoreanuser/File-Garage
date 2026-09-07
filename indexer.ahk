; ============================================================
; GitHub Pages 인덱서
;
; 이 스크립트(indexer.ahk)가 있는 폴더 = 리포 루트.
; 루트부터 모든 하위 폴더까지 재귀적으로 돌면서,
; "폴더마다" 그 폴더 바로 안에 있는 폴더/파일 목록을 담은
; pages.json을 만든다. (하위 폴더 안까지 미리 다 담지 않음)
;
; index.html은 폴더를 열 때마다 그 폴더의 pages.json을
; 꼬리에 꼬리를 물며 추가로 읽어들이는 방식으로 동작한다.
;
; ------------------ 색인 제외 규칙 ------------------
; [루트에서만 제외]
;   .git 폴더, indexer.ahk(본인), index.html, start.json, tray.json
; [모든 폴더(루트+모든 하위)에서 제외]
;   pages.json, 이름에 "_NIH_"가 포함된 폴더/파일 (대소문자 무관)
; -----------------------------------------------------
; ============================================================
#NoEnv
#SingleInstance, Force
SetWorkingDir, %A_ScriptDir%
SetBatchLines, -1

global RootDir := A_ScriptDir
global DirCount := 0

; 루트에서만 제외할 이름
RootOnlyExclude := [".git", "indexer.ahk", "index.html", "start.json", "tray.json"]
; 모든 위치에서 이름이 정확히 일치하면 제외
GlobalExactExclude := ["pages.json"]

IndexDir(RootDir, true)

TrayTip, 색인 완료, % DirCount . "개 폴더를 색인하여 pages.json을 생성했습니다.", 3
ExitApp

; ------------------------------------------------------------
; dir 폴더 하나를 색인(pages.json 생성)하고, 하위 폴더로 재귀한다.
; isRoot = true 이면 루트 전용 예외 규칙도 함께 적용한다.
; ------------------------------------------------------------
IndexDir(dir, isRoot) {
    global DirCount
    folders := []
    files := []

    Loop, Files, %dir%\*, D
    {
        if ShouldExclude(A_LoopFileName, isRoot)
            continue
        folders.Push(A_LoopFileName)
    }
    Loop, Files, %dir%\*, F
    {
        if ShouldExclude(A_LoopFileName, isRoot)
            continue
        files.Push(A_LoopFileName)
    }

    SortNamesKo(folders)
    SortNamesKo(files)

    WritePagesJson(dir, folders, files)
    DirCount++

    ; 폴더 먼저 위, 파일은 아래 -> pages.json에도 그 순서로 저장됨.
    ; 하위 폴더들로 재귀 (이때부터는 isRoot = false)
    for index, name in folders
        IndexDir(dir . "\" . name, false)
}

; ------------------------------------------------------------
; 제외 여부 판정
;  - 이름에 "_NIH_"가 포함되면(대소문자 무관) 어디서든 제외
;  - "pages.json"은 어디서든 제외
;  - 루트에서는 .git / indexer.ahk / index.html / start.json / tray.json 도 추가로 제외
; ------------------------------------------------------------
ShouldExclude(name, isRoot) {
    global RootOnlyExclude, GlobalExactExclude

    if InStr(name, "_NIH_")
        return true

    for index, ex in GlobalExactExclude
        if (name = ex)
            return true

    if (isRoot) {
        for index, ex in RootOnlyExclude
            if (name = ex)
                return true
    }
    return false
}

; ------------------------------------------------------------
; 이름 배열 기본 정렬 (최종 정렬/한글 정렬은 index.html에서 다시 처리함)
; ------------------------------------------------------------
SortNamesKo(ByRef arr) {
    if (arr.Length() = 0)
        return
    list := ""
    for index, v in arr
        list .= v . "`n"
    list := RTrim(list, "`n")
    Sort, list
    arr := StrSplit(list, "`n")
}

; ------------------------------------------------------------
; 폴더 하나의 pages.json 작성 -> {"folders":[...], "files":[...]}
; ------------------------------------------------------------
WritePagesJson(dir, folders, files) {
    json := "{`n  ""folders"": " . BuildJsonArray(folders) . ",`n  ""files"": " . BuildJsonArray(files) . "`n}`n"

    outFile := dir . "\pages.json"
    if FileExist(outFile)
        FileDelete, %outFile%
    FileAppend, %json%, %outFile%, UTF-8-RAW
}

BuildJsonArray(arr) {
    if (arr.Length() = 0)
        return "[]"
    out := "["
    first := true
    for index, name in arr {
        out .= (first ? "" : ",") . "`n    """ . JsonEscape(name) . """"
        first := false
    }
    out .= "`n  ]"
    return out
}

JsonEscape(str) {
    str := StrReplace(str, "\", "\\")
    str := StrReplace(str, """", "\""")
    return str
}
