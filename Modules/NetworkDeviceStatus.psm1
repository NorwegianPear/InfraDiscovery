
<#
.SYNOPSIS
    Network Device Status module for InfraDiscovery framework.

.DESCRIPTION
    Provides functions to collect live status from network devices including:
    - Palo Alto firewalls (via REST API)
    - Meraki switches (via Dashboard API)
    - Windows server services

.NOTES
    Author: InfraDiscovery Framework
    Version: 1.0
#>

#region Palo Alto Functions

function Get-PaloAltoStatus {
    <#
    .SYNOPSIS
        Retrieves live status from a Palo Alto firewall.
    .PARAMETER FirewallIP
        IP address of the Palo Alto firewall
    .PARAMETER Credential
        PSCredential for API authentication
    .EXAMPLE
        $cred = Get-Credential
        Get-PaloAltoStatus -FirewallIP "10.0.0.1" -Credential $cred
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FirewallIP,

        [Parameter(Mandatory)]
        [PSCredential]$Credential
    )

    try {
        # Get API key
        $user = $Credential.UserName
        $pass = $Credential.GetNetworkCredential().Password
        $keyUri = "https://$FirewallIP/api/?type=keygen&user=$user&password=$pass"
        
        $keyResponse = Invoke-RestMethod -Uri $keyUri -Method Get -SkipCertificateCheck
        $apiKey = $keyResponse.response.result.key

        # Get system info
        $sysUri = "https://$FirewallIP/api/?type=op&cmd=<show><system><info></info></system></show>&key=$apiKey"
        $sysInfo = Invoke-RestMethod -Uri $sysUri -Method Get -SkipCertificateCheck

        # Get session info
        $sessionUri = "https://$FirewallIP/api/?type=op&cmd=<show><session><info></info></session></show>&key=$apiKey"
        $sessionInfo = Invoke-RestMethod -Uri $sessionUri -Method Get -SkipCertificateCheck

        # Get HA status
        $haUri = "https://$FirewallIP/api/?type=op&cmd=<show><high-availability><state></state></high-availability></show>&key=$apiKey"
        $haInfo = Invoke-RestMethod -Uri $haUri -Method Get -SkipCertificateCheck -ErrorAction SilentlyContinue

        # Get VPN tunnels
        $vpnUri = "https://$FirewallIP/api/?type=op&cmd=<show><vpn><ipsec-sa></ipsec-sa></vpn></show>&key=$apiKey"
        $vpnInfo = Invoke-RestMethod -Uri $vpnUri -Method Get -SkipCertificateCheck -ErrorAction SilentlyContinue

        # Parse data
        $sys = $sysInfo.response.result.system
        $sess = $sessionInfo.response.result

        return @{
            Status = "Online"
            IP = $FirewallIP
            Hostname = $sys.hostname
            Model = $sys.model
            Serial = $sys.'serial'
            SWVersion = $sys.'sw-version'
            Uptime = $sys.uptime
            SessionsCurrent = [int]$sess.'num-active'
            SessionsMax = [int]$sess.'num-max'
            ThroughputKbps = [int]$sess.'kbps'
            PacketsPerSec = [int]$sess.'pps'
            HAStatus = if ($haInfo) { $haInfo.response.result.group.'local-info'.state } else { "standalone" }
            VPNTunnels = if ($vpnInfo) { ($vpnInfo.response.result.entries.entry | Measure-Object).Count } else { 0 }
        }
    }
    catch {
        return @{
            Status = "Error"
            IP = $FirewallIP
            Error = $_.Exception.Message
        }
    }
}

#endregion

#region Server Services Functions

function Get-ServerServices {
    <#
    .SYNOPSIS
        Retrieves critical service status from a Windows server.
    .PARAMETER ComputerName
        Server name or IP address
    .PARAMETER ServerType
        Type of server (DC, SQL, Hyper-V, FileServer, PrintServer, Application)
    .PARAMETER Credential
        PSCredential for remote access
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ComputerName,

        [Parameter()]
        [ValidateSet('DC', 'SQL', 'Hyper-V', 'FileServer', 'PrintServer', 'Application', 'Server')]
        [string]$ServerType = 'Server',

        [Parameter()]
        [PSCredential]$Credential
    )

    # Define services by type
    $baseServices = @('W32Time', 'Netlogon', 'WinRM', 'EventLog')
    $criticalServices = switch ($ServerType) {
        'DC' { @('NTDS', 'DNS', 'kdc', 'DFSR') + $baseServices }
        'SQL' { @('MSSQLSERVER', 'SQLSERVERAGENT') + $baseServices }
        'Hyper-V' { @('vmms', 'vmcompute') + $baseServices }
        'FileServer' { @('LanmanServer') + $baseServices }
        'PrintServer' { @('Spooler') + $baseServices }
        'Application' { @('W3SVC', 'WAS') + $baseServices }
        default { $baseServices }
    }

    try {
        $params = @{
            ComputerName = $ComputerName
            ErrorAction = 'Stop'
        }
        if ($Credential) { $params.Credential = $Credential }

        $services = Invoke-Command @params -ScriptBlock {
            param($svcNames)
            Get-Service -Name $svcNames -ErrorAction SilentlyContinue | 
                Select-Object Name, DisplayName, Status, StartType
        } -ArgumentList (,$criticalServices)

        return $services
    }
    catch {
        return @()
    }
}

#endregion

#region Meraki Functions

function Get-MerakiSwitchStatus {
    <#
    .SYNOPSIS
        Retrieves status from Meraki switches via Dashboard API.
    .PARAMETER ApiKey
        Meraki Dashboard API key
    .PARAMETER NetworkId
        Meraki network ID
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ApiKey,

        [Parameter(Mandatory)]
        [string]$NetworkId
    )

    $headers = @{
        'X-Cisco-Meraki-API-Key' = $ApiKey
        'Content-Type' = 'application/json'
    }

    try {
        $devicesUri = "https://api.meraki.com/api/v1/networks/$NetworkId/devices"
        $devices = Invoke-RestMethod -Uri $devicesUri -Headers $headers -Method Get

        $switches = $devices | Where-Object { $_.model -like 'MS*' }

        $results = foreach ($switch in $switches) {
            @{
                Name = $switch.name
                Serial = $switch.serial
                Model = $switch.model
                Status = $switch.status
                Firmware = $switch.firmware
                LanIP = $switch.lanIp
            }
        }

        return $results
    }
    catch {
        return @{ Error = $_.Exception.Message }
    }
}

#endregion

Export-ModuleMember -Function Get-PaloAltoStatus, Get-ServerServices, Get-MerakiSwitchStatus
