<#
.SYNOPSIS
    Network infrastructure discovery module for InfraDiscovery framework.

.DESCRIPTION
    Provides functions to discover network infrastructure including:
    - Palo Alto firewalls (routes, interfaces, zones, policies)
    - Network topology mapping
    - VLAN discovery

.NOTES
    Author: InfraDiscovery Framework
    Version: 1.0
#>

#region Configuration
$script:ModuleRoot = $PSScriptRoot
#endregion

#region SSL/TLS Configuration
function Initialize-TLSConfig {
    <#
    .SYNOPSIS
        Configures TLS settings for API calls to network devices with self-signed certificates.
    #>
    if (-not ([System.Management.Automation.PSTypeName]'TrustAllCertsPolicy').Type) {
        Add-Type @"
using System.Net;
using System.Security.Cryptography.X509Certificates;
public class TrustAllCertsPolicy : ICertificatePolicy {
    public bool CheckValidationResult(ServicePoint srvPoint, X509Certificate certificate, WebRequest request, int certificateProblem) { return true; }
}
"@
    }
    [System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCertsPolicy
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
}
#endregion

#region Palo Alto Discovery Functions

<#
.SYNOPSIS
    Retrieves API key from Palo Alto firewall.
#>
function Get-PaloAltoAPIKey {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Firewall,
        
        [Parameter(Mandatory = $true)]
        [System.Management.Automation.PSCredential]$Credential,
        
        [Parameter(Mandatory = $false)]
        [int]$TimeoutSec = 30
    )
    
    $user = $Credential.UserName
    $pass = $Credential.GetNetworkCredential().Password
    $url = "https://$Firewall/api/?type=keygen&user=$user&password=$pass"
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec $TimeoutSec -ErrorAction Stop
        if ($response.response.status -eq "success") {
            return $response.response.result.key
        }
        Write-Warning "API key request returned status: $($response.response.status)"
        return $null
    }
    catch {
        Write-Warning "Failed to get API key from $Firewall : $($_.Exception.Message)"
        return $null
    }
}

<#
.SYNOPSIS
    Invokes a configuration API call on Palo Alto firewall.
#>
function Invoke-PaloAltoConfigAPI {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Firewall,
        
        [Parameter(Mandatory = $true)]
        [string]$APIKey,
        
        [Parameter(Mandatory = $true)]
        [string]$XPath,
        
        [Parameter(Mandatory = $false)]
        [int]$TimeoutSec = 30
    )
    
    $url = "https://$Firewall/api/?type=config&action=get&xpath=$XPath&key=$APIKey"
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec $TimeoutSec -ErrorAction Stop
        return $response.response.result
    }
    catch {
        Write-Warning "Config API call failed: $($_.Exception.Message)"
        return $null
    }
}

<#
.SYNOPSIS
    Invokes an operational command on Palo Alto firewall.
#>
function Invoke-PaloAltoOperationalCmd {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Firewall,
        
        [Parameter(Mandatory = $true)]
        [string]$APIKey,
        
        [Parameter(Mandatory = $true)]
        [string]$Command,
        
        [Parameter(Mandatory = $false)]
        [int]$TimeoutSec = 30
    )
    
    $encodedCmd = [System.Web.HttpUtility]::UrlEncode($Command)
    $url = "https://$Firewall/api/?type=op&cmd=$encodedCmd&key=$APIKey"
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec $TimeoutSec -ErrorAction Stop
        return $response.response.result
    }
    catch {
        Write-Warning "Operational command failed: $($_.Exception.Message)"
        return $null
    }
}

<#
.SYNOPSIS
    Discovers network information from Palo Alto firewalls.

.DESCRIPTION
    Queries Palo Alto API for:
    - System information (hostname, model, version)
    - Network interfaces with IP addresses
    - Routing table
    - Security zones
    - VPN tunnels

.PARAMETER Firewalls
    Array of Palo Alto firewall IP addresses or hostnames.

.PARAMETER Credential
    PSCredential for Palo Alto API authentication.

.EXAMPLE
    $cred = Get-Credential
    Get-PaloAltoDiscovery -Firewalls @("10.0.0.1", "10.0.0.2") -Credential $cred
#>
function Get-PaloAltoDiscovery {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Firewalls,
        
        [Parameter(Mandatory = $true)]
        [System.Management.Automation.PSCredential]$Credential
    )
    
    Write-Host "  Discovering Palo Alto Firewalls..." -ForegroundColor Cyan
    
    # Initialize TLS for self-signed certs
    Initialize-TLSConfig
    
    $networkData = @{
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Firewalls = @()
        Summary   = @{
            TotalFirewalls    = 0
            OnlineFirewalls   = 0
            TotalInterfaces   = 0
            TotalRoutes       = 0
            TotalZones        = 0
            TotalVPNTunnels   = 0
        }
    }
    
    foreach ($fw in $Firewalls) {
        Write-Host "    Querying $fw..." -ForegroundColor Gray
        
        $apiKey = Get-PaloAltoAPIKey -Firewall $fw -Credential $Credential
        
        if (-not $apiKey) {
            Write-Host "      ✗ Authentication failed" -ForegroundColor Red
            $networkData.Firewalls += @{
                IP     = $fw
                Online = $false
                Error  = "Authentication failed"
            }
            continue
        }
        
        Write-Host "      ✓ Authenticated" -ForegroundColor Green
        
        $fwData = @{
            IP         = $fw
            Online     = $true
            SystemInfo = @{}
            Interfaces = @()
            Routes     = @()
            Zones      = @()
            VPNTunnels = @()
        }
        
        # Get system info
        $sysInfo = Invoke-PaloAltoOperationalCmd -Firewall $fw -APIKey $apiKey -Command "<show><system><info></info></system></show>"
        if ($sysInfo) {
            $fwData.SystemInfo = @{
                Hostname      = $sysInfo.system.hostname
                Model         = $sysInfo.system.model
                SerialNumber  = $sysInfo.system.'serial'
                SoftwareVersion = $sysInfo.system.'sw-version'
                AppVersion    = $sysInfo.system.'app-version'
                ThreatVersion = $sysInfo.system.'threat-version'
                Uptime        = $sysInfo.system.uptime
                IPAddress     = $sysInfo.system.'ip-address'
            }
            Write-Host "      Hostname: $($fwData.SystemInfo.Hostname)" -ForegroundColor White
        }
        
        # Get interfaces
        $interfaces = Invoke-PaloAltoOperationalCmd -Firewall $fw -APIKey $apiKey -Command "<show><interface>all</interface></show>"
        if ($interfaces -and $interfaces.ifnet.entry) {
            $interfaces.ifnet.entry | ForEach-Object {
                if ($_.ip -or $_.name -like "ethernet*" -or $_.name -like "ae*" -or $_.name -like "tunnel*") {
                    $fwData.Interfaces += @{
                        Name    = $_.name
                        IP      = $_.ip
                        Zone    = $_.zone
                        Status  = $_.status
                        MAC     = $_.mac
                        Speed   = $_.speed
                    }
                }
            }
            Write-Host "      Found $($fwData.Interfaces.Count) interfaces" -ForegroundColor White
        }
        
        # Get routing table
        $routes = Invoke-PaloAltoOperationalCmd -Firewall $fw -APIKey $apiKey -Command "<show><routing><route></route></routing></show>"
        if ($routes -and $routes.entry) {
            $routes.entry | ForEach-Object {
                $fwData.Routes += @{
                    Destination = $_.destination
                    NextHop     = $_.nexthop
                    Interface   = $_.interface
                    Metric      = $_.metric
                    Flags       = $_.flags
                    Age         = $_.age
                }
            }
            Write-Host "      Found $($fwData.Routes.Count) routes" -ForegroundColor White
        }
        
        # Get zones
        $zones = Invoke-PaloAltoConfigAPI -Firewall $fw -APIKey $apiKey -XPath "/config/devices/entry/vsys/entry/zone"
        if ($zones -and $zones.zone.entry) {
            $zones.zone.entry | ForEach-Object {
                $fwData.Zones += @{
                    Name       = $_.name
                    Interfaces = @($_.network.layer3.member)
                    Type       = if ($_.network.layer3) { "Layer3" } elseif ($_.network.layer2) { "Layer2" } else { "Unknown" }
                }
            }
            Write-Host "      Found $($fwData.Zones.Count) zones" -ForegroundColor White
        }
        
        # Identify VPN tunnels from interfaces
        $fwData.VPNTunnels = $fwData.Interfaces | Where-Object { $_.Name -like "tunnel*" } | ForEach-Object {
            @{
                Interface = $_.Name
                IP        = $_.IP
                Zone      = $_.Zone
                Status    = $_.Status
            }
        }
        
        if ($fwData.VPNTunnels.Count -gt 0) {
            Write-Host "      Found $($fwData.VPNTunnels.Count) VPN tunnels" -ForegroundColor White
        }
        
        $networkData.Firewalls += $fwData
        
        # Update summary
        $networkData.Summary.OnlineFirewalls++
        $networkData.Summary.TotalInterfaces += $fwData.Interfaces.Count
        $networkData.Summary.TotalRoutes += $fwData.Routes.Count
        $networkData.Summary.TotalZones += $fwData.Zones.Count
        $networkData.Summary.TotalVPNTunnels += $fwData.VPNTunnels.Count
    }
    
    $networkData.Summary.TotalFirewalls = $Firewalls.Count
    
    # Summary output
    Write-Host "    ✓ Palo Alto Discovery Complete" -ForegroundColor Green
    Write-Host "      Firewalls: $($networkData.Summary.OnlineFirewalls)/$($networkData.Summary.TotalFirewalls) online" -ForegroundColor White
    Write-Host "      Interfaces: $($networkData.Summary.TotalInterfaces), Routes: $($networkData.Summary.TotalRoutes), Zones: $($networkData.Summary.TotalZones)" -ForegroundColor White
    
    return $networkData
}

<#
.SYNOPSIS
    Main network discovery orchestrator.

.DESCRIPTION
    Discovers network infrastructure based on environment configuration.
    Currently supports Palo Alto firewalls with plans to expand to:
    - Cisco devices
    - Fortinet firewalls
    - Generic SNMP discovery

.PARAMETER Environment
    The environment name from configuration.

.PARAMETER Credential
    PSCredential for network device authentication.

.PARAMETER DeviceType
    Type of device to discover: PaloAlto, All

.EXAMPLE
    Start-NetworkDiscovery -Environment "CustomerA" -DeviceType PaloAlto
#>
function Start-NetworkDiscovery {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Environment,
        
        [Parameter(Mandatory = $false)]
        [System.Management.Automation.PSCredential]$Credential,
        
        [Parameter(Mandatory = $false)]
        [ValidateSet('PaloAlto', 'All')]
        [string]$DeviceType = 'All'
    )
    
    Write-Host "`n=== Network Infrastructure Discovery ===" -ForegroundColor Cyan
    
    # Load environment config
    $configPath = Join-Path $PSScriptRoot "..\Config\environments.json"
    if (-not (Test-Path $configPath)) {
        Write-Error "Configuration file not found: $configPath"
        return $null
    }
    
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
    $envConfig = $config.environments.$Environment
    
    if (-not $envConfig) {
        Write-Error "Environment '$Environment' not found in configuration."
        return $null
    }
    
    $results = @{
        Environment   = $Environment
        DiscoveryDate = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        PaloAlto      = $null
        Networks      = @()
    }
    
    # Palo Alto Discovery
    if (($DeviceType -eq 'PaloAlto' -or $DeviceType -eq 'All') -and $envConfig.networkDevices.paloAlto) {
        $paConfig = $envConfig.networkDevices.paloAlto
        
        # Get credentials
        if (-not $Credential) {
            $credPath = Join-Path $PSScriptRoot "..\Credentials\$Environment-paloalto.xml"
            if (Test-Path $credPath) {
                $Credential = Import-Clixml $credPath
                Write-Host "  Loaded Palo Alto credentials from file" -ForegroundColor Gray
            }
            else {
                Write-Host "  Enter Palo Alto credentials:" -ForegroundColor Yellow
                $Credential = Get-Credential -Message "Palo Alto API credentials"
            }
        }
        
        if ($Credential -and $paConfig.firewalls) {
            $results.PaloAlto = Get-PaloAltoDiscovery -Firewalls $paConfig.firewalls -Credential $Credential
            
            # Extract unique networks from routes
            $results.Networks = $results.PaloAlto.Firewalls | ForEach-Object {
                $_.Routes | Where-Object { $_.Destination -ne "0.0.0.0/0" }
            } | Select-Object -ExpandProperty Destination -Unique | Sort-Object
        }
    }
    
    # Save results
    $dataPath = Join-Path $PSScriptRoot "..\Environments\$Environment\Data"
    if (-not (Test-Path $dataPath)) {
        New-Item -Path $dataPath -ItemType Directory -Force | Out-Null
    }
    
    $outputFile = Join-Path $dataPath "network-discovery-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    $latestFile = Join-Path $dataPath "network-discovery-latest.json"
    
    $results | ConvertTo-Json -Depth 10 | Out-File $outputFile -Encoding UTF8
    $results | ConvertTo-Json -Depth 10 | Out-File $latestFile -Encoding UTF8
    
    Write-Host "`n✓ Network discovery saved to: $outputFile" -ForegroundColor Green
    
    return $results
}

#endregion

#region Credential Management for Network Devices

<#
.SYNOPSIS
    Saves Palo Alto credentials for an environment.
#>
function Set-PaloAltoCredential {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Environment,
        
        [Parameter(Mandatory = $false)]
        [System.Management.Automation.PSCredential]$Credential
    )
    
    if (-not $Credential) {
        $Credential = Get-Credential -Message "Enter Palo Alto API credentials for $Environment"
    }
    
    $credPath = Join-Path $PSScriptRoot "..\Credentials\$Environment-paloalto.xml"
    $credDir = Split-Path $credPath -Parent
    
    if (-not (Test-Path $credDir)) {
        New-Item -Path $credDir -ItemType Directory -Force | Out-Null
    }
    
    $Credential | Export-Clixml $credPath
    Write-Host "✓ Palo Alto credentials saved for '$Environment'" -ForegroundColor Green
}

<#
.SYNOPSIS
    Retrieves Palo Alto credentials for an environment.
#>
function Get-PaloAltoCredential {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Environment
    )
    
    $credPath = Join-Path $PSScriptRoot "..\Credentials\$Environment-paloalto.xml"
    
    if (Test-Path $credPath) {
        return Import-Clixml $credPath
    }
    
    return $null
}

#endregion

# Export functions
Export-ModuleMember -Function @(
    'Get-PaloAltoDiscovery',
    'Start-NetworkDiscovery',
    'Set-PaloAltoCredential',
    'Get-PaloAltoCredential',
    'Get-PaloAltoAPIKey',
    'Invoke-PaloAltoConfigAPI',
    'Invoke-PaloAltoOperationalCmd'
)
