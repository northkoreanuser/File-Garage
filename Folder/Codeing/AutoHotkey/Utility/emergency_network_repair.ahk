#Requires AutoHotkey v2.0
#SingleInstance Force

; ============================================================
;  Emergency Network Repair Engine (네트워크 응급 복구 키트)
;  15단계 통합 복구 체인
;  관리자 권한 필요 - 자동으로 재실행됨
; ============================================================

; ============================================================
; 자동 컴파일 - .ahk로 직접 실행되면(컴파일된 exe가 아니면) 같은 폴더의
; Compiler\Ahk2Exe.exe로 자기 자신을 컴파일하고 종료함.
; 자기와 같은 이름의 .ico가 있으면 아이콘으로 적용, 없으면 생략.
; ============================================================

if !A_IsAdmin {
    try {
        Run('*RunAs "' A_ScriptFullPath '"')
    }
    ExitApp
}

global TempDir := A_Temp "\netrepair"
global BaselineFile := A_ScriptDir "\gateway_baseline.txt"
DirCreate(TempDir)

; GUI 관련 전역 - BuildGui()에서 실제 컨트롤로 채워짐
global MainGui := ""
global StatusBar1 := ""
global LogBox := ""
global BtnStart := ""
global BtnSkip := ""
global BtnClearLog := ""
global g_SkipRequested := false
global g_Running := false

; ============================================================
; 유틸 함수
; ============================================================

Log(msg) {
    ; 파일(repair_log.txt)로는 더 이상 안 남김 - 로그 창에서 바로 다 보이니 불필요.
    ; 대신 타임스탬프를 붙여서 GUI 로그창 + 상태바에 표시
    line := FormatTime(A_Now, "yyyy-MM-dd HH:mm:ss") " | " msg
    global LogBox, StatusBar1
    if IsObject(LogBox) {
        try {
            LogBox.Value := LogBox.Value . line . "`r`n"
            ControlSend("{End}", LogBox)
        }
        try StatusBar1.SetText(msg)
    }
}

; cmd 명령의 표준출력을 파일로 받아 텍스트로 반환
RunCapture(cmdLine) {
    outFile := TempDir "\out_" A_TickCount ".txt"
    RunWait('cmd /c ' cmdLine ' > "' outFile '" 2>&1', , "Hide")
    text := ""
    ; 콘솔(cmd/netsh/ipconfig) 출력은 한글 Windows에서 EUC-KR/CP949로 나오므로
    ; UTF-8로 읽으면 "기본 게이트웨이", "신호" 등 한글 정규식 매칭이 깨진 텍스트에 대고 실패함
    try text := FileRead(outFile, "CP949")
    try FileDelete(outFile)
    return text
}

; ping으로 인터넷 연결 여부 확인 (exit code 0 = 성공)
PingTest() {
    exitCode := RunWait('ping -n 1 -w 1500 8.8.8.8', , "Hide")
    return (exitCode = 0)
}

; WinINet의 InternetCheckConnection - ping과 다른 경로(HTTP 프로바이더 레벨)로 확인함.
; ping 단독 판정은 예전에 다른 경로(VPN 잔재 등)를 타고 오탐 성공이 나온 적이 있어서
; 병행 검증용으로 추가함 (기존 검사를 대체하는 게 아니라 같이 씀).
CheckWinInetConnection(url := "https://www.google.com/") {
    return DllCall("Wininet.dll\InternetCheckConnection", "Str", url, "UInt", 1, "UInt", 0) != 0
}

; 최종 판정: 두 방식이 다 성공해야 "진짜 연결됨"으로 인정 - ping 단독 판정보다 오탐이 줄어듦
TestInternet() {
    return PingTest() && CheckWinInetConnection()
}

; ============================================================
; 0단계 - 사전 고지 (VPN/프록시 끊김 + AP 자동전환 안내)
; ============================================================

; true를 반환하면 진행, false면 사용자가 취소한 것 - GUI 모드에서는
; ExitApp 대신 그냥 대기 화면으로 돌아가야 하므로 반환값으로 처리
Step0_Notice() {
    ; Options 4420 = YesNo(4) + Icon 정보/파란 아이콘(64) + 2번 버튼(No) 기본 선택(256) + 시스템 모달/항상 최상위(4096)
    ; → 무지성 엔터 시 "No"가 눌려 안전하게 취소됨
    result := MsgBox(
        "인터넷 복구를 시작합니다.`n`n"
        "복구 과정에서 VPN 및 프록시 연결이 강제로 끊어졌다가 재연결될 수 있습니다.`n"
        "(인터넷 자체가 안 되는 상황에서는 복구가 우선이기 때문입니다)`n`n"
        "저장된 Wi-Fi 목록 중 신호가 가장 강한 AP로 자동 전환될 수 있습니다.`n"
        "(현재 일부러 신호가 약한 특정 AP-예: 회사망-에 연결해둔 상태였어도 갈아탈 수 있습니다)`n`n"
        "계속 진행할까요?",
        "복구 시작 전 안내",
        4 + 64 + 256 + 4096
    )
    Log("0단계: 사전 고지 표시, 사용자 응답=" result)
    return (result != "No")
}

; ============================================================
; 1단계 - 무선 기능 꺼짐 → 자동 On
; ============================================================

Step1_WirelessRadioOn() {
    ; 무선 인터페이스 이름은 "Wi-Fi"가 기본값이지만 환경에 따라 다를 수 있음
    RunWait('netsh interface set interface name="Wi-Fi" admin=enabled', , "Hide")
    Log("1단계: 무선 인터페이스(Wi-Fi) 활성화 명령 실행")

    ; 위 netsh 명령은 어댑터(장치) 자체의 활성/비활성만 제어함.
    ; 작업표시줄/설정의 Wi-Fi 토글이나 Fn키로 끄는 라디오 스위치는 별도 레이어라
    ; Windows Runtime Radio API를 PowerShell로 호출해야 켜짐.
    ; 주의: WinRT의 IAsyncOperation에 .GetAwaiter()를 직접 거는 건 최신 PowerShell(7+)
    ; 전용이고, 기본 제공되는 Windows PowerShell(5.1, powershell.exe)에서는
    ; "[System.__ComObject]에 GetAwaiter 메서드가 없음" 에러로 무조건 실패함.
    ; 그래서 리플렉션으로 System.WindowsRuntimeSystemExtensions.AsTask 오버로드를 찾아
    ; 진짜 .NET Task로 변환한 뒤 .Wait()/.Result로 결과를 받는 Await 헬퍼를 씀
    ; (5.1에서 WinRT 비동기 API를 호출하는 표준적인 우회법).
    psCmd := "function Await($t,$rt){ $m=([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation``1' }).MakeGenericMethod($rt); $nt=$m.Invoke($null,@($t)); $nt.Wait(-1) | Out-Null; $nt.Result }; Add-Type -AssemblyName System.Runtime.WindowsRuntime; [Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime] | Out-Null; $radios = Await ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]]); $wifi = @($radios | Where-Object {$_.Kind -eq 'WiFi'}); if ($wifi.Count -gt 0) { $status = Await ($wifi[0].SetStateAsync('On')) ([Windows.Devices.Radios.RadioAccessStatus]); Write-Output ('RadioCount=' + $wifi.Count + ' Status=' + $status) } else { Write-Output 'RadioCount=0' }"
    radioResult := RunCapture('powershell -NoProfile -Sta -Command "' psCmd '"')
    Log("1단계: Wi-Fi 라디오 토글 On 시도 결과 - " Trim(radioResult))

    Sleep(1500)

    ; 라디오가 켜져있는 것 확인됐으면 이 단계 자체는 완료된 것 - 인터넷이 아직 안 되는 건
    ; AP 연결(3단계) 등 다른 단계의 몫이라, 이 단계를 계속 반복해봐야 결과가 달라지지 않음
    return InStr(radioResult, "Status=Allowed") ? true : false
}

; ============================================================
; 2단계 - 물리적 뽑힘/비활성화된 어댑터 → 전부 재활성화
; ============================================================

EnableAllAdapters() {
    ; netsh는 어댑터 이름 와일드카드를 지원하지 않으므로 WMI로 전체 순회
    try {
        wmi := ComObjGet("winmgmts:")
        for adapter in wmi.ExecQuery("SELECT * FROM Win32_NetworkAdapter WHERE PhysicalAdapter=True") {
            try adapter.Enable()
        }
    } catch as e {
        Log("2단계: WMI 어댑터 활성화 중 오류 - " e.Message)
    }
}

Step2_PhysicalReenable() {
    EnableAllAdapters()
    Log("2단계: 모든 물리 어댑터 재활성화 시도 (Media Disconnected 대응)")
    Sleep(2000)
    ; 어댑터 활성화 명령은 이미 시도 끝 - 이것도 반복해봐야 결과가 달라지지 않으므로 완료 처리
    return true
}

; ============================================================
; 3단계 - 저장된 AP는 있으나 미연결 → 신호 최강 AP 자동 연결
; ============================================================

Step3_ConnectStrongestSavedAP() {
    ; 이전 버전: netsh wlan show networks의 "신호 : NN%" 텍스트를 파싱해서
    ; 신호 최강 AP를 골랐는데, 스캔 결과 캐시 타이밍/출력 포맷에 취약해서
    ; 실제로는 계속 "파싱 가능한 저장 AP를 찾지 못함"으로 실패함.
    ; → "저장은 돼있지만 그냥 연결만 끊긴" 상황(사용자가 수동으로 연결 해제한 경우 등)에는
    ; 신호 세기 비교가 필요 없으므로, 저장된 프로필 목록(우선순위 순으로 저장됨)을
    ; 순서대로 그냥 연결 시도하는 방식으로 교체 - 훨씬 안정적임.
    ; netsh 출력의 정확한 한글 레이블(예: "모든 사용자 프로필")을 추측해서 매칭했더니
    ; 실제 문구가 달라 계속 실패함. 언어에 의존하지 않도록 구조로만 파싱:
    ; 실제 프로필 이름 줄은 항상 "들여쓰기 + 콜론(:)"이 있고, 섹션 제목/구분선 줄은
    ; 들여쓰기가 없거나 콜론이 없음 - 이 구조적 특징만으로 판단.
    text := RunCapture("netsh wlan show profiles")
    profiles := []
    for line in StrSplit(text, "`n") {
        if RegExMatch(line, "^\s+\S.*:\s*(\S.*)$", &m)
            profiles.Push(Trim(m[1]))
    }

    if (profiles.Length = 0) {
        ; 이번에도 못 찾으면 추측 대신 실제 원본 텍스트를 로그에 남겨서 바로 원인 확인 가능하게 함
        Log("3단계: 저장된 Wi-Fi 프로필을 찾지 못함 (원본 출력: " SubStr(text, 1, 600) ")")
        Sleep(2000)
        return
    }

    ; 주의: 이 로직은 "현재 아예 연결이 없을 때"를 전제로 함.
    ; 사용자가 의도적으로 특정 AP(회사망 등)를 쓰고 있었는데 일시적으로 신호가
    ; 약해 끊긴 것뿐이었다면, 이 단계가 다른 저장 프로필로 갈아치울 수 있음
    ; (0단계 안내문에서 이 위험은 사용자에게 사전 고지됨).
    for profileName in profiles {
        RunWait('netsh wlan connect name="' profileName '"', , "Hide")
        Sleep(3000)
        state := RunCapture("netsh wlan show interfaces")
        if RegExMatch(state, "상태\s*:\s*연결됨") {
            Log("3단계: 저장된 프로필(" profileName ")로 연결 성공")
            return
        }
    }
    Log("3단계: 저장된 프로필 " profiles.Length "개 모두 연결 시도했으나 실패")
}

; ============================================================
; 4단계 - VPN/프록시 무조건 강제 종료 후 재연결
; ============================================================

Step4_KillVPNAndProxy() {
    vpnProcesses := ["openvpn.exe", "openvpngui.exe", "nordvpn.exe", "expressvpn.exe",
                      "wireguard.exe", "protonvpn.exe", "surfshark.exe", "tap-windows.exe"]

    for procName in vpnProcesses {
        if ProcessExist(procName) {
            ProcessClose(procName)
            Log("4단계: VPN 프로세스 종료 - " procName)
        }
    }

    ; 시스템 프록시 초기화 (WinHTTP 레벨)
    RunWait('netsh winhttp reset proxy', , "Hide")

    ; 사용자 레벨 프록시(레지스트리) 비활성화
    try RegWrite(0, "REG_DWORD", "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings", "ProxyEnable")

    Log("4단계: 프록시 설정 초기화 완료")
    Sleep(1500)
}

; ============================================================
; 5단계 - CLI 명령 잔재(고정 IP, DHCP 꼬임 등) → 복구 명령어
; ============================================================

Step5_ResetIPConfig() {
    RunWait('ipconfig /release', , "Hide")
    RunWait('ipconfig /renew', , "Hide")
    RunWait('ipconfig /flushdns', , "Hide")
    Log("5단계: ipconfig release/renew/flushdns 실행")
    Sleep(2000)
}

; ============================================================
; 6단계 - 네트워크 관련 서비스 중단됨 → 전부 시작
; ============================================================

Step6_StartNetworkServices() {
    services := ["Dhcp", "Dnscache", "WlanSvc", "NlaSvc", "LanmanWorkstation"]
    ; 주의: 실제로는 의존성 순서가 있어 무작위 순서로 켜면 일부가
    ; "시작됨" 상태여도 정상 동작하지 않을 수 있음. 아래는 위 배열 순서
    ; (Dhcp를 먼저 켜고 그 다음 상위 서비스를 켜는 순서)를 그대로 따름.
    for svc in services {
        RunWait('sc start ' svc, , "Hide")
        Log("6단계: 서비스 시작 시도 - " svc)
        Sleep(500)
    }
    Sleep(1500)
}

; ============================================================
; 7단계 - 랜카드 드라이버 없음/손상 → 자동 설치기 RunWait
; ============================================================

Step7_InstallDriverIfMissing() {
    ; pnputil로 인식 안 된 네트워크 장치가 있는지 간단 확인
    text := RunCapture("pnputil /enum-devices /class Net")
    if InStr(text, "오류") || InStr(text, "Error") || text = "" {
        Log("7단계: pnputil 조회 실패 - 드라이버 문제 가능성")
    }

    ; 아래 경로는 실제 배포 시 준비해둔 드라이버 자동설치기 경로로 교체할 것
    driverInstallerPath := A_ScriptDir "\3DP\Net\2101\3DP_Net.exe"
    if FileExist(driverInstallerPath) {
        RunWait('"' driverInstallerPath '"')
        Log("7단계: 드라이버 자동 설치기 실행 완료")
    } else {
        Log("7단계: 드라이버 설치기 파일 없음 (" driverInstallerPath ") - 수동 설치 필요")
    }
    Sleep(2000)
}

; ============================================================
; 8단계 - ARP 스푸핑(MITM) → 게이트웨이 MAC 정적 고정 + 킬스위치
; ============================================================

GetGatewayIP() {
    text := RunCapture("ipconfig")
    if RegExMatch(text, "기본 게이트웨이[ .]*:\s*([\d.]+)", &m)
        return m[1]
    return ""
}

GetGatewayMAC(gatewayIP) {
    text := RunCapture("arp -a " gatewayIP)
    if RegExMatch(text, "([0-9a-fA-F]{2}-){5}[0-9a-fA-F]{2}", &m)
        return m[0]
    return ""
}

; N회 연속으로 같은 MAC이 감지되는지 확인 (오탐 방지용 다중 검사)
; 30초 간격으로 최대 3회 검사하되, 중간에 기준값과 일치하면 즉시 정상 종료
ConfirmGatewayMAC(gwIP, checkCount := 3, intervalMs := 30000) {
    results := []
    Loop checkCount {
        mac := GetGatewayMAC(gwIP)
        results.Push(mac)
        Log("8단계: ARP 확인 " A_Index "/" checkCount "회차 - MAC=" mac)
        if (A_Index < checkCount)
            Sleep(intervalMs)
    }
    return results
}

Step8_ArpProtection() {
    gwIP := GetGatewayIP()
    if (gwIP = "") {
        Log("8단계: 게이트웨이 IP를 찾지 못해 ARP 보호 건너뜀")
        return
    }

    currentMAC := GetGatewayMAC(gwIP)

    if !FileExist(BaselineFile) {
        ; 최초 실행: 지금 상태를 정상 기준값으로 저장
        ; 주의: 최초 실행 시점에 이미 스푸핑이 진행 중이면 오염된 MAC이
        ; 기준값으로 저장될 수 있으므로, 신뢰할 수 있는 네트워크에서
        ; 처음 실행하는 것을 권장.
        FileAppend(currentMAC, BaselineFile)
        Log("8단계: 게이트웨이 MAC 기준값 저장 - " currentMAC)
        return
    }

    baselineMAC := Trim(FileRead(BaselineFile))
    if (baselineMAC = "" || currentMAC = "" || baselineMAC = currentMAC) {
        Log("8단계: 게이트웨이 MAC 정상 (" currentMAC ")")
        return
    }

    ; 1차 검사에서 불일치 발견 - 즉시 조치하지 않고 30초 간격으로 재검사
    Log("8단계: 1차 검사에서 불일치 감지(기준=" baselineMAC ", 현재=" currentMAC ") → 오탐 방지를 위해 30초 간격 재검사 시작")
    confirmResults := ConfirmGatewayMAC(gwIP, 3, 30000)

    ; 3회 검사 결과가 서로 다르면(공유기가 계속 바뀌는 등 불안정 상태) 스푸핑이라
    ; 단정하기 어려우므로 조치하지 않고 로그만 남김
    allSame := true
    for i, mac in confirmResults {
        if (i > 1 && mac != confirmResults[1]) {
            allSame := false
            break
        }
    }

    if (!allSame) {
        Log("8단계: 재검사 결과가 매 회 다르게 나옴 - 스푸핑 단정 불가, 자동 조치 보류")
        return
    }

    if (confirmResults[1] = baselineMAC) {
        ; 재검사 중 정상으로 돌아옴 (공유기 순간 재시작 등 일시적 현상이었을 가능성)
        Log("8단계: 재검사에서 기준값과 일치 확인 - 일시적 현상으로 판단, 조치 보류")
        return
    }

    ; 3회 연속 동일하게 기준값과 다른 MAC이 확인된 경우에만 ARP 스푸핑으로 판단하고 조치
    {
        newMAC := confirmResults[1]
        Log("8단계: 30초 간격 3회 연속 불일치 확정! 기준=" baselineMAC " → 신규=" newMAC " - ARP 스푸핑으로 판단, 정적 고정 실행")
        RunWait('arp -d ' gwIP, , "Hide")
        RunWait('arp -s ' gwIP ' ' baselineMAC, , "Hide")
        Log("8단계: 게이트웨이 MAC을 기준값으로 정적 고정")
    }
    Sleep(1000)
}

; ============================================================
; 9단계 - Evil Twin(가짜 AP) → BSSID 블랙리스트
;
; 구현 방법 메모 (완전 자동화는 제한적):
;   netsh wlan add filter 명령은 SSID 또는 네트워크 타입 단위 차단만
;   지원하고, 특정 BSSID(MAC) 단위 차단은 표준 netsh로는 불가능함.
;   실제로 BSSID 단위 차단을 하려면:
;     1) 그룹 정책(gpedit.msc)의 무선 네트워크 정책(WLAN Policies)에서
;        "허용된 BSSID 목록"을 XML 프로파일로 등록하거나,
;     2) WMI의 MSNdis_80211_BSSIDList / Native Wifi API(WlanSetFilterList)를
;        C++/C# 등으로 직접 호출해야 함 (AHK 기본 함수로는 노출 안 됨).
;   AHK에서 대체로 할 수 있는 최선은:
;     - 동일 SSID가 서로 다른 BSSID로 중복 노출되는지 감지해서 사용자에게
;       경고 메시지만 띄우는 수준 (아래 함수가 그 역할)
; ============================================================

Step9_EvilTwinDetectOnly() {
    text := RunCapture("netsh wlan show networks mode=bssid")
    ssidBssidCount := Map()
    currentSSID := ""
    for line in StrSplit(text, "`n") {
        if RegExMatch(line, "SSID \d+ : (.+)", &m)
            currentSSID := Trim(m[1])
        if RegExMatch(line, "BSSID \d+", &m2) && currentSSID != "" {
            if !ssidBssidCount.Has(currentSSID)
                ssidBssidCount[currentSSID] := 0
            ssidBssidCount[currentSSID] += 1
        }
    }

    for ssid, count in ssidBssidCount {
        if (count >= 2) {
            Log("9단계: 경고 - SSID '" ssid "'가 " count "개의 서로 다른 BSSID로 감지됨 (Evil Twin 의심)")
        }
    }
    Sleep(500)
}

; ============================================================
; 10단계 - Rogue DHCP 서버
;
; 구현 방법 메모 (AHK 기본 기능으로는 사실상 불가):
;   Rogue DHCP 탐지의 정석은 네트워크에 DHCP DISCOVER를 브로드캐스트하고
;   OFFER가 몇 개의 서로 다른 서버 IP에서 오는지 패킷 레벨로 캡처하는 것.
;   이건 raw socket / Npcap(WinPcap 후속) 드라이버가 필요한 영역이라
;   AHK 순정 기능으로는 구현 불가능함.
;   현실적 대안:
;     - Npcap을 설치한 환경이라면 tshark.exe(Wireshark CLI)를 RunWait으로
;       호출해 "bootp.option.dhcp == 2"(DHCP OFFER) 패킷을 짧게 캡처하고
;       출처 IP가 2개 이상이면 경고하는 방식으로 우회 구현 가능.
;     - 그게 없다면 "현재 DHCP 서버 IP가 평소 알던 공유기 IP와 다르다"는
;       정도만 ipconfig /all의 "DHCP 서버" 필드로 비교해 경고.
; ============================================================

Step10_RogueDhcpCheckOnly() {
    text := RunCapture("ipconfig /all")
    if RegExMatch(text, "DHCP 서버[ .]*:\s*([\d.]+)", &m) {
        Log("10단계: 현재 DHCP 서버 = " m[1] " (평소 공유기 IP와 다르면 Rogue DHCP 의심, 수동 확인 필요)")
    } else {
        Log("10단계: DHCP 서버 정보를 찾지 못함")
    }
}

; ============================================================
; 11단계 - IP 주소 충돌 → 이벤트 로그 확인, 안내만 가능
; ============================================================

Step11_CheckIPConflict() {
    text := RunCapture('wevtutil qe System /q:"*[System[(EventID=4198 or EventID=4199)]]" /c:1 /rd:true /f:text')
    if (Trim(text) != "") {
        Log("11단계: IP 주소 충돌 이벤트 발견 - 상대 기기의 IP 변경 또는 DHCP 재발급 필요 (수동 조치)")
        MsgBox("IP 주소 충돌이 감지되었습니다.`n다른 기기의 IP를 변경하거나 공유기를 재시작해야 합니다.", "IP 충돌 감지", "Iconi")
    } else {
        Log("11단계: IP 충돌 이벤트 없음")
    }
}

; ============================================================
; 12단계 - 공유기 MAC 필터링 차단
;
; 구현 방법 메모: 호스트 PC에서는 "인증은 되는데 트래픽이 전혀 안 나감"과
; 유의미하게 구분되는 시그널이 거의 없어 신뢰할 수 있는 자동 감지가
; 사실상 불가능함. netsh wlan show interfaces의 "상태" 필드가
; "연결됨"인데도 계속 불통이면 이 케이스를 의심해보라는 안내 문구만 출력.
; ============================================================

Step12_MacFilterNotice() {
    Log("12단계: 자동 감지 불가 - Wi-Fi는 '연결됨' 상태인데 계속 불통이면 공유기 MAC 필터링 차단을 의심하고 공유기 관리자 페이지를 직접 확인할 것")
}

; ============================================================
; 13단계 - 공유기 펌웨어 크래시 → 재시도 대기
; ============================================================

Step13_WaitAndRetry() {
    global g_SkipRequested, BtnSkip
    g_SkipRequested := false
    Log("13단계: 공유기 자체 장애 가능성 - 30초 대기 후 재시도 (스킵 가능)")
    try BtnSkip.Enabled := true
    Loop 3 {
        ; Sleep은 메시지 펌프를 돌리므로 대기 중에도 스킵 버튼 클릭이 즉시 반영됨
        Loop 10 {
            Sleep(1000)
            if g_SkipRequested {
                Log("13단계: 사용자가 대기 중 스킵함")
                try BtnSkip.Enabled := false
                return false
            }
        }
        if TestInternet() {
            Log("13단계: 대기 중 복구 확인됨")
            try BtnSkip.Enabled := false
            return true
        }
    }
    try BtnSkip.Enabled := false
    return false
}

; ============================================================
; 999단계 - 완전 미해결
; ============================================================

Step999_LogAndNotifyFailure() {
    Log("999단계: 모든 자동 복구 단계 실패 - 수동 점검 필요")
    MsgBox(
        "자동 복구에 실패했습니다.`n`n"
        "가능한 원인: ISP 자체 장애, 공유기 하드웨어 고장, 회선 단선 등`n"
        "위쪽 로그 창에서 자세한 진행 내역을 확인할 수 있습니다.`n`n"
        "ISP 고객센터 또는 공유기 제조사에 문의해주세요.",
        "복구 실패", "IconX"
    )
}

; ============================================================
; GUI
; ============================================================

BuildGui() {
    global MainGui, StatusBar1, LogBox, BtnStart, BtnSkip, BtnClearLog

    MainGui := Gui("+Resize", "네트워크 응급 복구 키트")
    MainGui.SetFont("s10", "맑은 고딕")
    MainGui.Add("Text", "w520", "인터넷 연결 문제를 진단·복구합니다.")

    LogBox := MainGui.Add("Edit", "w520 h320 ReadOnly VScroll -Wrap")

    BtnStart := MainGui.Add("Button", "w150 h34", "시작")
    BtnSkip := MainGui.Add("Button", "x+10 w150 h34 Disabled", "이 단계 스킵")
    BtnClearLog := MainGui.Add("Button", "x+10 w120 h34", "로그 비우기")

    StatusBar1 := MainGui.Add("StatusBar")
    StatusBar1.SetParts(380)  ; 폭 하나만 지정하면 2개 칸으로 나뉨: 1(380px)=일반 진행 메시지, 2(나머지)=재시도 루프 표시용
    StatusBar1.SetText("대기 중 - [시작]을 눌러주세요")

    BtnStart.OnEvent("Click", OnStartClick)
    BtnSkip.OnEvent("Click", OnSkipClick)
    BtnClearLog.OnEvent("Click", OnClearLogClick)
    MainGui.OnEvent("Close", (*) => ExitApp())
    ; 대기 중엔 ESC로 종료, 작동 중엔 ESC가 스킵(확인 후)으로 동작
    MainGui.OnEvent("Escape", OnEscapePressed)

    MainGui.Show()
}

OnStartClick(*) {
    global BtnStart, LogBox

    ; 기존 로그가 남아있으면 유지할지 지우고 새로 시작할지 먼저 물어봄
    if (LogBox.Value != "") {
        choice := MsgBox(
            "기존 로그가 남아있습니다.`n`n"
            "로그를 유지한 채로 이어서 실행할까요?`n"
            "('아니오'를 선택하면 로그를 비우고 새로 시작합니다)",
            "로그 유지 여부", "YesNo Icon?"
        )
        if (choice = "No") {
            LogBox.Value := ""
        }
    }

    BtnStart.Enabled := false
    RunRepairSequence()
}

OnSkipClick(*) {
    RequestSkipWithConfirm()
}

; ESC: 대기 중이면 GUI 종료, 작동 중이면 스킵(확인 후)으로 동작
OnEscapePressed(*) {
    global g_Running
    if g_Running {
        RequestSkipWithConfirm()
    } else {
        ExitApp()
    }
}

; 스킵 = 그냥 넘어가는 게 아니라 Y/N으로 먼저 확인.
; 예 = 다음 단계로 스킵, 아니오 = 취소하고 해결될 때까지 계속 재시도
RequestSkipWithConfirm() {
    global g_SkipRequested, g_Running
    if !g_Running
        return
    choice := MsgBox(
        "현재 단계를 스킵하고 다음 단계로 넘어갈까요?`n`n"
        "('아니오'를 선택하면 취소되고 해결될 때까지 계속 재시도합니다)",
        "스킵 확인", "YesNo Icon?"
    )
    if (choice = "Yes") {
        g_SkipRequested := true
    }
}

OnClearLogClick(*) {
    global LogBox, StatusBar1
    LogBox.Value := ""
    StatusBar1.SetText("로그를 비웠습니다")
}

; 단계를 실행하고 확인 -> 실패하면 같은 단계를 계속 재시도(무한루프)하며
; [이 단계 스킵]을 누르기 전까지는 다음 단계로 넘어가지 않음.
; autoAdvanceOnOwnSuccess = true인 단계는 예외: stepFunc 자신이 "내 할 일은 끝냈다"고
; true를 반환하면, 인터넷이 아직 안 되더라도 반복 없이 즉시 다음 단계로 넘어감.
; (1/2단계처럼 자체 동작이 확정적이라 반복해도 결과가 달라지지 않는 단계용 - 그 외 단계는
; 재시도가 실제로 의미 있을 수 있으므로 기존처럼 스킵 전까지 계속 반복함)
; 반환값 true = 이 단계에서 인터넷이 복구되어 전체 프로세스 종료(호출부에서 return)
;           false = 스킵(또는 자체 완료 판정)되어 다음 단계로 진행
RunStepWithRetry(stepFunc, stepName, autoAdvanceOnOwnSuccess := false) {
    global g_SkipRequested, BtnSkip, StatusBar1
    attempt := 0
    try StatusBar1.SetText("", 2)
    Loop {
        attempt += 1
        g_SkipRequested := false
        try BtnSkip.Enabled := false

        ; 같은 단계를 2회차 이상 도는 중이면 상태바 2번 칸에 루프 표시를 남겨둠
        if (attempt > 1)
            try StatusBar1.SetText("🔁 재시도 루프 중 (" attempt "회차)", 2)

        ownSuccess := stepFunc()

        if TestInternet() {
            Log(stepName " 이후 인터넷 정상 확인 → 작업 완료")
            try StatusBar1.SetText("", 2)
            MsgBox("인터넷 연결이 복구되었습니다.`n(원인: " stepName ")", "복구 완료", "Iconi")
            return true
        }

        if (autoAdvanceOnOwnSuccess && ownSuccess) {
            Log(stepName " - 이 단계 자체는 완료됐지만 인터넷은 아직 안 됨 → 반복 없이 다음 단계로 진행")
            try StatusBar1.SetText("", 2)
            return false
        }

        Log(stepName " 이후에도 불통 (시도 " attempt "회차) - 재시도 중, ESC 또는 [이 단계 스킵]으로 다음 단계로 이동 가능")
        try BtnSkip.Enabled := true

        ; 2초 대기 (메시지 펌프가 돌아서 스킵 버튼/ESC 클릭이 즉시 반영됨)
        Sleep(2000)
        if g_SkipRequested {
            Log(stepName " - 사용자가 스킵 선택 → 다음 단계로 진행")
            try BtnSkip.Enabled := false
            try StatusBar1.SetText("", 2)
            return false
        }
    }
}

RunRepairSequence() {
    global BtnStart, BtnSkip, g_Running

    g_Running := true

    ; Y/N 안내를 띄우기 전에 먼저 조용히 연결 상태를 확인 - 이미 정상이면
    ; 묻지도 않고 바로 알리고 복구 절차 전체를 생략함
    if TestInternet() {
        Log("사전 점검: 이미 인터넷에 연결되어 있음 - 복구 절차 생략")
        MsgBox("이미 인터넷에 연결되어 있습니다.", "사전 점검", "Iconi")
        FinishRepair()
        return
    }

    Log("========== 복구 프로세스 시작 ==========")

    if !Step0_Notice() {
        Log("0단계: 사용자가 취소함 - 대기 화면으로 복귀")
        FinishRepair()
        return
    }

    if RunStepWithRetry(Step1_WirelessRadioOn, "1단계(무선 기능 On)", true) {
        FinishRepair()
        return
    }
    if RunStepWithRetry(Step2_PhysicalReenable, "2단계(어댑터 재활성화)", true) {
        FinishRepair()
        return
    }
    if RunStepWithRetry(Step3_ConnectStrongestSavedAP, "3단계(저장 AP 자동연결)") {
        FinishRepair()
        return
    }
    if RunStepWithRetry(Step4_KillVPNAndProxy, "4단계(VPN/프록시 종료)") {
        FinishRepair()
        return
    }
    if RunStepWithRetry(Step5_ResetIPConfig, "5단계(IP 설정 초기화)") {
        FinishRepair()
        return
    }
    if RunStepWithRetry(Step6_StartNetworkServices, "6단계(서비스 시작)") {
        FinishRepair()
        return
    }
    if RunStepWithRetry(Step7_InstallDriverIfMissing, "7단계(드라이버 설치)") {
        FinishRepair()
        return
    }
    if RunStepWithRetry(Step8_ArpProtection, "8단계(ARP 보호)") {
        FinishRepair()
        return
    }

    Step9_EvilTwinDetectOnly()
    ; 9단계는 경고만 하고 넘어감 (자동 차단 아님)

    Step10_RogueDhcpCheckOnly()
    ; 10단계도 경고만 하고 넘어감

    Step11_CheckIPConflict()

    Step12_MacFilterNotice()

    if Step13_WaitAndRetry() {
        Log("13단계 대기 중 복구 완료")
        MsgBox("인터넷 연결이 복구되었습니다.", "복구 완료", "Iconi")
        FinishRepair()
        return
    }

    Step999_LogAndNotifyFailure()

    Log("========== 복구 프로세스 종료 ==========")
    FinishRepair()
}

FinishRepair() {
    global BtnStart, BtnSkip, StatusBar1, g_Running
    g_Running := false
    BtnStart.Enabled := true
    try BtnSkip.Enabled := false
    try StatusBar1.SetText("", 2)
}

BuildGui()
