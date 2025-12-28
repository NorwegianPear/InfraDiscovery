<#
.SYNOPSIS
    Infrastructure discovery module for InfraDiscovery framework.

.DESCRIPTION
    Provides functions to discover and document Windows infrastructure
    including AD, DNS, DHCP, servers, workstations, PKI, IIS, and more.

.NOTES
    Author: InfraDiscovery Framework
    Version: 1.0
#>

#region Configuration
$script:ModuleRoot = $PSScriptRoot
$script:ConfigPath = Join-Path $PSScriptRoot "..\Config\environments.json"
#endregion

#region Helper Functions
function Get-EnvironmentConfig {
    param([string]$Environment)
    
    if (-not (Test-Path $script:ConfigPath)) {
        throw "Configuration file not found: $script:ConfigPath"
    }
    
    $config = Get-Content $script:ConfigPath -Raw | ConvertFrom-Json
    
    if (-not $config.environments.$Environment) {
        throw "Environment '$Environment' not found in configuration."
    }
    
    return $config.environments.$Environment
}

function Get-EnvironmentDataPath {
    param([string]$Environment)
    
    $basePath = Join-Path $PSScriptRoot "..\Environments\$Environment\Data"
    
    if (-not (Test-Path $basePath)) {
        New-Item -Path $basePath -ItemType Directory -Force | Out-Null
    }
    
    return $basePath
}

function Write-DiscoveryProgress {
    param(
        [string]$Activity,
        [string]$Status,
        [int]$PercentComplete
    )
    
    Write-Progress -Activity $Activity -Status $Status -PercentComplete $PercentComplete
    Write-Host "  [$($PercentComplete.ToString().PadLeft(3))%] $Status" -ForegroundColor Gray
}
#endregion

#region Discovery Functions

<#
.SYNOPSIS
    Discovers Active Directory forest and domain information.
#>
function Get-ADDiscovery {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [System.Management.Automation.PSCredential]$Credential,
        
        [Parameter(Mandatory = $true)]
        [string]$DomainController
    )
    
    Write-Host "  Discovering Active Directory..." -ForegroundColor Cyan
    
    try {
        $adInfo = Invoke-Command -ComputerName $DomainController -Credential $Credential -ScriptBlock {
            Import-Module ActiveDirectory -ErrorAction SilentlyContinue
            
            $forest = Get-ADForest
            $domain = Get-ADDomain
            $dcs = Get-ADDomainController -Filter *
            $sites = Get-ADReplicationSite -Filter *
            $ous = Get-ADOrganizationalUnit -Filter * -Properties Description, Created
            $gpos = Get-GPO -All | Select-Object DisplayName, Id, CreationTime, ModificationTime, GpoStatus
            $trusts = Get-ADTrust -Filter * -ErrorAction SilentlyContinue
            
            # Get computer counts
            $serverCount = (Get-ADComputer -Filter 'OperatingSystem -like "*Server*"').Count
            $workstationCount = (Get-ADComputer -Filter 'OperatingSystem -notlike "*Server*" -and OperatingSystem -like "*Windows*"').Count
            $userCount = (Get-ADUser -Filter *).Count
            $groupCount = (Get-ADGroup -Filter *).Count
            
            @{
                Forest = @{
                    Name               = $forest.Name
                    ForestMode         = $forest.ForestMode.ToString()
                    RootDomain         = $forest.RootDomain
                    Domains            = $forest.Domains
                    GlobalCatalogs     = $forest.GlobalCatalogs
                    SchemaMaster       = $forest.SchemaMaster
                    DomainNamingMaster = $forest.DomainNamingMaster
                }
                Domain = @{
                    Name               = $domain.Name
                    DNSRoot            = $domain.DNSRoot
                    NetBIOSName        = $domain.NetBIOSName
                    DomainMode         = $domain.DomainMode.ToString()
                    PDCEmulator        = $domain.PDCEmulator
                    RIDMaster          = $domain.RIDMaster
                    InfrastructureMaster = $domain.InfrastructureMaster
                }
                DomainControllers = $dcs | ForEach-Object {
                    @{
                        Name            = $_.Name
                        HostName        = $_.HostName
                        IPv4Address     = $_.IPv4Address
                        Site            = $_.Site
                        IsGlobalCatalog = $_.IsGlobalCatalog
                        IsReadOnly      = $_.IsReadOnly
                        OperatingSystem = $_.OperatingSystem
                        Roles           = $_.OperationMasterRoles
                    }
                }
                Sites = $sites | ForEach-Object {
                    @{
                        Name        = $_.Name
                        Description = $_.Description
                    }
                }
                OrganizationalUnits = $ous | ForEach-Object {
                    @{
                        Name            = $_.Name
                        DistinguishedName = $_.DistinguishedName
                        Description     = $_.Description
                        Created         = $_.Created.ToString("yyyy-MM-dd")
                    }
                }
                GroupPolicies = $gpos
                Trusts = $trusts | ForEach-Object {
                    @{
                        Name      = $_.Name
                        Source    = $_.Source
                        Target    = $_.Target
                        Direction = $_.Direction.ToString()
                        TrustType = $_.TrustType.ToString()
                    }
                }
                Statistics = @{
                    ServerCount      = $serverCount
                    WorkstationCount = $workstationCount
                    UserCount        = $userCount
                    GroupCount       = $groupCount
                    OUCount          = $ous.Count
                    GPOCount         = $gpos.Count
                    DCCount          = $dcs.Count
                    SiteCount        = $sites.Count
                }
            }
        } -ErrorAction Stop
        
        Write-Host "    ✓ Forest: $($adInfo.Forest.Name)" -ForegroundColor Green
        Write-Host "    ✓ Domain Controllers: $($adInfo.DomainControllers.Count)" -ForegroundColor Green
        Write-Host "    ✓ Users: $($adInfo.Statistics.UserCount), Groups: $($adInfo.Statistics.GroupCount)" -ForegroundColor Green
        
        return $adInfo
    }
    catch {
        Write-Warning "AD Discovery failed: $_"
        return $null
    }
}

<#
.SYNOPSIS
    Discovers DNS zones and configuration.
#>
function Get-DNSDiscovery {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [System.Management.Automation.PSCredential]$Credential,
        
        [Parameter(Mandatory = $true)]
        [string[]]$DNSServers
    )
    
    Write-Host "  Discovering DNS..." -ForegroundColor Cyan
    
    $dnsInfo = @{
        Servers = @()
        Zones   = @()
    }
    
    foreach ($server in $DNSServers) {
        try {
            $serverData = Invoke-Command -ComputerName $server -Credential $Credential -ScriptBlock {
                $zones = Get-DnsServerZone | Where-Object { $_.ZoneType -ne 'Forwarder' }
                
                $zoneDetails = foreach ($zone in $zones) {
                    $records = Get-DnsServerResourceRecord -ZoneName $zone.ZoneName -ErrorAction SilentlyContinue
                    
                    @{
                        ZoneName     = $zone.ZoneName
                        ZoneType     = $zone.ZoneType.ToString()
                        IsReverseLookupZone = $zone.IsReverseLookupZone
                        IsDsIntegrated = $zone.IsDsIntegrated
                        RecordCount  = $records.Count
                        ARecords     = ($records | Where-Object RecordType -eq 'A').Count
                        CNAMERecords = ($records | Where-Object RecordType -eq 'CNAME').Count
                        MXRecords    = ($records | Where-Object RecordType -eq 'MX').Count
                        SRVRecords   = ($records | Where-Object RecordType -eq 'SRV').Count
                    }
                }
                
                $forwarders = (Get-DnsServerForwarder).IPAddress.IPAddressToString
                
                @{
                    ServerName = $env:COMPUTERNAME
                    Zones      = $zoneDetails
                    Forwarders = $forwarders
                }
            } -ErrorAction Stop
            
            $dnsInfo.Servers += $serverData
            $dnsInfo.Zones += $serverData.Zones
            
            Write-Host "    ✓ $server`: $($serverData.Zones.Count) zones" -ForegroundColor Green
        }
        catch {
            Write-Warning "DNS Discovery failed for $server`: $_"
        }
    }
    
    # Remove duplicate zones
    $dnsInfo.Zones = $dnsInfo.Zones | Sort-Object ZoneName -Unique
    
    return $dnsInfo
}

<#
.SYNOPSIS
    Discovers DHCP scopes and configuration.
#>
function Get-DHCPDiscovery {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [System.Management.Automation.PSCredential]$Credential,
        
        [Parameter(Mandatory = $true)]
        [string[]]$DHCPServers
    )
    
    Write-Host "  Discovering DHCP..." -ForegroundColor Cyan
    
    $dhcpInfo = @{
        Servers = @()
        Scopes  = @()
    }
    
    foreach ($server in $DHCPServers) {
        try {
            $serverData = Invoke-Command -ComputerName $server -Credential $Credential -ScriptBlock {
                $scopes = Get-DhcpServerv4Scope
                
                $scopeDetails = foreach ($scope in $scopes) {
                    $stats = Get-DhcpServerv4ScopeStatistics -ScopeId $scope.ScopeId
                    $options = Get-DhcpServerv4OptionValue -ScopeId $scope.ScopeId -ErrorAction SilentlyContinue
                    
                    @{
                        ScopeId      = $scope.ScopeId.ToString()
                        Name         = $scope.Name
                        Description  = $scope.Description
                        State        = $scope.State.ToString()
                        StartRange   = $scope.StartRange.ToString()
                        EndRange     = $scope.EndRange.ToString()
                        SubnetMask   = $scope.SubnetMask.ToString()
                        LeaseDuration = $scope.LeaseDuration.ToString()
                        Free         = $stats.Free
                        InUse        = $stats.InUse
                        Reserved     = $stats.Reserved
                        PercentInUse = $stats.PercentageInUse
                        Router       = ($options | Where-Object OptionId -eq 3).Value
                        DNSServers   = ($options | Where-Object OptionId -eq 6).Value
                    }
                }
                
                @{
                    ServerName = $env:COMPUTERNAME
                    Scopes     = $scopeDetails
                }
            } -ErrorAction Stop
            
            $dhcpInfo.Servers += $serverData
            $dhcpInfo.Scopes += $serverData.Scopes
            
            Write-Host "    ✓ $server`: $($serverData.Scopes.Count) scopes" -ForegroundColor Green
        }
        catch {
            Write-Warning "DHCP Discovery failed for $server`: $_"
        }
    }
    
    return $dhcpInfo
}

<#
.SYNOPSIS
    Discovers servers and their roles.
#>
function Get-ServerDiscovery {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [System.Management.Automation.PSCredential]$Credential,
        
        [Parameter(Mandatory = $true)]
        [string]$DomainController
    )
    
    Write-Host "  Discovering Servers..." -ForegroundColor Cyan
    
    try {
        # Get all server computer objects from AD
        $servers = Invoke-Command -ComputerName $DomainController -Credential $Credential -ScriptBlock {
            Get-ADComputer -Filter 'OperatingSystem -like "*Server*"' -Properties `
                Name, DNSHostName, IPv4Address, OperatingSystem, OperatingSystemVersion, `
                Description, Enabled, LastLogonDate, Created, DistinguishedName |
            Select-Object Name, DNSHostName, IPv4Address, OperatingSystem, OperatingSystemVersion, `
                Description, Enabled, LastLogonDate, Created, DistinguishedName
        } -ErrorAction Stop
        
        Write-Host "    Found $($servers.Count) servers in AD" -ForegroundColor Gray
        
        # Probe each server for details
        $serverDetails = foreach ($server in $servers) {
            $serverInfo = @{
                Name              = $server.Name
                DNSHostName       = $server.DNSHostName
                IPv4Address       = $server.IPv4Address
                OperatingSystem   = $server.OperatingSystem
                OSVersion         = $server.OperatingSystemVersion
                Description       = $server.Description
                Enabled           = $server.Enabled
                LastLogon         = if ($server.LastLogonDate) { $server.LastLogonDate.ToString("yyyy-MM-dd HH:mm") } else { $null }
                Created           = if ($server.Created) { $server.Created.ToString("yyyy-MM-dd") } else { $null }
                OU                = ($server.DistinguishedName -split ',', 2)[1]
                Online            = $false
                Roles             = @()
                InstalledFeatures = @()
                Hardware          = $null
            }
            
            # Try to probe the server
            if ($server.DNSHostName -and (Test-Connection -ComputerName $server.DNSHostName -Count 1 -Quiet -ErrorAction SilentlyContinue)) {
                $serverInfo.Online = $true
                
                try {
                    $probeData = Invoke-Command -ComputerName $server.DNSHostName -Credential $Credential -ScriptBlock {
                        # Get installed roles
                        $features = Get-WindowsFeature | Where-Object Installed | Select-Object Name, DisplayName
                        
                        # Determine roles based on features
                        $roles = @()
                        if ($features.Name -contains 'AD-Domain-Services') { $roles += 'DomainController' }
                        if ($features.Name -contains 'DNS') { $roles += 'DNS' }
                        if ($features.Name -contains 'DHCP') { $roles += 'DHCP' }
                        if ($features.Name -contains 'Web-Server') { $roles += 'IIS' }
                        if ($features.Name -contains 'FileAndStorage-Services') { $roles += 'FileServer' }
                        if ($features.Name -contains 'Print-Services') { $roles += 'PrintServer' }
                        if ($features.Name -contains 'ADCS-Cert-Authority') { $roles += 'PKI-CA' }
                        if ($features.Name -contains 'ADCS-Web-Enrollment') { $roles += 'PKI-WebEnroll' }
                        if ($features.Name -contains 'Hyper-V') { $roles += 'Hyper-V' }
                        if ($features.Name -contains 'RSAT-AD-Tools') { $roles += 'AdminTools' }
                        if (Get-Service MSSQLSERVER -ErrorAction SilentlyContinue) { $roles += 'SQL' }
                        
                        # Get hardware info
                        $cs = Get-CimInstance Win32_ComputerSystem
                        $os = Get-CimInstance Win32_OperatingSystem
                        $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
                        $disk = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | 
                            Select-Object DeviceID, @{N='SizeGB';E={[math]::Round($_.Size/1GB)}}, @{N='FreeGB';E={[math]::Round($_.FreeSpace/1GB)}}
                        
                        @{
                            Roles            = $roles
                            InstalledFeatures = $features.Name
                            Hardware = @{
                                Manufacturer  = $cs.Manufacturer
                                Model         = $cs.Model
                                TotalMemoryGB = [math]::Round($cs.TotalPhysicalMemory/1GB)
                                Processors    = $cs.NumberOfProcessors
                                LogicalCPUs   = $cs.NumberOfLogicalProcessors
                                CPUName       = $cpu.Name
                                Uptime        = (Get-Date) - $os.LastBootUpTime
                                Disks         = $disk
                            }
                        }
                    } -ErrorAction Stop
                    
                    $serverInfo.Roles = $probeData.Roles
                    $serverInfo.InstalledFeatures = $probeData.InstalledFeatures
                    $serverInfo.Hardware = $probeData.Hardware
                }
                catch {
                    Write-Verbose "Could not probe $($server.Name): $_"
                }
            }
            
            $serverInfo
        }
        
        $onlineCount = ($serverDetails | Where-Object Online).Count
        Write-Host "    ✓ $($serverDetails.Count) servers ($onlineCount online)" -ForegroundColor Green
        
        return $serverDetails
    }
    catch {
        Write-Warning "Server Discovery failed: $_"
        return @()
    }
}

<#
.SYNOPSIS
    Discovers workstations.
#>
function Get-WorkstationDiscovery {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [System.Management.Automation.PSCredential]$Credential,
        
        [Parameter(Mandatory = $true)]
        [string]$DomainController
    )
    
    Write-Host "  Discovering Workstations..." -ForegroundColor Cyan
    
    try {
        $workstations = Invoke-Command -ComputerName $DomainController -Credential $Credential -ScriptBlock {
            Get-ADComputer -Filter 'OperatingSystem -notlike "*Server*" -and OperatingSystem -like "*Windows*"' -Properties `
                Name, DNSHostName, IPv4Address, OperatingSystem, OperatingSystemVersion, `
                Description, Enabled, LastLogonDate, Created |
            Select-Object Name, DNSHostName, IPv4Address, OperatingSystem, OperatingSystemVersion, `
                Description, Enabled, LastLogonDate, Created
        } -ErrorAction Stop
        
        $workstationDetails = $workstations | ForEach-Object {
            @{
                Name            = $_.Name
                DNSHostName     = $_.DNSHostName
                IPv4Address     = $_.IPv4Address
                OperatingSystem = $_.OperatingSystem
                OSVersion       = $_.OperatingSystemVersion
                Description     = $_.Description
                Enabled         = $_.Enabled
                LastLogon       = if ($_.LastLogonDate) { $_.LastLogonDate.ToString("yyyy-MM-dd HH:mm") } else { $null }
                Created         = if ($_.Created) { $_.Created.ToString("yyyy-MM-dd") } else { $null }
            }
        }
        
        Write-Host "    ✓ $($workstationDetails.Count) workstations" -ForegroundColor Green
        
        return $workstationDetails
    }
    catch {
        Write-Warning "Workstation Discovery failed: $_"
        return @()
    }
}

<#
.SYNOPSIS
    Discovers PKI/Certificate Services.
#>
function Get-PKIDiscovery {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [System.Management.Automation.PSCredential]$Credential,
        
        [Parameter(Mandatory = $true)]
        [string]$DomainController
    )
    
    Write-Host "  Discovering PKI..." -ForegroundColor Cyan
    
    try {
        $pkiInfo = Invoke-Command -ComputerName $DomainController -Credential $Credential -ScriptBlock {
            # Find CA servers from AD
            $caServers = @()
            
            # Check Enrollment Services container
            $configNC = (Get-ADRootDSE).configurationNamingContext
            $enrollmentServices = Get-ADObject -SearchBase "CN=Enrollment Services,CN=Public Key Services,CN=Services,$configNC" `
                -Filter * -Properties * -ErrorAction SilentlyContinue
            
            foreach ($ca in $enrollmentServices) {
                $caServers += @{
                    Name          = $ca.Name
                    DNSHostName   = $ca.dNSHostName
                    DisplayName   = $ca.displayName
                    CertTemplates = $ca.certificateTemplates
                }
            }
            
            # Get certificate templates
            $templates = Get-ADObject -SearchBase "CN=Certificate Templates,CN=Public Key Services,CN=Services,$configNC" `
                -Filter * -Properties * -ErrorAction SilentlyContinue |
                Select-Object Name, displayName, @{N='Created';E={$_.whenCreated}}
            
            @{
                CertificateAuthorities = $caServers
                CertificateTemplates   = $templates
                HasPKI                 = $caServers.Count -gt 0
            }
        } -ErrorAction Stop
        
        if ($pkiInfo.HasPKI) {
            Write-Host "    ✓ $($pkiInfo.CertificateAuthorities.Count) CA(s), $($pkiInfo.CertificateTemplates.Count) templates" -ForegroundColor Green
        }
        else {
            Write-Host "    ○ No PKI infrastructure detected" -ForegroundColor Yellow
        }
        
        return $pkiInfo
    }
    catch {
        Write-Warning "PKI Discovery failed: $_"
        return @{ HasPKI = $false; CertificateAuthorities = @(); CertificateTemplates = @() }
    }
}

<#
.SYNOPSIS
    Main discovery orchestrator function.
#>
function Start-InfrastructureDiscovery {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Environment,
        
        [Parameter(Mandatory = $false)]
        [System.Management.Automation.PSCredential]$Credential,
        
        [Parameter(Mandatory = $false)]
        [hashtable]$Options
    )
    
    Write-Host "`n" -NoNewline
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║            Infrastructure Discovery - $($Environment.PadRight(20))    ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    $startTime = Get-Date
    
    # Load environment configuration
    try {
        $config = Get-EnvironmentConfig -Environment $Environment
        Write-Host "✓ Loaded configuration for '$Environment'" -ForegroundColor Green
        Write-Host "  Domain: $($config.domain)" -ForegroundColor Gray
    }
    catch {
        Write-Error "Failed to load environment configuration: $_"
        return $null
    }
    
    # Get credentials if not provided
    if (-not $Credential) {
        $credModule = Join-Path $PSScriptRoot "CredentialManager.psm1"
        Import-Module $credModule -Force
        
        $Credential = Get-InfraCredential -Environment $Environment
        
        if (-not $Credential) {
            Write-Error "No credentials available for '$Environment'. Run Set-InfraCredential first."
            return $null
        }
    }
    
    # Initialize results
    $discoveryResults = @{
        Environment     = $Environment
        DiscoveryDate   = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        Domain          = $config.domain
        ActiveDirectory = $null
        DNS             = $null
        DHCP            = $null
        Servers         = @()
        Workstations    = @()
        PKI             = $null
        Summary         = @{}
    }
    
    $dc = $config.domainControllers | Select-Object -First 1
    
    # Run discoveries based on options
    $discoveryOptions = $Options ?? $config.discoveryOptions
    
    # Active Directory
    if ($discoveryOptions.includeAD -ne $false) {
        $discoveryResults.ActiveDirectory = Get-ADDiscovery -Credential $Credential -DomainController $dc
    }
    
    # DNS
    if ($discoveryOptions.includeDNS -ne $false) {
        $dnsServers = $config.dnsServers ?? $config.domainControllers
        $discoveryResults.DNS = Get-DNSDiscovery -Credential $Credential -DNSServers $dnsServers
    }
    
    # DHCP
    if ($discoveryOptions.includeDHCP -ne $false -and $config.dhcpServers) {
        $discoveryResults.DHCP = Get-DHCPDiscovery -Credential $Credential -DHCPServers $config.dhcpServers
    }
    
    # Servers
    if ($discoveryOptions.includeServers -ne $false) {
        $discoveryResults.Servers = Get-ServerDiscovery -Credential $Credential -DomainController $dc
    }
    
    # Workstations
    if ($discoveryOptions.includeWorkstations -ne $false) {
        $discoveryResults.Workstations = Get-WorkstationDiscovery -Credential $Credential -DomainController $dc
    }
    
    # PKI
    if ($discoveryOptions.includePKI -ne $false) {
        $discoveryResults.PKI = Get-PKIDiscovery -Credential $Credential -DomainController $dc
    }
    
    # Generate summary
    $duration = (Get-Date) - $startTime
    
    $discoveryResults.Summary = @{
        TotalServers      = $discoveryResults.Servers.Count
        OnlineServers     = ($discoveryResults.Servers | Where-Object Online).Count
        TotalWorkstations = $discoveryResults.Workstations.Count
        DomainControllers = ($discoveryResults.Servers | Where-Object { $_.Roles -contains 'DomainController' }).Count
        DNSZones          = $discoveryResults.DNS.Zones.Count
        DHCPScopes        = $discoveryResults.DHCP.Scopes.Count
        HasPKI            = $discoveryResults.PKI.HasPKI
        DiscoveryDuration = $duration.ToString("mm\:ss")
    }
    
    # Save results
    $dataPath = Get-EnvironmentDataPath -Environment $Environment
    $outputFile = Join-Path $dataPath "discovery-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    $latestFile = Join-Path $dataPath "discovery-latest.json"
    
    $discoveryResults | ConvertTo-Json -Depth 10 | Out-File $outputFile -Encoding UTF8
    $discoveryResults | ConvertTo-Json -Depth 10 | Out-File $latestFile -Encoding UTF8
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host " Discovery Complete!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  Servers:      $($discoveryResults.Summary.TotalServers) ($($discoveryResults.Summary.OnlineServers) online)" -ForegroundColor White
    Write-Host "  Workstations: $($discoveryResults.Summary.TotalWorkstations)" -ForegroundColor White
    Write-Host "  DNS Zones:    $($discoveryResults.Summary.DNSZones)" -ForegroundColor White
    Write-Host "  DHCP Scopes:  $($discoveryResults.Summary.DHCPScopes)" -ForegroundColor White
    Write-Host "  PKI:          $(if ($discoveryResults.Summary.HasPKI) { 'Yes' } else { 'No' })" -ForegroundColor White
    Write-Host "  Duration:     $($discoveryResults.Summary.DiscoveryDuration)" -ForegroundColor White
    Write-Host ""
    Write-Host "  Output: $outputFile" -ForegroundColor Gray
    Write-Host ""
    
    return $discoveryResults
}

#endregion

# Export functions
Export-ModuleMember -Function @(
    'Start-InfrastructureDiscovery',
    'Get-ADDiscovery',
    'Get-DNSDiscovery',
    'Get-DHCPDiscovery',
    'Get-ServerDiscovery',
    'Get-WorkstationDiscovery',
    'Get-PKIDiscovery',
    'Get-EnvironmentConfig'
)


