<#
.SYNOPSIS
    Quick setup script to initialize InfraDiscovery for an existing environment.

.DESCRIPTION
    This script provides a fast way to:
    1. Import an existing environment configuration
    2. Set up credentials
    3. Run initial discovery

.PARAMETER EnvironmentName
    Name for the environment (e.g., "Dalir", "CustomerA")

.PARAMETER Domain
    Domain name (e.g., "ad.dalir.no")

.PARAMETER DomainController
    Primary domain controller FQDN

.EXAMPLE
    .\Quick-Setup.ps1 -EnvironmentName "Dalir" -Domain "ad.dalir.no" -DomainController "dalir-dc01.ad.dalir.no"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$EnvironmentName,
    
    [Parameter(Mandatory = $false)]
    [string]$Domain,
    
    [Parameter(Mandatory = $false)]
    [string]$DomainController
)

$scriptRoot = $PSScriptRoot

Write-Host "`n" -NoNewline
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║            InfraDiscovery Quick Setup                        ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Gather info if not provided
if (-not $EnvironmentName) {
    $EnvironmentName = Read-Host "Environment name (e.g., CustomerA, Dalir)"
}

if (-not $Domain) {
    $Domain = Read-Host "Domain (e.g., ad.company.com)"
}

if (-not $DomainController) {
    $DomainController = Read-Host "Domain Controller FQDN (e.g., dc01.ad.company.com)"
}

Write-Host ""
Write-Host "Setting up: $EnvironmentName" -ForegroundColor Yellow
Write-Host "Domain: $Domain" -ForegroundColor Gray
Write-Host "DC: $DomainController" -ForegroundColor Gray
Write-Host ""

# Create config
$configPath = Join-Path $scriptRoot "Config\environments.json"
$configDir = Split-Path $configPath -Parent

if (-not (Test-Path $configDir)) {
    New-Item -Path $configDir -ItemType Directory -Force | Out-Null
}

$config = if (Test-Path $configPath) {
    Get-Content $configPath -Raw | ConvertFrom-Json
}
else {
    [PSCustomObject]@{
        version = "1.0"
        environments = [PSCustomObject]@{}
        globalSettings = [PSCustomObject]@{
            defaultCredentialPath = "Credentials"
            defaultDataPath = "Environments"
            autoRefreshHours = 24
            portalTheme = "modern-dark"
        }
    }
}

# Add environment
$envConfig = [PSCustomObject]@{
    displayName = $EnvironmentName
    domain = $Domain
    domainControllers = @($DomainController)
    dnsServers = @($DomainController)
    dhcpServers = @()
    targetWebServer = $null
    portalHostname = $null
    discoveryOptions = [PSCustomObject]@{
        includeWorkstations = $true
        includeServers = $true
        includeAD = $true
        includeDNS = $true
        includeDHCP = $true
        includePKI = $true
        includeIIS = $true
    }
    notes = "Quick setup $(Get-Date -Format 'yyyy-MM-dd')"
}

$config.environments | Add-Member -NotePropertyName $EnvironmentName -NotePropertyValue $envConfig -Force
$config | ConvertTo-Json -Depth 10 | Out-File $configPath -Encoding UTF8

Write-Host "✓ Configuration saved" -ForegroundColor Green

# Create directories
$envPath = Join-Path $scriptRoot "Environments\$EnvironmentName"
@("Data", "Reports", "Diagrams") | ForEach-Object {
    $dir = Join-Path $envPath $_
    if (-not (Test-Path $dir)) {
        New-Item -Path $dir -ItemType Directory -Force | Out-Null
    }
}
Write-Host "✓ Directories created" -ForegroundColor Green

# Set up credentials
Write-Host ""
Write-Host "Now let's set up credentials for '$EnvironmentName'..." -ForegroundColor Yellow
Write-Host "Enter domain admin credentials (e.g., $Domain\Administrator)" -ForegroundColor Gray

$cred = Get-Credential -Message "Credentials for $EnvironmentName"

if ($cred) {
    $credPath = Join-Path $scriptRoot "Credentials\$EnvironmentName-admin.xml"
    $cred | Export-Clixml -Path $credPath
    Write-Host "✓ Credentials saved (encrypted)" -ForegroundColor Green
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " Setup Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run discovery:" -ForegroundColor White
Write-Host "     .\Start-InfraDiscovery.ps1 -Action Discover -Environment '$EnvironmentName'" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Generate portal:" -ForegroundColor White
Write-Host "     .\Start-InfraDiscovery.ps1 -Action GeneratePortal -Environment '$EnvironmentName'" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Or use interactive menu:" -ForegroundColor White
Write-Host "     .\Start-InfraDiscovery.ps1" -ForegroundColor Gray
Write-Host ""

$runNow = Read-Host "Run discovery now? (Y/N)"
if ($runNow -match '^[Yy]') {
    & "$scriptRoot\Start-InfraDiscovery.ps1" -Action Discover -Environment $EnvironmentName
}
