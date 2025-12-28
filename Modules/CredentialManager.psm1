<#
.SYNOPSIS
    Secure credential management module for InfraDiscovery framework.

.DESCRIPTION
    Provides functions to securely store, retrieve, and manage credentials
    for multiple environments using Windows DPAPI encryption.

.NOTES
    Author: InfraDiscovery Framework
    Version: 1.0
#>

#region Configuration
$script:CredentialBasePath = Join-Path $PSScriptRoot "..\Credentials"
$script:ConfigPath = Join-Path $PSScriptRoot "..\Config\environments.json"
#endregion

#region Private Functions
function Get-CredentialFilePath {
    param([string]$Environment)
    
    if (-not (Test-Path $script:CredentialBasePath)) {
        New-Item -Path $script:CredentialBasePath -ItemType Directory -Force | Out-Null
    }
    
    return Join-Path $script:CredentialBasePath "$Environment-admin.xml"
}

function Test-CredentialFileExists {
    param([string]$Environment)
    
    $credPath = Get-CredentialFilePath -Environment $Environment
    return Test-Path $credPath
}
#endregion

#region Public Functions

<#
.SYNOPSIS
    Creates and stores encrypted credentials for an environment.

.DESCRIPTION
    Prompts for credentials and stores them encrypted using DPAPI.
    Only the user who created the credential can decrypt it.

.PARAMETER Environment
    The name of the environment to store credentials for.

.PARAMETER Credential
    Optional PSCredential object. If not provided, prompts for input.

.PARAMETER Force
    Overwrite existing credentials without prompting.

.EXAMPLE
    Set-InfraCredential -Environment "CustomerA"
    
.EXAMPLE
    $cred = Get-Credential
    Set-InfraCredential -Environment "CustomerA" -Credential $cred
#>
function Set-InfraCredential {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [ValidateNotNullOrEmpty()]
        [string]$Environment,
        
        [Parameter(Mandatory = $false)]
        [System.Management.Automation.PSCredential]$Credential,
        
        [switch]$Force
    )
    
    $credPath = Get-CredentialFilePath -Environment $Environment
    
    # Check for existing credentials
    if ((Test-Path $credPath) -and -not $Force) {
        $response = Read-Host "Credentials for '$Environment' already exist. Overwrite? (Y/N)"
        if ($response -notmatch '^[Yy]') {
            Write-Host "Operation cancelled." -ForegroundColor Yellow
            return $false
        }
    }
    
    # Get credentials if not provided
    if (-not $Credential) {
        Write-Host "`n=== Credential Setup for Environment: $Environment ===" -ForegroundColor Cyan
        Write-Host "Enter domain admin credentials (e.g., DOMAIN\Administrator or admin@domain.com)" -ForegroundColor Gray
        $Credential = Get-Credential -Message "Enter credentials for $Environment"
        
        if (-not $Credential) {
            Write-Warning "No credentials provided. Operation cancelled."
            return $false
        }
    }
    
    try {
        # Export credentials encrypted with DPAPI
        $Credential | Export-Clixml -Path $credPath -Force
        
        Write-Host "✓ Credentials saved securely for '$Environment'" -ForegroundColor Green
        Write-Host "  Path: $credPath" -ForegroundColor Gray
        Write-Host "  Note: Only $env:USERNAME on this computer can decrypt these credentials." -ForegroundColor Gray
        
        return $true
    }
    catch {
        Write-Error "Failed to save credentials: $_"
        return $false
    }
}

<#
.SYNOPSIS
    Retrieves stored credentials for an environment.

.DESCRIPTION
    Loads and decrypts stored credentials. Only works for the user
    who originally created the credential file.

.PARAMETER Environment
    The name of the environment to retrieve credentials for.

.PARAMETER Silent
    Don't display status messages.

.EXAMPLE
    $cred = Get-InfraCredential -Environment "CustomerA"
    Invoke-Command -ComputerName DC01 -Credential $cred -ScriptBlock { ... }
#>
function Get-InfraCredential {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [ValidateNotNullOrEmpty()]
        [string]$Environment,
        
        [switch]$Silent
    )
    
    $credPath = Get-CredentialFilePath -Environment $Environment
    
    if (-not (Test-Path $credPath)) {
        if (-not $Silent) {
            Write-Warning "No credentials found for '$Environment'."
            Write-Host "Use Set-InfraCredential -Environment '$Environment' to create them." -ForegroundColor Yellow
        }
        return $null
    }
    
    try {
        $credential = Import-Clixml -Path $credPath
        
        if (-not $Silent) {
            Write-Host "✓ Loaded credentials for '$Environment' (User: $($credential.UserName))" -ForegroundColor Green
        }
        
        return $credential
    }
    catch {
        Write-Error "Failed to load credentials for '$Environment'. You may not have access to decrypt them: $_"
        return $null
    }
}

<#
.SYNOPSIS
    Removes stored credentials for an environment.

.PARAMETER Environment
    The name of the environment to remove credentials for.

.PARAMETER Force
    Remove without confirmation prompt.

.EXAMPLE
    Remove-InfraCredential -Environment "CustomerA"
#>
function Remove-InfraCredential {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [ValidateNotNullOrEmpty()]
        [string]$Environment,
        
        [switch]$Force
    )
    
    $credPath = Get-CredentialFilePath -Environment $Environment
    
    if (-not (Test-Path $credPath)) {
        Write-Warning "No credentials found for '$Environment'."
        return $false
    }
    
    if (-not $Force) {
        $response = Read-Host "Are you sure you want to remove credentials for '$Environment'? (Y/N)"
        if ($response -notmatch '^[Yy]') {
            Write-Host "Operation cancelled." -ForegroundColor Yellow
            return $false
        }
    }
    
    try {
        Remove-Item -Path $credPath -Force
        Write-Host "✓ Credentials removed for '$Environment'" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Error "Failed to remove credentials: $_"
        return $false
    }
}

<#
.SYNOPSIS
    Tests if credentials exist and are valid for an environment.

.PARAMETER Environment
    The name of the environment to test credentials for.

.PARAMETER TestConnection
    Also test if credentials work by connecting to a domain controller.

.EXAMPLE
    Test-InfraCredential -Environment "CustomerA" -TestConnection
#>
function Test-InfraCredential {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [ValidateNotNullOrEmpty()]
        [string]$Environment,
        
        [switch]$TestConnection
    )
    
    $credPath = Get-CredentialFilePath -Environment $Environment
    
    # Check if file exists
    if (-not (Test-Path $credPath)) {
        Write-Host "✗ No credentials found for '$Environment'" -ForegroundColor Red
        return $false
    }
    
    # Try to load credentials
    try {
        $credential = Import-Clixml -Path $credPath
        Write-Host "✓ Credentials exist for '$Environment' (User: $($credential.UserName))" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Cannot decrypt credentials for '$Environment' (wrong user?)" -ForegroundColor Red
        return $false
    }
    
    # Optionally test connection
    if ($TestConnection) {
        # Load environment config to get DC
        $config = Get-Content $script:ConfigPath -Raw | ConvertFrom-Json
        
        if ($config.environments.$Environment) {
            $dc = $config.environments.$Environment.domainControllers | Select-Object -First 1
            
            if ($dc) {
                Write-Host "Testing connection to $dc..." -ForegroundColor Gray
                
                try {
                    $result = Invoke-Command -ComputerName $dc -Credential $credential -ScriptBlock {
                        $env:COMPUTERNAME
                    } -ErrorAction Stop
                    
                    Write-Host "✓ Successfully connected to $result" -ForegroundColor Green
                    return $true
                }
                catch {
                    Write-Host "✗ Connection failed: $_" -ForegroundColor Red
                    return $false
                }
            }
        }
        else {
            Write-Warning "Environment '$Environment' not configured. Cannot test connection."
        }
    }
    
    return $true
}

<#
.SYNOPSIS
    Lists all stored credentials.

.EXAMPLE
    Get-InfraCredentialList
#>
function Get-InfraCredentialList {
    [CmdletBinding()]
    param()
    
    if (-not (Test-Path $script:CredentialBasePath)) {
        Write-Host "No credentials stored yet." -ForegroundColor Yellow
        return @()
    }
    
    $credFiles = Get-ChildItem -Path $script:CredentialBasePath -Filter "*-admin.xml"
    
    if ($credFiles.Count -eq 0) {
        Write-Host "No credentials stored yet." -ForegroundColor Yellow
        return @()
    }
    
    Write-Host "`n=== Stored Credentials ===" -ForegroundColor Cyan
    
    $results = foreach ($file in $credFiles) {
        $envName = $file.BaseName -replace '-admin$', ''
        
        try {
            $cred = Import-Clixml -Path $file.FullName
            $username = $cred.UserName
            $canDecrypt = $true
        }
        catch {
            $username = "(cannot decrypt)"
            $canDecrypt = $false
        }
        
        [PSCustomObject]@{
            Environment  = $envName
            Username     = $username
            CanDecrypt   = $canDecrypt
            LastModified = $file.LastWriteTime
            Path         = $file.FullName
        }
    }
    
    $results | Format-Table -AutoSize
    return $results
}

<#
.SYNOPSIS
    Interactive credential setup wizard.

.PARAMETER Environment
    The name of the environment to set up.

.EXAMPLE
    Initialize-InfraCredential -Environment "NewCustomer"
#>
function Initialize-InfraCredential {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $false)]
        [string]$Environment
    )
    
    Write-Host "`n" -NoNewline
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║           InfraDiscovery Credential Setup Wizard             ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    
    # Get environment name if not provided
    if (-not $Environment) {
        Write-Host "`nExisting environments:" -ForegroundColor Gray
        $existing = Get-InfraCredentialList
        
        Write-Host "`nEnter environment name (e.g., CustomerName, ProjectCode):" -ForegroundColor White
        $Environment = Read-Host "Environment"
        
        if ([string]::IsNullOrWhiteSpace($Environment)) {
            Write-Warning "Environment name cannot be empty."
            return $false
        }
    }
    
    # Sanitize environment name
    $Environment = $Environment -replace '[^\w\-]', ''
    
    Write-Host "`nSetting up credentials for: $Environment" -ForegroundColor Yellow
    Write-Host "─────────────────────────────────────────" -ForegroundColor Gray
    
    # Set the credential
    $result = Set-InfraCredential -Environment $Environment
    
    if ($result) {
        Write-Host "`n✓ Credential setup complete!" -ForegroundColor Green
        Write-Host "`nNext steps:" -ForegroundColor Cyan
        Write-Host "  1. Configure environment: Edit Config\environments.json" -ForegroundColor Gray
        Write-Host "  2. Run discovery: .\Start-InfraDiscovery.ps1 -Action Discover -Environment '$Environment'" -ForegroundColor Gray
    }
    
    return $result
}
#endregion

# Export functions
Export-ModuleMember -Function @(
    'Set-InfraCredential',
    'Get-InfraCredential',
    'Remove-InfraCredential',
    'Test-InfraCredential',
    'Get-InfraCredentialList',
    'Initialize-InfraCredential'
)
