<#
.SYNOPSIS
    InfraDiscovery - Main Entry Point
    A modular infrastructure discovery, documentation, and portal deployment framework.

.DESCRIPTION
    This script provides an interactive menu or direct command-line access to:
    - Set up new environments with encrypted credentials
    - Run infrastructure discovery
    - Generate HTML documentation portals
    - Deploy portals to IIS web servers
    - Generate Visio diagrams

.PARAMETER Action
    The action to perform: Setup, Discover, GeneratePortal, Deploy, Visio, Menu

.PARAMETER Environment
    The name of the environment to work with.

.PARAMETER TargetServer
    For deployment: the target web server.

.PARAMETER Hostname
    For deployment: the hostname for the IIS site binding.

.EXAMPLE
    .\Start-InfraDiscovery.ps1
    # Opens interactive menu

.EXAMPLE
    .\Start-InfraDiscovery.ps1 -Action Setup -Environment "CustomerA"
    # Sets up a new environment

.EXAMPLE
    .\Start-InfraDiscovery.ps1 -Action Discover -Environment "CustomerA"
    # Runs infrastructure discovery

.EXAMPLE
    .\Start-InfraDiscovery.ps1 -Action Deploy -Environment "CustomerA" -TargetServer "WEB01" -Hostname "infra.customer.com"
    # Deploys portal to IIS

.NOTES
    Author: InfraDiscovery Framework
    Version: 1.0
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('Setup', 'Discover', 'GeneratePortal', 'Deploy', 'Visio', 'Menu', 'ListEnvironments')]
    [string]$Action = 'Menu',
    
    [Parameter(Mandatory = $false)]
    [string]$Environment,
    
    [Parameter(Mandatory = $false)]
    [string]$TargetServer,
    
    [Parameter(Mandatory = $false)]
    [string]$Hostname,
    
    [Parameter(Mandatory = $false)]
    [switch]$OpenPortal
)

#region Configuration
$script:ScriptRoot = $PSScriptRoot
$script:ConfigPath = Join-Path $PSScriptRoot "Config\environments.json"
$script:ModulesPath = Join-Path $PSScriptRoot "Modules"
#endregion

#region Module Loading
function Import-InfraModules {
    $modules = @(
        "CredentialManager.psm1",
        "InfraDiscovery.psm1",
        "PortalGenerator.psm1",
        "PortalDeployer.psm1"
    )
    
    foreach ($module in $modules) {
        $modulePath = Join-Path $script:ModulesPath $module
        if (Test-Path $modulePath) {
            Import-Module $modulePath -Force -ErrorAction SilentlyContinue
        }
    }
}
#endregion

#region Environment Management
function Get-EnvironmentList {
    if (-not (Test-Path $script:ConfigPath)) {
        return @()
    }
    
    $config = Get-Content $script:ConfigPath -Raw | ConvertFrom-Json
    return $config.environments.PSObject.Properties.Name | Where-Object { $_ -ne '_template' }
}

function New-EnvironmentConfig {
    param([string]$EnvironmentName)
    
    Write-Host "`n" -NoNewline
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║            New Environment Setup - $($EnvironmentName.PadRight(20))    ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    
    # Gather information
    Write-Host "`nEnter environment details:" -ForegroundColor Yellow
    
    $domain = Read-Host "  Domain name (e.g., ad.company.com)"
    $dcInput = Read-Host "  Domain Controller(s) (comma-separated)"
    $dcs = $dcInput -split ',' | ForEach-Object { $_.Trim() }
    
    $dnsInput = Read-Host "  DNS Server(s) (press Enter to use DCs)"
    $dnsServers = if ($dnsInput) { $dnsInput -split ',' | ForEach-Object { $_.Trim() } } else { $dcs }
    
    $dhcpInput = Read-Host "  DHCP Server(s) (press Enter to skip)"
    $dhcpServers = if ($dhcpInput) { $dhcpInput -split ',' | ForEach-Object { $_.Trim() } } else { @() }
    
    # Load existing config
    $config = if (Test-Path $script:ConfigPath) {
        Get-Content $script:ConfigPath -Raw | ConvertFrom-Json
    }
    else {
        @{ environments = @{} } | ConvertTo-Json | ConvertFrom-Json
    }
    
    # Add new environment
    $envConfig = @{
        displayName       = $EnvironmentName
        domain           = $domain
        domainControllers = $dcs
        dnsServers       = $dnsServers
        dhcpServers      = $dhcpServers
        targetWebServer  = $null
        portalHostname   = $null
        discoveryOptions = @{
            includeWorkstations = $true
            includeServers     = $true
            includeAD          = $true
            includeDNS         = $true
            includeDHCP        = $dhcpServers.Count -gt 0
            includePKI         = $true
            includeIIS         = $true
        }
        notes = "Created $(Get-Date -Format 'yyyy-MM-dd')"
    }
    
    # Add to config
    $config.environments | Add-Member -NotePropertyName $EnvironmentName -NotePropertyValue $envConfig -Force
    
    # Save config
    $configDir = Split-Path $script:ConfigPath -Parent
    if (-not (Test-Path $configDir)) {
        New-Item -Path $configDir -ItemType Directory -Force | Out-Null
    }
    
    $config | ConvertTo-Json -Depth 10 | Out-File $script:ConfigPath -Encoding UTF8
    
    Write-Host "`n✓ Environment '$EnvironmentName' configured" -ForegroundColor Green
    
    # Create environment directories
    $envPath = Join-Path $PSScriptRoot "Environments\$EnvironmentName"
    @("Data", "Reports", "Diagrams") | ForEach-Object {
        $dir = Join-Path $envPath $_
        if (-not (Test-Path $dir)) {
            New-Item -Path $dir -ItemType Directory -Force | Out-Null
        }
    }
    
    Write-Host "✓ Created environment directories" -ForegroundColor Green
    
    # Set up credentials
    Write-Host "`nNow let's set up credentials..." -ForegroundColor Yellow
    Initialize-InfraCredential -Environment $EnvironmentName
    
    return $true
}

function Select-Environment {
    $environments = Get-EnvironmentList
    
    if ($environments.Count -eq 0) {
        Write-Host "`nNo environments configured." -ForegroundColor Yellow
        $create = Read-Host "Would you like to create one? (Y/N)"
        
        if ($create -match '^[Yy]') {
            $envName = Read-Host "Enter environment name"
            New-EnvironmentConfig -EnvironmentName $envName
            return $envName
        }
        return $null
    }
    
    Write-Host "`n=== Available Environments ===" -ForegroundColor Cyan
    for ($i = 0; $i -lt $environments.Count; $i++) {
        Write-Host "  [$($i + 1)] $($environments[$i])" -ForegroundColor White
    }
    Write-Host "  [N] New Environment" -ForegroundColor Gray
    Write-Host ""
    
    $selection = Read-Host "Select environment"
    
    if ($selection -match '^[Nn]') {
        $envName = Read-Host "Enter new environment name"
        New-EnvironmentConfig -EnvironmentName $envName
        return $envName
    }
    
    $index = [int]$selection - 1
    if ($index -ge 0 -and $index -lt $environments.Count) {
        return $environments[$index]
    }
    
    Write-Warning "Invalid selection"
    return $null
}
#endregion

#region Action Functions
function Invoke-Setup {
    param([string]$Env)
    
    if (-not $Env) {
        $Env = Read-Host "Enter environment name"
    }
    
    $Env = $Env -replace '[^\w\-]', ''
    
    if ([string]::IsNullOrWhiteSpace($Env)) {
        Write-Warning "Invalid environment name"
        return
    }
    
    New-EnvironmentConfig -EnvironmentName $Env
}

function Invoke-Discovery {
    param([string]$Env)
    
    if (-not $Env) {
        $Env = Select-Environment
    }
    
    if (-not $Env) { return }
    
    Start-InfrastructureDiscovery -Environment $Env
}

function Invoke-GeneratePortal {
    param([string]$Env, [switch]$Open)
    
    if (-not $Env) {
        $Env = Select-Environment
    }
    
    if (-not $Env) { return }
    
    $portalPath = New-InfraPortal -Environment $Env -OpenInBrowser:$Open
    
    if ($portalPath) {
        Write-Host "`nPortal generated: $portalPath" -ForegroundColor Green
    }
}

function Invoke-Deploy {
    param(
        [string]$Env,
        [string]$Server,
        [string]$PortalHostname
    )
    
    if (-not $Env) {
        $Env = Select-Environment
    }
    
    if (-not $Env) { return }
    
    if (-not $Server) {
        $Server = Read-Host "Enter target web server (hostname or FQDN)"
    }
    
    if (-not $PortalHostname) {
        $PortalHostname = Read-Host "Enter portal hostname (e.g., infra.company.com, or press Enter to skip)"
    }
    
    $params = @{
        Environment  = $Env
        TargetServer = $Server
    }
    
    if ($Host) {
        $params.Hostname = $Host
    }
    
    Deploy-InfraPortal @params -CreateScheduledTask
}
#endregion

#region Interactive Menu
function Show-MainMenu {
    Clear-Host
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║                                                              ║" -ForegroundColor Cyan
    Write-Host "  ║    ██╗███╗   ██╗███████╗██████╗  █████╗                      ║" -ForegroundColor Cyan
    Write-Host "  ║    ██║████╗  ██║██╔════╝██╔══██╗██╔══██╗                     ║" -ForegroundColor Cyan
    Write-Host "  ║    ██║██╔██╗ ██║█████╗  ██████╔╝███████║                     ║" -ForegroundColor Cyan
    Write-Host "  ║    ██║██║╚██╗██║██╔══╝  ██╔══██╗██╔══██║                     ║" -ForegroundColor Cyan
    Write-Host "  ║    ██║██║ ╚████║██║     ██║  ██║██║  ██║                     ║" -ForegroundColor Cyan
    Write-Host "  ║    ╚═╝╚═╝  ╚═══╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝                     ║" -ForegroundColor Cyan
    Write-Host "  ║                                                              ║" -ForegroundColor Cyan
    Write-Host "  ║           Infrastructure Discovery Framework                 ║" -ForegroundColor White
    Write-Host "  ║                                                              ║" -ForegroundColor Cyan
    Write-Host "  ╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    # Show existing environments
    $environments = Get-EnvironmentList
    if ($environments.Count -gt 0) {
        Write-Host "  Configured Environments: " -NoNewline -ForegroundColor Gray
        Write-Host ($environments -join ", ") -ForegroundColor Yellow
        Write-Host ""
    }
    
    Write-Host "  ┌──────────────────────────────────────────────────────────────┐" -ForegroundColor DarkGray
    Write-Host "  │  [1] Setup New Environment                                   │" -ForegroundColor White
    Write-Host "  │  [2] Run Infrastructure Discovery                            │" -ForegroundColor White
    Write-Host "  │  [3] Generate HTML Portal                                    │" -ForegroundColor White
    Write-Host "  │  [4] Deploy Portal to IIS                                    │" -ForegroundColor White
    Write-Host "  │  [5] Full Workflow (Discover → Generate → Deploy)            │" -ForegroundColor White
    Write-Host "  ├──────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  [C] Manage Credentials                                      │" -ForegroundColor Gray
    Write-Host "  │  [E] Edit Environment Config                                 │" -ForegroundColor Gray
    Write-Host "  │  [V] Generate Visio Diagrams                                 │" -ForegroundColor Gray
    Write-Host "  ├──────────────────────────────────────────────────────────────┤" -ForegroundColor DarkGray
    Write-Host "  │  [Q] Quit                                                    │" -ForegroundColor Gray
    Write-Host "  └──────────────────────────────────────────────────────────────┘" -ForegroundColor DarkGray
    Write-Host ""
    
    $choice = Read-Host "  Select option"
    return $choice
}

function Start-InteractiveMenu {
    Import-InfraModules
    
    do {
        $choice = Show-MainMenu
        
        switch ($choice) {
            '1' { Invoke-Setup }
            '2' { Invoke-Discovery }
            '3' { Invoke-GeneratePortal -Open }
            '4' { Invoke-Deploy }
            '5' {
                # Full workflow
                $env = Select-Environment
                if ($env) {
                    Write-Host "`n=== Running Full Workflow ===" -ForegroundColor Cyan
                    
                    # Discovery
                    Write-Host "`nStep 1: Infrastructure Discovery" -ForegroundColor Yellow
                    Start-InfrastructureDiscovery -Environment $env
                    
                    # Generate Portal
                    Write-Host "`nStep 2: Generate Portal" -ForegroundColor Yellow
                    $portalPath = New-InfraPortal -Environment $env
                    
                    # Deploy
                    Write-Host "`nStep 3: Deploy Portal" -ForegroundColor Yellow
                    $deploy = Read-Host "Deploy to web server? (Y/N)"
                    if ($deploy -match '^[Yy]') {
                        $server = Read-Host "Target server"
                        $hostname = Read-Host "Portal hostname (optional)"
                        
                        $params = @{
                            Environment  = $env
                            TargetServer = $server
                        }
                        if ($hostname) { $params.Hostname = $hostname }
                        
                        Deploy-InfraPortal @params
                    }
                    else {
                        Write-Host "`nPortal ready at: $portalPath" -ForegroundColor Green
                        Start-Process $portalPath
                    }
                }
            }
            'C' {
                Write-Host "`n=== Credential Management ===" -ForegroundColor Cyan
                Get-InfraCredentialList
                
                Write-Host "`n[S] Set credential  [R] Remove credential  [T] Test credential  [B] Back" -ForegroundColor Gray
                $credChoice = Read-Host "Select"
                
                switch ($credChoice.ToUpper()) {
                    'S' {
                        $env = Read-Host "Environment name"
                        Set-InfraCredential -Environment $env
                    }
                    'R' {
                        $env = Read-Host "Environment name"
                        Remove-InfraCredential -Environment $env
                    }
                    'T' {
                        $env = Read-Host "Environment name"
                        Test-InfraCredential -Environment $env -TestConnection
                    }
                }
            }
            'E' {
                Write-Host "`nOpening configuration file..." -ForegroundColor Cyan
                if (Test-Path $script:ConfigPath) {
                    Start-Process notepad $script:ConfigPath
                }
                else {
                    Write-Warning "No configuration file exists yet. Set up an environment first."
                }
            }
            'V' {
                $env = Select-Environment
                if ($env) {
                    $visioScript = Join-Path $PSScriptRoot "Scripts\Generate-Visio.ps1"
                    if (Test-Path $visioScript) {
                        & $visioScript -Environment $env
                    }
                    else {
                        Write-Warning "Visio generation script not found."
                    }
                }
            }
            'Q' { return }
        }
        
        if ($choice -ne 'Q') {
            Write-Host "`nPress any key to continue..." -ForegroundColor Gray
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
        
    } while ($choice -ne 'Q')
}
#endregion

#region Main Execution
# Load modules
Import-InfraModules

# Execute based on action parameter
switch ($Action) {
    'Setup' {
        Invoke-Setup -Env $Environment
    }
    'Discover' {
        if (-not $Environment) {
            Write-Error "Environment parameter required for Discover action."
            exit 1
        }
        Invoke-Discovery -Env $Environment
    }
    'GeneratePortal' {
        if (-not $Environment) {
            Write-Error "Environment parameter required for GeneratePortal action."
            exit 1
        }
        Invoke-GeneratePortal -Env $Environment -Open:$OpenPortal
    }
    'Deploy' {
        if (-not $Environment -or -not $TargetServer) {
            Write-Error "Environment and TargetServer parameters required for Deploy action."
            exit 1
        }
        Invoke-Deploy -Env $Environment -Server $TargetServer -Host $Hostname
    }
    'ListEnvironments' {
        $envs = Get-EnvironmentList
        if ($envs.Count -gt 0) {
            Write-Host "`nConfigured Environments:" -ForegroundColor Cyan
            $envs | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
        }
        else {
            Write-Host "No environments configured." -ForegroundColor Yellow
        }
    }
    'Menu' {
        Start-InteractiveMenu
    }
}
#endregion


