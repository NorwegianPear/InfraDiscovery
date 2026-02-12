<#
.SYNOPSIS
    Deploy Dalir Infrastructure Portal to IIS

.DESCRIPTION
    Complete deployment script for the Dalir Infrastructure Documentation Portal.
    - Sets up IIS site with proper bindings
    - Configures DNS record
    - Deploys HTML portal files
    - Sets up automatic refresh schedule

.EXAMPLE
    .\Deploy-InfraPortal.ps1 -TargetServer "DALIR-SRV01.ad.dalir.no" -PortalHostname "infra-portal.dalir.no"

.NOTES
    Requires: Administrator privileges, IIS installed on target server
    Date: December 2025
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$TargetServer = "DALIR-SRV01.ad.dalir.no",
    
    [Parameter(Mandatory = $false)]
    [string]$PortalHostname = "infra-portal.dalir.no",
    
    [Parameter(Mandatory = $false)]
    [string]$PortalPath = "C:\inetpub\wwwroot\InfraPortal",
    
    [Parameter(Mandatory = $false)]
    [string]$SiteName = "InfraPortal",
    
    [Parameter(Mandatory = $false)]
    [string]$SourcePath = $PSScriptRoot,
    
    [Parameter(Mandatory = $false)]
    [string]$CredentialPath = (Join-Path $PSScriptRoot "..\Credentials\dalir-admin.xml"),
    
    [Parameter(Mandatory = $false)]
    [string]$DomainController = "172.24.130.42",
    
    [Parameter(Mandatory = $false)]
    [switch]$SkipDNS,
    
    [Parameter(Mandatory = $false)]
    [switch]$SkipIIS,
    
    [Parameter(Mandatory = $false)]
    [switch]$UpdateOnly
)

#region Helper Functions

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "INFO"    { "White" }
        "SUCCESS" { "Green" }
        "WARNING" { "Yellow" }
        "ERROR"   { "Red" }
        "STEP"    { "Cyan" }
        default   { "Gray" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Get-StoredCredential {
    param([string]$Path)
    
    if (Test-Path $Path) {
        try {
            $cred = Import-Clixml $Path
            Write-Log "Loaded credentials from: $Path" "SUCCESS"
            return $cred
        }
        catch {
            Write-Log "Failed to load credentials: $_" "ERROR"
            return $null
        }
    }
    else {
        Write-Log "Credential file not found: $Path" "WARNING"
        Write-Log "Please run Setup-Credentials.ps1 first" "INFO"
        return $null
    }
}

#endregion

#region DNS Functions

function Add-InfraDNSRecord {
    param(
        [string]$Hostname,
        [string]$TargetIP,
        [string]$Zone,
        [string]$DC,
        [PSCredential]$Credential
    )
    
    Write-Log "Creating DNS record: $Hostname -> $TargetIP" "STEP"
    
    try {
        # Get target server IP if not provided
        if (-not $TargetIP) {
            $TargetIP = (Resolve-DnsName -Name $TargetServer -Type A -ErrorAction Stop).IPAddress | Select-Object -First 1
            Write-Log "Resolved target IP: $TargetIP" "INFO"
        }
        
        # Parse hostname parts
        $recordName = $Hostname -replace "\.$Zone$", ""
        
        # Create DNS record via DC
        $dnsParams = @{
            ComputerName = $DC
            Credential = $Credential
            Name = $recordName
            ZoneName = $Zone
            A = $true
            IPv4Address = $TargetIP
            CreatePtr = $true
            AllowUpdateAny = $true
            ErrorAction = 'Stop'
        }
        
        # Check if record exists
        $existing = Get-DnsServerResourceRecord -ComputerName $DC -ZoneName $Zone -Name $recordName -RRType A -ErrorAction SilentlyContinue
        if ($existing) {
            Write-Log "DNS record already exists, updating..." "INFO"
            Remove-DnsServerResourceRecord -ComputerName $DC -ZoneName $Zone -Name $recordName -RRType A -Force -ErrorAction SilentlyContinue
        }
        
        Add-DnsServerResourceRecordA @dnsParams
        Write-Log "DNS record created successfully" "SUCCESS"
        return $true
    }
    catch {
        Write-Log "Failed to create DNS record: $_" "ERROR"
        return $false
    }
}

#endregion

#region IIS Functions

function Install-IISOnTarget {
    param(
        [string]$Server,
        [PSCredential]$Credential
    )
    
    Write-Log "Checking IIS installation on $Server..." "STEP"
    
    $result = Invoke-Command -ComputerName $Server -Credential $Credential -ScriptBlock {
        $iis = Get-WindowsFeature Web-Server
        
        if (-not $iis.Installed) {
            Write-Output "Installing IIS..."
            Install-WindowsFeature Web-Server, Web-Mgmt-Tools -IncludeManagementTools | Out-Null
            return "Installed"
        }
        return "Already Installed"
    } -ErrorAction Stop
    
    Write-Log "IIS Status: $result" "SUCCESS"
    return $true
}

function Deploy-PortalToIIS {
    param(
        [string]$Server,
        [string]$SiteName,
        [string]$Hostname,
        [string]$PhysicalPath,
        [string]$SourcePath,
        [PSCredential]$Credential
    )
    
    Write-Log "Deploying portal to $Server..." "STEP"
    
    # Get local portal files
    $portalSource = Join-Path $SourcePath "..\InfraPortal"
    $portalFiles = @{
        "index.html" = Get-Content (Join-Path $portalSource "index.html") -Raw
    }
    
    # Get api/data JSON files
    $apiDataFiles = @{}
    $apiDataDir = Join-Path $portalSource "api\data"
    if (Test-Path $apiDataDir) {
        Get-ChildItem $apiDataDir -Filter "*.json" | ForEach-Object {
            $apiDataFiles[$_.Name] = Get-Content $_.FullName -Raw
        }
        Write-Log "Found $($apiDataFiles.Count) api/data JSON files" "INFO"
    }
    
    # Create web.config for proper MIME types
    $webConfig = @'
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <staticContent>
            <mimeMap fileExtension=".json" mimeType="application/json" />
            <mimeMap fileExtension=".woff" mimeType="application/font-woff" />
            <mimeMap fileExtension=".woff2" mimeType="application/font-woff2" />
        </staticContent>
        <httpProtocol>
            <customHeaders>
                <add name="X-Content-Type-Options" value="nosniff" />
                <add name="X-Frame-Options" value="SAMEORIGIN" />
            </customHeaders>
        </httpProtocol>
        <defaultDocument>
            <files>
                <clear />
                <add value="index.html" />
            </files>
        </defaultDocument>
    </system.webServer>
</configuration>
'@
    
    $result = Invoke-Command -ComputerName $Server -Credential $Credential -ArgumentList $SiteName, $Hostname, $PhysicalPath, $portalFiles, $webConfig, $apiDataFiles -ScriptBlock {
        param($SiteName, $Hostname, $PhysicalPath, $PortalFiles, $WebConfig, $ApiDataFiles)
        
        Import-Module WebAdministration -ErrorAction Stop
        
        # Create physical path
        if (-not (Test-Path $PhysicalPath)) {
            New-Item -Path $PhysicalPath -ItemType Directory -Force | Out-Null
            Write-Output "Created directory: $PhysicalPath"
        }
        
        # Create api/data subdirectory
        $apiDataPath = Join-Path $PhysicalPath "api\data"
        if (-not (Test-Path $apiDataPath)) {
            New-Item -Path $apiDataPath -ItemType Directory -Force | Out-Null
            Write-Output "Created directory: api\data"
        }
        
        # Write portal files
        foreach ($file in $PortalFiles.Keys) {
            if ($PortalFiles[$file]) {
                $filePath = Join-Path $PhysicalPath $file
                Set-Content -Path $filePath -Value $PortalFiles[$file] -Encoding UTF8 -Force
                Write-Output "Deployed: $file"
            }
        }
        
        # Write api/data JSON files
        if ($ApiDataFiles) {
            foreach ($file in $ApiDataFiles.Keys) {
                if ($ApiDataFiles[$file]) {
                    $filePath = Join-Path $apiDataPath $file
                    Set-Content -Path $filePath -Value $ApiDataFiles[$file] -Encoding UTF8 -Force
                    Write-Output "Deployed api/data: $file"
                }
            }
        }
        
        # Write web.config
        Set-Content -Path (Join-Path $PhysicalPath "web.config") -Value $WebConfig -Encoding UTF8 -Force
        Write-Output "Deployed: web.config"
        
        # Check if site exists
        $site = Get-Website -Name $SiteName -ErrorAction SilentlyContinue
        
        if ($site) {
            Write-Output "Site already exists, updating bindings..."
            # Update binding if needed
            $existingBinding = Get-WebBinding -Name $SiteName | Where-Object { $_.bindingInformation -like "*$Hostname*" }
            if (-not $existingBinding) {
                New-WebBinding -Name $SiteName -Protocol "http" -Port 80 -HostHeader $Hostname
                Write-Output "Added binding: http://$Hostname"
            }
        }
        else {
            # Create new site
            Write-Output "Creating new IIS site: $SiteName"
            
            # Stop Default Web Site if using port 80
            $defaultSite = Get-Website -Name "Default Web Site" -ErrorAction SilentlyContinue
            if ($defaultSite -and $defaultSite.State -eq "Started") {
                Stop-Website -Name "Default Web Site" -ErrorAction SilentlyContinue
            }
            
            # Create site with hostname binding
            New-Website -Name $SiteName -PhysicalPath $PhysicalPath -HostHeader $Hostname -Port 80 -Force | Out-Null
            
            # Start the site
            Start-Website -Name $SiteName
            Write-Output "Site created and started"
        }
        
        # Set permissions
        $acl = Get-Acl $PhysicalPath
        $rule = New-Object System.Security.AccessControl.FileSystemAccessRule("IIS_IUSRS", "ReadAndExecute", "ContainerInherit,ObjectInherit", "None", "Allow")
        $acl.SetAccessRule($rule)
        Set-Acl $PhysicalPath $acl
        Write-Output "Permissions set"
        
        return "Deployment Complete"
    } -ErrorAction Stop
    
    foreach ($line in $result) {
        Write-Log $line "INFO"
    }
    
    Write-Log "Portal deployed successfully" "SUCCESS"
    return $true
}

#endregion

#region Monitoring Setup

function Setup-PortalMonitoring {
    param(
        [string]$Server,
        [string]$PortalPath,
        [PSCredential]$Credential
    )
    
    Write-Log "Setting up automatic refresh..." "STEP"
    
    $refreshScript = @'
# Auto-refresh script for InfraPortal
$ErrorActionPreference = "SilentlyContinue"
$dataPath = "PORTAL_PATH\data"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Log refresh
Add-Content -Path "$dataPath\refresh.log" -Value "[$timestamp] Refresh triggered"

# Copy latest data from source if available
$sourcePath = "\\DALIR-FIL01\InfraData$"
if (Test-Path $sourcePath) {
    Copy-Item "$sourcePath\*" -Destination $dataPath -Force
    Add-Content -Path "$dataPath\refresh.log" -Value "[$timestamp] Data refreshed from $sourcePath"
}
'@
    
    $refreshScript = $refreshScript -replace "PORTAL_PATH", $PortalPath
    
    Invoke-Command -ComputerName $Server -Credential $Credential -ArgumentList $PortalPath, $refreshScript -ScriptBlock {
        param($PortalPath, $RefreshScript)
        
        # Create refresh script
        $scriptPath = Join-Path $PortalPath "Refresh-Data.ps1"
        Set-Content -Path $scriptPath -Value $RefreshScript -Encoding UTF8 -Force
        
        # Create scheduled task
        $taskName = "InfraPortal-DataRefresh"
        $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        
        if ($existingTask) {
            Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        }
        
        $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
        $trigger = New-ScheduledTaskTrigger -Daily -At "03:00"
        $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount
        $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 1)
        
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Refresh infrastructure portal data"
        
        Write-Output "Scheduled task created: $taskName (runs daily at 03:00)"
    } -ErrorAction Stop
    
    Write-Log "Monitoring setup complete" "SUCCESS"
}

#endregion

#region Main Execution

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       DALIR INFRASTRUCTURE PORTAL DEPLOYMENT                     ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Log "Target Server:    $TargetServer" "INFO"
Write-Log "Portal URL:       https://$PortalHostname" "INFO"
Write-Log "Site Name:        $SiteName" "INFO"
Write-Log "Physical Path:    $PortalPath" "INFO"
Write-Host ""

# Load credentials
$credential = Get-StoredCredential -Path $CredentialPath
if (-not $credential) {
    $credential = Get-Credential -Message "Enter admin credentials for $TargetServer"
}

if (-not $credential) {
    Write-Log "No credentials provided. Exiting." "ERROR"
    exit 1
}

# Test connectivity
Write-Log "Testing connectivity to $TargetServer..." "STEP"
if (-not (Test-Connection -ComputerName $TargetServer -Count 1 -Quiet)) {
    Write-Log "Cannot reach $TargetServer" "ERROR"
    exit 1
}
Write-Log "Server is reachable" "SUCCESS"

# Step 1: DNS Record
if (-not $SkipDNS) {
    Write-Host ""
    Write-Log "STEP 1: DNS Configuration" "STEP"
    
    # Get target server IP
    try {
        $targetIP = (Resolve-DnsName -Name $TargetServer -Type A -ErrorAction Stop).IPAddress | Select-Object -First 1
    }
    catch {
        $targetIP = Invoke-Command -ComputerName $TargetServer -Credential $credential -ScriptBlock {
            (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" }).IPAddress | Select-Object -First 1
        }
    }
    
    Write-Log "Target server IP: $targetIP" "INFO"
    
    # Create DNS record
    Add-InfraDNSRecord -Hostname $PortalHostname -TargetIP $targetIP -Zone "dalir.no" -DC $DomainController -Credential $credential
}
else {
    Write-Log "Skipping DNS configuration" "INFO"
}

# Step 2: IIS Setup
if (-not $SkipIIS -and -not $UpdateOnly) {
    Write-Host ""
    Write-Log "STEP 2: IIS Installation" "STEP"
    Install-IISOnTarget -Server $TargetServer -Credential $credential
}
else {
    Write-Log "Skipping IIS installation" "INFO"
}

# Step 3: Deploy Portal
Write-Host ""
Write-Log "STEP 3: Portal Deployment" "STEP"
Deploy-PortalToIIS -Server $TargetServer -SiteName $SiteName -Hostname $PortalHostname -PhysicalPath $PortalPath -SourcePath $SourcePath -Credential $credential

# Step 4: Monitoring
if (-not $UpdateOnly) {
    Write-Host ""
    Write-Log "STEP 4: Monitoring Setup" "STEP"
    Setup-PortalMonitoring -Server $TargetServer -PortalPath $PortalPath -Credential $credential
}

# Summary
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host " DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host " Portal URL:      https://$PortalHostname" -ForegroundColor White
Write-Host " Target Server:   $TargetServer" -ForegroundColor White
Write-Host " Physical Path:   $PortalPath" -ForegroundColor White
Write-Host " Auto-refresh:    Daily at 03:00" -ForegroundColor White
Write-Host ""

# Test URL
Write-Log "Testing portal accessibility..." "STEP"
try {
    $response = Invoke-WebRequest -Uri "https://$PortalHostname" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Log "Portal is accessible at https://$PortalHostname" "SUCCESS"
    }
}
catch {
    Write-Log "Portal may not be immediately accessible. Please check:" "WARNING"
    Write-Log "  - DNS propagation (may take a few minutes)" "INFO"
    Write-Log "  - Firewall rules on $TargetServer" "INFO"
    Write-Log "  - IIS site status" "INFO"
}

Write-Host ""

#endregion
