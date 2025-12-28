<#
.SYNOPSIS
    Portal Deployment module for InfraDiscovery framework.

.DESCRIPTION
    Deploys generated HTML portals to IIS web servers with proper
    configuration, scheduled refresh tasks, and DNS setup.

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
    
    $config = Get-Content $script:ConfigPath -Raw | ConvertFrom-Json
    return $config.environments.$Environment
}

function Get-EnvironmentReportsPath {
    param([string]$Environment)
    return Join-Path $PSScriptRoot "..\Environments\$Environment\Reports"
}
#endregion

#region Deployment Functions

<#
.SYNOPSIS
    Deploys the infrastructure portal to an IIS server.
#>
function Deploy-InfraPortal {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Environment,
        
        [Parameter(Mandatory = $true)]
        [string]$TargetServer,
        
        [Parameter(Mandatory = $false)]
        [string]$Hostname,
        
        [Parameter(Mandatory = $false)]
        [System.Management.Automation.PSCredential]$Credential,
        
        [Parameter(Mandatory = $false)]
        [string]$SitePath = "C:\inetpub\wwwroot\InfraPortal",
        
        [Parameter(Mandatory = $false)]
        [switch]$CreateScheduledTask
    )
    
    Write-Host "`n" -NoNewline
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║            Deploying Portal - $($Environment.PadRight(24))    ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    
    # Get credentials if not provided
    if (-not $Credential) {
        $credModule = Join-Path $PSScriptRoot "CredentialManager.psm1"
        Import-Module $credModule -Force
        $Credential = Get-InfraCredential -Environment $Environment
        
        if (-not $Credential) {
            Write-Error "No credentials available. Use -Credential parameter or set up credentials first."
            return $false
        }
    }
    
    # Find portal file
    $reportsPath = Get-EnvironmentReportsPath -Environment $Environment
    $portalFile = Join-Path $reportsPath "Infrastructure-Portal.html"
    
    if (-not (Test-Path $portalFile)) {
        Write-Error "Portal file not found: $portalFile. Generate the portal first."
        return $false
    }
    
    Write-Host "Target: $TargetServer" -ForegroundColor Gray
    Write-Host "Portal: $portalFile" -ForegroundColor Gray
    
    # Test connection
    Write-Host "`nTesting connection to $TargetServer..." -ForegroundColor Cyan
    if (-not (Test-Connection -ComputerName $TargetServer -Count 2 -Quiet)) {
        Write-Error "Cannot reach $TargetServer. Check network connectivity."
        return $false
    }
    Write-Host "✓ Server is reachable" -ForegroundColor Green
    
    # Deploy to target server
    try {
        $portalContent = Get-Content $portalFile -Raw
        
        $result = Invoke-Command -ComputerName $TargetServer -Credential $Credential -ArgumentList $SitePath, $portalContent, $Hostname -ScriptBlock {
            param($SitePath, $PortalContent, $Hostname)
            
            $results = @{
                Success = $true
                Messages = @()
                IISInstalled = $false
                SiteCreated = $false
            }
            
            # Ensure IIS is installed
            $iisFeature = Get-WindowsFeature -Name Web-Server
            if (-not $iisFeature.Installed) {
                $results.Messages += "Installing IIS..."
                Install-WindowsFeature -Name Web-Server -IncludeManagementTools | Out-Null
                $results.IISInstalled = $true
                $results.Messages += "IIS installed successfully"
            }
            else {
                $results.Messages += "IIS already installed"
            }
            
            Import-Module WebAdministration -ErrorAction SilentlyContinue
            
            # Create site directory
            if (-not (Test-Path $SitePath)) {
                New-Item -Path $SitePath -ItemType Directory -Force | Out-Null
                $results.Messages += "Created directory: $SitePath"
            }
            
            # Copy portal file
            $PortalContent | Out-File "$SitePath\index.html" -Encoding UTF8 -Force
            $results.Messages += "Portal deployed to $SitePath\index.html"
            
            # Check/Create IIS site
            $siteName = "InfraPortal"
            $existingSite = Get-Website -Name $siteName -ErrorAction SilentlyContinue
            
            if (-not $existingSite) {
                # Remove default binding conflict if exists
                $defaultSite = Get-Website -Name "Default Web Site" -ErrorAction SilentlyContinue
                if ($defaultSite) {
                    Stop-Website -Name "Default Web Site" -ErrorAction SilentlyContinue
                }
                
                # Create new site
                $binding = if ($Hostname) { "*:80:$Hostname" } else { "*:80:" }
                New-Website -Name $siteName -PhysicalPath $SitePath -BindingInformation $binding | Out-Null
                $results.SiteCreated = $true
                $results.Messages += "Created IIS site: $siteName"
                
                if ($Hostname) {
                    $results.Messages += "Hostname binding: $Hostname"
                }
            }
            else {
                $results.Messages += "IIS site already exists: $siteName"
            }
            
            # Ensure site is running
            Start-Website -Name $siteName -ErrorAction SilentlyContinue
            $results.Messages += "Site started"
            
            # Open firewall
            $rule = Get-NetFirewallRule -DisplayName "HTTP (TCP-In)" -ErrorAction SilentlyContinue
            if (-not $rule) {
                New-NetFirewallRule -DisplayName "HTTP (TCP-In)" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow | Out-Null
                $results.Messages += "Firewall rule created for HTTP"
            }
            
            return $results
        } -ErrorAction Stop
        
        # Display results
        foreach ($msg in $result.Messages) {
            Write-Host "  $msg" -ForegroundColor Gray
        }
        
        Write-Host "`n✓ Portal deployed successfully!" -ForegroundColor Green
        
        # Get target IP for access info
        $targetIP = (Resolve-DnsName $TargetServer -Type A -ErrorAction SilentlyContinue).IPAddress | Select-Object -First 1
        
        Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host " Access Information" -ForegroundColor White
        Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
        
        if ($Hostname) {
            Write-Host "  URL: http://$Hostname" -ForegroundColor Green
            Write-Host "  (Requires DNS record pointing to $targetIP)" -ForegroundColor Gray
        }
        
        Write-Host "  Direct: http://$targetIP" -ForegroundColor Green
        Write-Host ""
        
        # Create scheduled task if requested
        if ($CreateScheduledTask) {
            Write-Host "Creating scheduled refresh task..." -ForegroundColor Cyan
            
            # This would create a task to refresh discovery and portal
            # For now, just inform the user
            Write-Host "  Note: Set up a scheduled task to run discovery and regenerate portal periodically." -ForegroundColor Yellow
        }
        
        return $true
    }
    catch {
        Write-Error "Deployment failed: $_"
        return $false
    }
}

<#
.SYNOPSIS
    Tests if a portal deployment is accessible.
#>
function Test-InfraPortalDeployment {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url
    )
    
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Portal is accessible at $Url" -ForegroundColor Green
            return $true
        }
        else {
            Write-Warning "Portal returned status code: $($response.StatusCode)"
            return $false
        }
    }
    catch {
        Write-Warning "Cannot access portal at $Url`: $_"
        return $false
    }
}

<#
.SYNOPSIS
    Removes a deployed portal from a server.
#>
function Remove-InfraPortalDeployment {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$TargetServer,
        
        [Parameter(Mandatory = $true)]
        [System.Management.Automation.PSCredential]$Credential,
        
        [Parameter(Mandatory = $false)]
        [string]$SitePath = "C:\inetpub\wwwroot\InfraPortal"
    )
    
    Write-Host "Removing portal deployment from $TargetServer..." -ForegroundColor Cyan
    
    try {
        Invoke-Command -ComputerName $TargetServer -Credential $Credential -ArgumentList $SitePath -ScriptBlock {
            param($SitePath)
            
            Import-Module WebAdministration -ErrorAction SilentlyContinue
            
            # Remove IIS site
            $site = Get-Website -Name "InfraPortal" -ErrorAction SilentlyContinue
            if ($site) {
                Remove-Website -Name "InfraPortal"
                Write-Output "Removed IIS site: InfraPortal"
            }
            
            # Remove directory
            if (Test-Path $SitePath) {
                Remove-Item -Path $SitePath -Recurse -Force
                Write-Output "Removed directory: $SitePath"
            }
        } -ErrorAction Stop
        
        Write-Host "✓ Portal deployment removed" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Error "Failed to remove deployment: $_"
        return $false
    }
}

#endregion

# Export functions
Export-ModuleMember -Function @(
    'Deploy-InfraPortal',
    'Test-InfraPortalDeployment',
    'Remove-InfraPortalDeployment'
)
