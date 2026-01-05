<#
.SYNOPSIS
    Jumbo Frame Deployment Module for InfraDiscovery
    
.DESCRIPTION
    Provides phased deployment of Jumbo Frames (MTU 9014) with:
    - Pre-flight checks
    - Phase-by-phase deployment
    - Validation testing
    - Rollback procedures
    
.NOTES
    Part of InfraDiscovery Framework
    https://github.com/yourorg/InfraDiscovery
    
    DEPLOYMENT ORDER:
    1. Network switches (manual - Meraki/Cisco config)
    2. Hyper-V host physical NICs
    3. Hyper-V vSwitch
    4. VM NICs (test pair first)
    5. Validation
    6. Full rollout
#>

#Requires -Version 5.1

# ============================================================================
# CONFIGURATION
# ============================================================================

$Script:JumboConfig = @{
    JumboMTU = 9014
    StandardMTU = 1500
    StandardRegistryValue = "1514"
    JumboRegistryValue = "9014"
}

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================

function Test-JumboFrameSupport {
    <#
    .SYNOPSIS
        Tests if a server's NIC supports Jumbo Frames
    .PARAMETER ComputerName
        Target server name or IP
    .PARAMETER Credential
        Credential for remote connection
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ComputerName,
        
        [Parameter(Mandatory)]
        [PSCredential]$Credential
    )
    
    try {
        $result = Invoke-Command -ComputerName $ComputerName -Credential $Credential -ScriptBlock {
            $nic = Get-NetAdapter | Where-Object Status -eq 'Up'
            $jumbo = Get-NetAdapterAdvancedProperty -Name $nic.Name -RegistryKeyword "*JumboPacket" -ErrorAction SilentlyContinue
            
            [PSCustomObject]@{
                Server = $env:COMPUTERNAME
                AdapterName = $nic.Name
                CurrentMTU = $nic.MtuSize
                JumboSupported = $null -ne $jumbo
                SupportedValues = if ($jumbo) { $jumbo.ValidDisplayValues } else { @() }
                CurrentSetting = if ($jumbo) { $jumbo.DisplayValue } else { "N/A" }
            }
        } -ErrorAction Stop
        
        return $result
    }
    catch {
        Write-Warning "Failed to test Jumbo support on $ComputerName`: $($_.Exception.Message)"
        return $null
    }
}

function Get-JumboFrameStatus {
    <#
    .SYNOPSIS
        Gets Jumbo Frame status across multiple servers
    .PARAMETER Servers
        Hashtable of server names and IPs
    .PARAMETER Credential
        Credential for remote connections
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [hashtable]$Servers,
        
        [Parameter(Mandatory)]
        [PSCredential]$Credential
    )
    
    Write-Host "`n=== JUMBO FRAME STATUS ===" -ForegroundColor Cyan
    
    $results = @()
    
    foreach ($server in $Servers.GetEnumerator()) {
        $result = Test-JumboFrameSupport -ComputerName $server.Value -Credential $Credential
        
        if ($result) {
            $status = if ($result.CurrentMTU -ge 9000) { "JUMBO" } else { "Standard" }
            $color = if ($result.CurrentMTU -ge 9000) { "Green" } else { "Gray" }
            
            Write-Host "$($result.Server.PadRight(20)) MTU: $($result.CurrentMTU.ToString().PadRight(6)) [$status] Support: $($result.JumboSupported)" -ForegroundColor $color
            $results += $result
        }
        else {
            Write-Host "$($server.Key.PadRight(20)) UNREACHABLE" -ForegroundColor Red
        }
    }
    
    return $results
}

# ============================================================================
# DEPLOYMENT FUNCTIONS
# ============================================================================

function Enable-JumboFrame {
    <#
    .SYNOPSIS
        Enables Jumbo Frames on a server
    .PARAMETER ComputerName
        Target server name or IP
    .PARAMETER Credential
        Credential for remote connection
    .PARAMETER MTU
        MTU value to set (default: 9014)
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)]
        [string]$ComputerName,
        
        [Parameter(Mandatory)]
        [PSCredential]$Credential,
        
        [int]$MTU = 9014
    )
    
    Write-Host "`n[DEPLOY] Enabling Jumbo Frames on $ComputerName" -ForegroundColor Yellow
    
    try {
        # Pre-check
        Write-Host "  Pre-check..." -NoNewline
        $before = Invoke-Command -ComputerName $ComputerName -Credential $Credential -ScriptBlock {
            (Get-NetAdapter | Where-Object Status -eq 'Up').MtuSize
        }
        Write-Host " Current MTU: $before" -ForegroundColor Gray
        
        # Apply change
        Write-Host "  Applying MTU $MTU..." -NoNewline
        Invoke-Command -ComputerName $ComputerName -Credential $Credential -ScriptBlock {
            param($mtu)
            $nic = Get-NetAdapter | Where-Object Status -eq 'Up'
            Set-NetAdapterAdvancedProperty -Name $nic.Name -RegistryKeyword "*JumboPacket" -RegistryValue $mtu
        } -ArgumentList $MTU
        
        Start-Sleep -Seconds 3  # Wait for NIC to reconfigure
        
        # Verify
        Write-Host " Verifying..." -NoNewline
        $after = Invoke-Command -ComputerName $ComputerName -Credential $Credential -ScriptBlock {
            (Get-NetAdapter | Where-Object Status -eq 'Up').MtuSize
        }
        
        if ($after -ge 9000) {
            Write-Host " SUCCESS (MTU: $after)" -ForegroundColor Green
            return @{ Success = $true; Server = $ComputerName; MTU = $after }
        }
        else {
            Write-Host " WARNING - MTU is $after, expected ~$MTU" -ForegroundColor Yellow
            return @{ Success = $false; Server = $ComputerName; MTU = $after }
        }
    }
    catch {
        Write-Host " FAILED: $($_.Exception.Message)" -ForegroundColor Red
        return @{ Success = $false; Server = $ComputerName; Error = $_.Exception.Message }
    }
}

function Disable-JumboFrame {
    <#
    .SYNOPSIS
        Disables Jumbo Frames on a server (rollback)
    .PARAMETER ComputerName
        Target server name or IP
    .PARAMETER Credential
        Credential for remote connection
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ComputerName,
        
        [Parameter(Mandatory)]
        [PSCredential]$Credential
    )
    
    Write-Host "`n[ROLLBACK] Disabling Jumbo Frames on $ComputerName" -ForegroundColor Yellow
    
    try {
        Invoke-Command -ComputerName $ComputerName -Credential $Credential -ScriptBlock {
            $nic = Get-NetAdapter | Where-Object Status -eq 'Up'
            Set-NetAdapterAdvancedProperty -Name $nic.Name -RegistryKeyword "*JumboPacket" -RegistryValue "1514"
        }
        
        Start-Sleep -Seconds 3
        
        $after = Invoke-Command -ComputerName $ComputerName -Credential $Credential -ScriptBlock {
            (Get-NetAdapter | Where-Object Status -eq 'Up').MtuSize
        }
        
        Write-Host "  Result: MTU = $after" -ForegroundColor $(if ($after -le 1500) { "Green" } else { "Yellow" })
        return @{ Success = $true; Server = $ComputerName; MTU = $after }
    }
    catch {
        Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
        return @{ Success = $false; Server = $ComputerName; Error = $_.Exception.Message }
    }
}

# ============================================================================
# VALIDATION
# ============================================================================

function Test-JumboFrameConnectivity {
    <#
    .SYNOPSIS
        Tests Jumbo Frame connectivity between two servers
    .PARAMETER SourceComputer
        Source server IP
    .PARAMETER TargetComputer
        Target server IP
    .PARAMETER Credential
        Credential for remote connection
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$SourceComputer,
        
        [Parameter(Mandatory)]
        [string]$TargetComputer,
        
        [Parameter(Mandatory)]
        [PSCredential]$Credential
    )
    
    Write-Host "`n=== Testing Jumbo Frame Connectivity ===" -ForegroundColor Cyan
    Write-Host "Source: $SourceComputer → Target: $TargetComputer" -ForegroundColor Gray
    
    try {
        $result = Invoke-Command -ComputerName $SourceComputer -Credential $Credential -ScriptBlock {
            param($target)
            
            # Test standard ping
            $stdPing = Test-Connection -ComputerName $target -Count 1 -BufferSize 32 -Quiet
            
            # Test jumbo ping (8972 = 9000 - 28 header)
            $jumboPing = Test-Connection -ComputerName $target -Count 1 -BufferSize 8972 -Quiet -ErrorAction SilentlyContinue
            
            [PSCustomObject]@{
                StandardPing = $stdPing
                JumboPing = $jumboPing
            }
        } -ArgumentList $TargetComputer -ErrorAction Stop
        
        Write-Host "  Standard Ping (32 bytes): $(if ($result.StandardPing) { '✅ OK' } else { '❌ FAILED' })"
        Write-Host "  Jumbo Ping (8972 bytes):  $(if ($result.JumboPing) { '✅ OK - Jumbo working!' } else { '❌ FAILED - Check MTU path' })"
        
        return $result
    }
    catch {
        Write-Error "Connectivity test failed: $($_.Exception.Message)"
        return $null
    }
}

function Test-JumboFrameFileTransfer {
    <#
    .SYNOPSIS
        Tests file transfer performance with Jumbo Frames
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$SourceComputer,
        
        [Parameter(Mandatory)]
        [string]$TargetComputer,
        
        [Parameter(Mandatory)]
        [PSCredential]$Credential,
        
        [int]$FileSizeMB = 100
    )
    
    Write-Host "`n=== File Transfer Performance Test ===" -ForegroundColor Cyan
    
    try {
        $result = Invoke-Command -ComputerName $SourceComputer -Credential $Credential -ScriptBlock {
            param($target, $sizeMB)
            
            # Create test file
            $testFile = "C:\Temp\JumboTest${sizeMB}MB.dat"
            $destPath = "\\$target\C$\Temp\JumboTest${sizeMB}MB.dat"
            
            if (!(Test-Path "C:\Temp")) { New-Item -Path "C:\Temp" -ItemType Directory -Force | Out-Null }
            
            Write-Host "  Creating ${sizeMB}MB test file..." -NoNewline
            $bytes = New-Object byte[] ($sizeMB * 1MB)
            (New-Object Random).NextBytes($bytes)
            [System.IO.File]::WriteAllBytes($testFile, $bytes)
            Write-Host " Done" -ForegroundColor Green
            
            Write-Host "  Copying to $target..." -NoNewline
            $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            Copy-Item $testFile $destPath -Force
            $stopwatch.Stop()
            Write-Host " Done" -ForegroundColor Green
            
            $seconds = $stopwatch.Elapsed.TotalSeconds
            $mbps = ($sizeMB / $seconds)
            
            # Cleanup
            Remove-Item $testFile -Force -ErrorAction SilentlyContinue
            Remove-Item $destPath -Force -ErrorAction SilentlyContinue
            
            [PSCustomObject]@{
                FileSizeMB = $sizeMB
                TransferSeconds = [math]::Round($seconds, 2)
                SpeedMBps = [math]::Round($mbps, 1)
            }
        } -ArgumentList $TargetComputer, $FileSizeMB -ErrorAction Stop
        
        Write-Host "`n  Results:" -ForegroundColor Cyan
        Write-Host "    File Size: $($result.FileSizeMB) MB"
        Write-Host "    Time: $($result.TransferSeconds) seconds"
        Write-Host "    Speed: $($result.SpeedMBps) MB/s" -ForegroundColor Green
        
        return $result
    }
    catch {
        Write-Error "File transfer test failed: $($_.Exception.Message)"
        return $null
    }
}

# ============================================================================
# PHASED DEPLOYMENT
# ============================================================================

function Start-JumboFrameDeployment {
    <#
    .SYNOPSIS
        Interactive phased Jumbo Frame deployment
    .PARAMETER Servers
        Hashtable of server names and IPs
    .PARAMETER TestPair
        Hashtable of two servers for initial testing
    .PARAMETER Credential
        Credential for remote connections
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [hashtable]$Servers,
        
        [hashtable]$TestPair,
        
        [Parameter(Mandatory)]
        [PSCredential]$Credential
    )
    
    function Show-Menu {
        Clear-Host
        Write-Host @"
╔══════════════════════════════════════════════════════════════════════════════╗
║           JUMBO FRAMES DEPLOYMENT TOOL                                       ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  [1] Show Phase 1 Plan - Switch Configuration (Manual)                       ║
║  [2] Show Phase 2 Plan - Hyper-V Host NICs (Manual via RDP)                  ║
║  [3] Show Phase 3 Plan - Hyper-V vSwitch (Verification)                      ║
║  [4] Deploy Phase 4 - Test Pair Only                                         ║
║  [5] Run Phase 5 - Validation Tests                                          ║
║  [6] Deploy Phase 6 - All Servers                                            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  [R4] Rollback Phase 4 (Test Pair)                                           ║
║  [R6] Rollback Phase 6 (All Servers)                                         ║
║  [S] Show Current Status                                                     ║
║  [Q] Quit                                                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan
    }
    
    while ($true) {
        Show-Menu
        $choice = Read-Host "Select option"
        
        switch ($choice.ToUpper()) {
            "1" { Show-Phase1-SwitchPlan; Read-Host "Press Enter" }
            "2" { Show-Phase2-HostPlan; Read-Host "Press Enter" }
            "3" { Show-Phase3-vSwitchPlan; Read-Host "Press Enter" }
            "4" { 
                if ($TestPair) {
                    foreach ($server in $TestPair.GetEnumerator()) {
                        Enable-JumboFrame -ComputerName $server.Value -Credential $Credential
                    }
                }
                else {
                    Write-Warning "No test pair defined"
                }
                Read-Host "Press Enter"
            }
            "5" {
                if ($TestPair) {
                    $servers = $TestPair.GetEnumerator() | Select-Object -First 2
                    Test-JumboFrameConnectivity -SourceComputer $servers[0].Value -TargetComputer $servers[1].Value -Credential $Credential
                    Test-JumboFrameFileTransfer -SourceComputer $servers[0].Value -TargetComputer $servers[1].Value -Credential $Credential
                }
                Read-Host "Press Enter"
            }
            "6" {
                foreach ($server in $Servers.GetEnumerator()) {
                    Enable-JumboFrame -ComputerName $server.Value -Credential $Credential
                }
                Read-Host "Press Enter"
            }
            "R4" {
                if ($TestPair) {
                    foreach ($server in $TestPair.GetEnumerator()) {
                        Disable-JumboFrame -ComputerName $server.Value -Credential $Credential
                    }
                }
                Read-Host "Press Enter"
            }
            "R6" {
                foreach ($server in $Servers.GetEnumerator()) {
                    Disable-JumboFrame -ComputerName $server.Value -Credential $Credential
                }
                Read-Host "Press Enter"
            }
            "S" {
                Get-JumboFrameStatus -Servers $Servers -Credential $Credential
                Read-Host "Press Enter"
            }
            "Q" { return }
        }
    }
}

function Show-Phase1-SwitchPlan {
    Write-Host @"

╔══════════════════════════════════════════════════════════════════════════════╗
║  PHASE 1: SWITCH CONFIGURATION                                               ║
║  Impact: NONE (switches accept both standard and jumbo)                      ║
║  Performed by: Network Admin                                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝

For Cisco Meraki:
  1. Log into Meraki Dashboard
  2. Navigate to: Switching > Configure > Switch settings
  3. Enable "Jumbo frames" toggle

For Cisco Catalyst:
  1. SSH to switch
  2. Run: system mtu 9198

ROLLBACK: Disable toggle or set MTU back to 1500

"@ -ForegroundColor Cyan
}

function Show-Phase2-HostPlan {
    Write-Host @"

╔══════════════════════════════════════════════════════════════════════════════╗
║  PHASE 2: HYPER-V HOST PHYSICAL NICs                                         ║
║  Impact: BRIEF DISCONNECT (2-5 seconds)                                      ║
║  Performed by: Admin via RDP                                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝

On each Hyper-V host:

1. Check current settings:
   Get-NetAdapter | Where-Object Status -eq 'Up' | Select Name, MtuSize

2. Enable Jumbo Frames:
   Set-NetAdapterAdvancedProperty -Name "Ethernet" -RegistryKeyword "*JumboPacket" -RegistryValue 9014

3. Verify:
   Get-NetAdapter -Name "Ethernet" | Select Name, MtuSize

ROLLBACK:
   Set-NetAdapterAdvancedProperty -Name "Ethernet" -RegistryKeyword "*JumboPacket" -RegistryValue 1514

"@ -ForegroundColor Cyan
}

function Show-Phase3-vSwitchPlan {
    Write-Host @"

╔══════════════════════════════════════════════════════════════════════════════╗
║  PHASE 3: HYPER-V vSWITCH                                                    ║
║  Impact: NONE (inherits from physical NIC)                                   ║
║  Performed by: Admin via RDP                                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝

Verify vSwitch inherited MTU from physical NIC:

   Get-NetAdapter -Name "vEthernet*" | Select Name, MtuSize

If MTU is still 1500, manually configure:
   Get-NetAdapter -Name "vEthernet (External)" | Set-NetAdapterAdvancedProperty -RegistryKeyword "*JumboPacket" -RegistryValue 9014

"@ -ForegroundColor Cyan
}

# ============================================================================
# EXPORTS
# ============================================================================

Export-ModuleMember -Function @(
    'Test-JumboFrameSupport',
    'Get-JumboFrameStatus',
    'Enable-JumboFrame',
    'Disable-JumboFrame',
    'Test-JumboFrameConnectivity',
    'Test-JumboFrameFileTransfer',
    'Start-JumboFrameDeployment'
)
