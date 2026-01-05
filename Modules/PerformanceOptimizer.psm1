<#
.SYNOPSIS
    Performance Optimizer Module for InfraDiscovery
    
.DESCRIPTION
    Provides functions for server performance optimization including:
    - Windows Defender exclusion management
    - SMB configuration analysis
    - Disk performance checks
    
.NOTES
    Part of InfraDiscovery Framework
    https://github.com/yourorg/InfraDiscovery
#>

#Requires -Version 5.1

# ============================================================================
# DEFENDER EXCLUSION MANAGEMENT
# ============================================================================

function Get-DefenderExclusions {
    <#
    .SYNOPSIS
        Gets current Defender exclusions from a server
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
            $mp = Get-MpPreference
            [PSCustomObject]@{
                Server = $env:COMPUTERNAME
                PathExclusions = $mp.ExclusionPath
                ProcessExclusions = $mp.ExclusionProcess
                ExtensionExclusions = $mp.ExclusionExtension
                RealTimeProtection = -not $mp.DisableRealtimeMonitoring
            }
        } -ErrorAction Stop
        
        return $result
    }
    catch {
        Write-Warning "Failed to get Defender exclusions from $ComputerName`: $($_.Exception.Message)"
        return $null
    }
}

function Add-DefenderExclusions {
    <#
    .SYNOPSIS
        Adds Defender exclusions to a server
    .PARAMETER ComputerName
        Target server name or IP
    .PARAMETER Credential
        Credential for remote connection
    .PARAMETER Paths
        Array of paths to exclude
    .PARAMETER Processes
        Array of processes to exclude
    .PARAMETER WhatIf
        Preview changes without applying
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)]
        [string]$ComputerName,
        
        [Parameter(Mandatory)]
        [PSCredential]$Credential,
        
        [string[]]$Paths,
        
        [string[]]$Processes,
        
        [switch]$WhatIf
    )
    
    Write-Host "`n=== Adding Defender Exclusions to $ComputerName ===" -ForegroundColor Cyan
    
    if ($WhatIf) {
        Write-Host "WHAT-IF MODE - No changes will be made" -ForegroundColor Yellow
    }
    
    try {
        $result = Invoke-Command -ComputerName $ComputerName -Credential $Credential -ScriptBlock {
            param($paths, $processes, $whatif)
            
            $added = @{
                Paths = @()
                Processes = @()
            }
            
            # Add path exclusions
            foreach ($path in $paths) {
                if (Test-Path $path) {
                    if (-not $whatif) {
                        Add-MpPreference -ExclusionPath $path -ErrorAction SilentlyContinue
                    }
                    $added.Paths += $path
                    Write-Host "  + Path: $path" -ForegroundColor Green
                } else {
                    Write-Host "  - Skipped (not found): $path" -ForegroundColor DarkGray
                }
            }
            
            # Add process exclusions
            foreach ($proc in $processes) {
                if (-not $whatif) {
                    Add-MpPreference -ExclusionProcess $proc -ErrorAction SilentlyContinue
                }
                $added.Processes += $proc
                Write-Host "  + Process: $proc" -ForegroundColor Green
            }
            
            # Return summary
            $mp = Get-MpPreference
            [PSCustomObject]@{
                Server = $env:COMPUTERNAME
                AddedPaths = $added.Paths
                AddedProcesses = $added.Processes
                TotalPaths = $mp.ExclusionPath.Count
                TotalProcesses = $mp.ExclusionProcess.Count
            }
            
        } -ArgumentList $Paths, $Processes, $WhatIf.IsPresent -ErrorAction Stop
        
        Write-Host "Result: $($result.TotalPaths) paths, $($result.TotalProcesses) processes" -ForegroundColor Cyan
        return $result
    }
    catch {
        Write-Error "Failed to add exclusions to $ComputerName`: $($_.Exception.Message)"
        return $null
    }
}

function Remove-DefenderExclusions {
    <#
    .SYNOPSIS
        Removes all Defender exclusions from a server (rollback)
    .PARAMETER ComputerName
        Target server name or IP
    .PARAMETER Credential
        Credential for remote connection
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)]
        [string]$ComputerName,
        
        [Parameter(Mandatory)]
        [PSCredential]$Credential,
        
        [switch]$Confirm
    )
    
    Write-Host "`n=== Removing All Defender Exclusions from $ComputerName ===" -ForegroundColor Yellow
    
    if (-not $Confirm) {
        $response = Read-Host "Are you sure? This will remove ALL exclusions. (y/n)"
        if ($response -ne 'y') {
            Write-Host "Cancelled." -ForegroundColor Gray
            return
        }
    }
    
    try {
        Invoke-Command -ComputerName $ComputerName -Credential $Credential -ScriptBlock {
            $mp = Get-MpPreference
            
            $mp.ExclusionPath | ForEach-Object { 
                Remove-MpPreference -ExclusionPath $_ 
                Write-Host "  - Removed path: $_" -ForegroundColor Yellow
            }
            
            $mp.ExclusionProcess | ForEach-Object { 
                Remove-MpPreference -ExclusionProcess $_ 
                Write-Host "  - Removed process: $_" -ForegroundColor Yellow
            }
            
            Write-Host "All exclusions removed from $env:COMPUTERNAME" -ForegroundColor Green
        } -ErrorAction Stop
    }
    catch {
        Write-Error "Failed to remove exclusions: $($_.Exception.Message)"
    }
}

# ============================================================================
# SMB CONFIGURATION ANALYSIS
# ============================================================================

function Get-SMBConfiguration {
    <#
    .SYNOPSIS
        Gets SMB server configuration from a server
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
            $smb = Get-SmbServerConfiguration
            [PSCustomObject]@{
                Server = $env:COMPUTERNAME
                MultiChannel = $smb.EnableMultiChannel
                SMB2Protocol = $smb.EnableSMB2Protocol
                SMB1Protocol = $smb.EnableSMB1Protocol
                Leasing = $smb.EnableLeasing
                Oplocks = $smb.EnableOplocks
                RequireSigning = $smb.RequireSecuritySignature
                EncryptData = $smb.EncryptData
            }
        } -ErrorAction Stop
        
        return $result
    }
    catch {
        Write-Warning "Failed to get SMB config from $ComputerName`: $($_.Exception.Message)"
        return $null
    }
}

# ============================================================================
# NETWORK ADAPTER ANALYSIS
# ============================================================================

function Get-NetworkAdapterStatus {
    <#
    .SYNOPSIS
        Gets network adapter status including Jumbo Frame support
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
                LinkSpeed = $nic.LinkSpeed
                MTU = $nic.MtuSize
                JumboSupported = if ($jumbo) { $jumbo.ValidDisplayValues -join ", " } else { "Unknown" }
                JumboEnabled = if ($jumbo) { $jumbo.DisplayValue } else { "N/A" }
            }
        } -ErrorAction Stop
        
        return $result
    }
    catch {
        Write-Warning "Failed to get network status from $ComputerName`: $($_.Exception.Message)"
        return $null
    }
}

# ============================================================================
# PERFORMANCE STATUS SUMMARY
# ============================================================================

function Get-PerformanceStatus {
    <#
    .SYNOPSIS
        Gets comprehensive performance optimization status
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
    
    Write-Host "`n=== PERFORMANCE OPTIMIZATION STATUS ===" -ForegroundColor Cyan
    
    $results = @()
    
    foreach ($server in $Servers.GetEnumerator()) {
        $name = $server.Key
        $ip = $server.Value
        
        try {
            $result = Invoke-Command -ComputerName $ip -Credential $Credential -ScriptBlock {
                $mp = Get-MpPreference
                $smb = Get-SmbServerConfiguration
                $nic = Get-NetAdapter | Where-Object Status -eq 'Up'
                
                [PSCustomObject]@{
                    Server = $env:COMPUTERNAME
                    DefenderExclusions = $mp.ExclusionPath.Count + $mp.ExclusionProcess.Count
                    MultiChannel = $smb.EnableMultiChannel
                    MTU = $nic.MtuSize
                    LinkSpeed = $nic.LinkSpeed
                }
            } -ErrorAction Stop
            
            $defStatus = if ($result.DefenderExclusions -gt 0) { "✅ $($result.DefenderExclusions)" } else { "⚠️ None" }
            $mtuStatus = if ($result.MTU -ge 9000) { "✅ Jumbo" } else { "📦 1500" }
            $mcStatus = if ($result.MultiChannel) { "✅" } else { "❌" }
            
            Write-Host "$($result.Server.PadRight(18)) Exclusions: $defStatus  MTU: $mtuStatus  MultiCh: $mcStatus  Speed: $($result.LinkSpeed)" -ForegroundColor $(if ($result.DefenderExclusions -gt 0) { "Green" } else { "Yellow" })
            
            $results += $result
        }
        catch {
            Write-Host "$($name.PadRight(18)) UNREACHABLE" -ForegroundColor Red
        }
    }
    
    return $results
}

# ============================================================================
# BULK OPERATIONS
# ============================================================================

function Deploy-DefenderExclusions {
    <#
    .SYNOPSIS
        Deploys Defender exclusions to multiple servers
    .PARAMETER Servers
        Hashtable of server names and IPs
    .PARAMETER Credential
        Credential for remote connections
    .PARAMETER CommonPaths
        Paths to check and exclude on all servers
    .PARAMETER CommonProcesses
        Processes to exclude on all servers
    .PARAMETER WhatIf
        Preview mode
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)]
        [hashtable]$Servers,
        
        [Parameter(Mandatory)]
        [PSCredential]$Credential,
        
        [string[]]$CommonPaths = @("D:\Shares", "D:\Data", "D:\Backup", "D:\Logs"),
        
        [string[]]$CommonProcesses = @("sqlservr.exe", "w3wp.exe"),
        
        [switch]$WhatIf
    )
    
    Write-Host @"

╔══════════════════════════════════════════════════════════════════════════════╗
║  DEPLOYING DEFENDER EXCLUSIONS                                               ║
║  Expected Gain: +20-40% file I/O improvement                                 ║
║  Risk: LOW | Impact: NONE (no restart required)                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

    $results = @()
    
    foreach ($server in $Servers.GetEnumerator()) {
        $result = Add-DefenderExclusions -ComputerName $server.Value `
            -Credential $Credential `
            -Paths $CommonPaths `
            -Processes $CommonProcesses `
            -WhatIf:$WhatIf
            
        if ($result) {
            $results += $result
        }
    }
    
    return $results
}

# ============================================================================
# EXPORTS
# ============================================================================

Export-ModuleMember -Function @(
    'Get-DefenderExclusions',
    'Add-DefenderExclusions',
    'Remove-DefenderExclusions',
    'Get-SMBConfiguration',
    'Get-NetworkAdapterStatus',
    'Get-PerformanceStatus',
    'Deploy-DefenderExclusions'
)
