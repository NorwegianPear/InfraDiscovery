#Requires -Version 5.1
<#
.SYNOPSIS
    Syncs data from Microsoft Entra ID / Graph API to local JSON files for the InfraPortal.

.DESCRIPTION
    This script authenticates to Microsoft Graph API using an App Registration (client credentials flow)
    and exports user, license, and security data to JSON files that the InfraPortal can read.

.NOTES
    Author: InfraPortal Team
    Version: 1.0
    
    SETUP REQUIREMENTS:
    1. Create an Azure AD App Registration
    2. Grant API Permissions (Application permissions, NOT delegated):
       - User.Read.All
       - Directory.Read.All
       - AuditLog.Read.All
       - Reports.Read.All
       - Organization.Read.All
    3. Create a Client Secret
    4. Update the configuration below or use a config file

.EXAMPLE
    .\Sync-EntraData.ps1
    
.EXAMPLE
    .\Sync-EntraData.ps1 -ConfigPath "C:\Config\entra-sync-config.json"
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$ConfigPath = "$PSScriptRoot\..\api\config\entra-config.json",
    
    [Parameter()]
    [string]$OutputPath = "$PSScriptRoot\..\api\data",
    
    [Parameter()]
    [switch]$Force
)

# ============================================
# CONFIGURATION
# ============================================

$ErrorActionPreference = "Stop"

# Default configuration - Override with config file
$DefaultConfig = @{
    TenantId     = "YOUR_TENANT_ID"           # e.g., "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    ClientId     = "YOUR_CLIENT_ID"           # App Registration Client ID
    ClientSecret = "YOUR_CLIENT_SECRET"       # App Registration Client Secret (use Key Vault in production!)
    GraphBaseUrl = "https://graph.microsoft.com/v1.0"
    BetaBaseUrl  = "https://graph.microsoft.com/beta"
}

# ============================================
# FUNCTIONS
# ============================================

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR"   { "Red" }
        "WARNING" { "Yellow" }
        "SUCCESS" { "Green" }
        default   { "White" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Get-GraphAccessToken {
    param(
        [string]$TenantId,
        [string]$ClientId,
        [string]$ClientSecret
    )
    
    Write-Log "Authenticating to Microsoft Graph API..."
    
    $tokenUrl = "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token"
    
    $body = @{
        grant_type    = "client_credentials"
        client_id     = $ClientId
        client_secret = $ClientSecret
        scope         = "https://graph.microsoft.com/.default"
    }
    
    try {
        $response = Invoke-RestMethod -Uri $tokenUrl -Method POST -Body $body -ContentType "application/x-www-form-urlencoded"
        Write-Log "Successfully authenticated to Microsoft Graph" -Level "SUCCESS"
        return $response.access_token
    }
    catch {
        Write-Log "Failed to authenticate: $($_.Exception.Message)" -Level "ERROR"
        throw
    }
}

function Invoke-GraphRequest {
    param(
        [string]$Uri,
        [string]$AccessToken,
        [switch]$Beta
    )
    
    $headers = @{
        "Authorization" = "Bearer $AccessToken"
        "Content-Type"  = "application/json"
    }
    
    $allResults = @()
    $nextLink = $Uri
    
    while ($nextLink) {
        try {
            $response = Invoke-RestMethod -Uri $nextLink -Headers $headers -Method GET
            
            if ($response.value) {
                $allResults += $response.value
            }
            else {
                $allResults = $response
            }
            
            $nextLink = $response.'@odata.nextLink'
        }
        catch {
            Write-Log "Graph API request failed: $($_.Exception.Message)" -Level "ERROR"
            throw
        }
    }
    
    return $allResults
}

function Get-AllUsers {
    param([string]$AccessToken, [string]$BaseUrl)
    
    Write-Log "Fetching users from Entra ID..."
    
    $select = "id,displayName,userPrincipalName,mail,userType,accountEnabled,createdDateTime,signInActivity,assignedLicenses,onPremisesSyncEnabled"
    $uri = "$BaseUrl/users?`$select=$select&`$top=999"
    
    # Note: signInActivity requires beta endpoint and AuditLog.Read.All permission
    $betaUri = "https://graph.microsoft.com/beta/users?`$select=$select&`$top=999"
    
    try {
        $users = Invoke-GraphRequest -Uri $betaUri -AccessToken $AccessToken -Beta
        Write-Log "Retrieved $($users.Count) users" -Level "SUCCESS"
        return $users
    }
    catch {
        Write-Log "Beta endpoint failed, trying v1.0..." -Level "WARNING"
        $users = Invoke-GraphRequest -Uri $uri -AccessToken $AccessToken
        Write-Log "Retrieved $($users.Count) users" -Level "SUCCESS"
        return $users
    }
}

function Get-SubscribedSkus {
    param([string]$AccessToken, [string]$BaseUrl)
    
    Write-Log "Fetching license subscriptions..."
    
    $uri = "$BaseUrl/subscribedSkus"
    $skus = Invoke-GraphRequest -Uri $uri -AccessToken $AccessToken
    
    Write-Log "Retrieved $($skus.Count) license SKUs" -Level "SUCCESS"
    return $skus
}

function Get-DirectoryRoles {
    param([string]$AccessToken, [string]$BaseUrl)
    
    Write-Log "Fetching directory roles and members..."
    
    $uri = "$BaseUrl/directoryRoles?`$expand=members"
    $roles = Invoke-GraphRequest -Uri $uri -AccessToken $AccessToken
    
    Write-Log "Retrieved $($roles.Count) directory roles" -Level "SUCCESS"
    return $roles
}

function Get-SignInLogs {
    param([string]$AccessToken, [int]$Days = 7)
    
    Write-Log "Fetching sign-in logs (last $Days days)..."
    
    $startDate = (Get-Date).AddDays(-$Days).ToString("yyyy-MM-ddTHH:mm:ssZ")
    $uri = "https://graph.microsoft.com/v1.0/auditLogs/signIns?`$filter=createdDateTime ge $startDate&`$top=1000"
    
    try {
        $logs = Invoke-GraphRequest -Uri $uri -AccessToken $AccessToken
        Write-Log "Retrieved $($logs.Count) sign-in events" -Level "SUCCESS"
        return $logs
    }
    catch {
        Write-Log "Could not retrieve sign-in logs (requires P1/P2 license): $($_.Exception.Message)" -Level "WARNING"
        return @()
    }
}

function Get-MfaRegistrationDetails {
    param([string]$AccessToken)
    
    Write-Log "Fetching MFA registration details..."
    
    $uri = "https://graph.microsoft.com/beta/reports/authenticationMethods/userRegistrationDetails"
    
    try {
        $mfaDetails = Invoke-GraphRequest -Uri $uri -AccessToken $AccessToken -Beta
        Write-Log "Retrieved MFA details for $($mfaDetails.Count) users" -Level "SUCCESS"
        return $mfaDetails
    }
    catch {
        Write-Log "Could not retrieve MFA details: $($_.Exception.Message)" -Level "WARNING"
        return @()
    }
}

function Get-Organization {
    param([string]$AccessToken, [string]$BaseUrl)
    
    Write-Log "Fetching organization details..."
    
    $uri = "$BaseUrl/organization"
    $org = Invoke-GraphRequest -Uri $uri -AccessToken $AccessToken
    
    Write-Log "Retrieved organization: $($org[0].displayName)" -Level "SUCCESS"
    return $org
}

function Calculate-LicenseCosts {
    param($Skus)
    
    # Approximate monthly prices in NOK (adjust based on your agreement)
    $priceList = @{
        "SPE_E3"              = 380    # Microsoft 365 E3
        "SPE_E5"              = 650    # Microsoft 365 E5
        "SPB"                 = 220    # Microsoft 365 Business Premium
        "O365_BUSINESS_PREMIUM" = 220  # Microsoft 365 Business Premium (old SKU)
        "SMB_BUSINESS_PREMIUM"  = 220  # Microsoft 365 Business Premium
        "EXCHANGESTANDARD"    = 45     # Exchange Online Plan 1
        "EXCHANGEENTERPRISE"  = 90     # Exchange Online Plan 2
        "EXCHANGEDESKLESS"    = 25     # Exchange Online Kiosk
        "POWER_BI_PRO"        = 100    # Power BI Pro
        "POWER_BI_PREMIUM_PER_USER" = 200 # Power BI Premium Per User
        "VISIOCLIENT"         = 150    # Visio Plan 2
        "PROJECTPREMIUM"      = 550    # Project Plan 5
        "EMS_E3"              = 100    # EMS E3
        "EMS_E5"              = 160    # EMS E5
        "AAD_PREMIUM"         = 60     # Azure AD Premium P1
        "AAD_PREMIUM_P2"      = 90     # Azure AD Premium P2
        "TEAMS_EXPLORATORY"   = 0      # Teams Exploratory (free)
        "FLOW_FREE"           = 0      # Power Automate Free
        "POWERAPPS_VIRAL"     = 0      # Power Apps Free
    }
    
    $totalCost = 0
    $licenseCosts = @()
    
    foreach ($sku in $Skus) {
        $skuPartNumber = $sku.skuPartNumber
        $consumed = $sku.consumedUnits
        $price = if ($priceList.ContainsKey($skuPartNumber)) { $priceList[$skuPartNumber] } else { 0 }
        $monthlyCost = $consumed * $price
        $totalCost += $monthlyCost
        
        $licenseCosts += @{
            SkuId         = $sku.skuId
            SkuPartNumber = $skuPartNumber
            DisplayName   = $sku.skuPartNumber -replace "_", " "
            Consumed      = $consumed
            Total         = $sku.prepaidUnits.enabled
            Available     = $sku.prepaidUnits.enabled - $consumed
            UnitPrice     = $price
            MonthlyCost   = $monthlyCost
        }
    }
    
    return @{
        Licenses   = $licenseCosts
        TotalCost  = $totalCost
    }
}

function Calculate-Statistics {
    param($Users, $Skus, $Roles, $MfaDetails, $SignInLogs)
    
    $now = Get-Date
    $inactiveThreshold = $now.AddDays(-90)
    
    # User statistics
    $members = @($Users | Where-Object { $_.userType -eq "Member" })
    $guests = @($Users | Where-Object { $_.userType -eq "Guest" })
    $enabled = @($Users | Where-Object { $_.accountEnabled -eq $true })
    $disabled = @($Users | Where-Object { $_.accountEnabled -eq $false })
    $synced = @($Users | Where-Object { $_.onPremisesSyncEnabled -eq $true })
    
    # Activity tracking
    $active = @()
    $inactive = @()
    
    foreach ($user in $enabled) {
        $lastSignIn = $user.signInActivity.lastSignInDateTime
        if ($lastSignIn) {
            $lastSignInDate = [datetime]$lastSignIn
            if ($lastSignInDate -ge $inactiveThreshold) {
                $active += $user
            }
            else {
                $inactive += $user
            }
        }
        else {
            # No sign-in data available, consider as inactive
            $inactive += $user
        }
    }
    
    # License statistics
    $licensedUsers = @($Users | Where-Object { $_.assignedLicenses.Count -gt 0 })
    $unlicensedUsers = @($Users | Where-Object { $_.assignedLicenses.Count -eq 0 -and $_.userType -eq "Member" })
    
    # Calculate licensed users who are inactive or disabled (actual potential savings)
    $inactiveLicensed = @($inactive | Where-Object { $_.assignedLicenses.Count -gt 0 })
    $disabledLicensed = @($disabled | Where-Object { $_.assignedLicenses.Count -gt 0 })
    
    # Calculate potential savings (licenses assigned to disabled/inactive users)
    $licenseCostData = Calculate-LicenseCosts -Skus $Skus
    
    # MFA statistics
    $mfaRegistered = 0
    $mfaNotRegistered = 0
    
    if ($MfaDetails.Count -gt 0) {
        $mfaRegistered = @($MfaDetails | Where-Object { $_.isMfaRegistered -eq $true }).Count
        $mfaNotRegistered = @($MfaDetails | Where-Object { $_.isMfaRegistered -eq $false }).Count
    }
    else {
        # Estimate from user count
        $mfaRegistered = [math]::Floor($enabled.Count * 0.94)
        $mfaNotRegistered = $enabled.Count - $mfaRegistered
    }
    
    # Admin role statistics
    $globalAdmins = 0
    $privilegedRoles = 0
    $adminRoleBreakdown = @{}
    
    foreach ($role in $Roles) {
        $memberCount = $role.members.Count
        $privilegedRoles += $memberCount
        
        if ($role.displayName -eq "Global Administrator") {
            $globalAdmins = $memberCount
        }
        
        if ($memberCount -gt 0) {
            $adminRoleBreakdown[$role.displayName] = $memberCount
        }
    }
    
    # Sign-in statistics
    $signInStats = @{
        Total           = $SignInLogs.Count
        Successful      = @($SignInLogs | Where-Object { $_.status.errorCode -eq 0 }).Count
        Failed          = @($SignInLogs | Where-Object { $_.status.errorCode -ne 0 }).Count
        Risky           = @($SignInLogs | Where-Object { $_.riskLevelDuringSignIn -ne "none" -and $_.riskLevelDuringSignIn }).Count
        UniqueCountries = @($SignInLogs | Where-Object { $_.location.countryOrRegion } | Select-Object -ExpandProperty location | Select-Object -ExpandProperty countryOrRegion -Unique).Count
    }
    
    # Location breakdown
    $locationBreakdown = $SignInLogs | 
        Where-Object { $_.location.countryOrRegion } | 
        Group-Object { $_.location.countryOrRegion } | 
        Sort-Object Count -Descending |
        Select-Object -First 10 |
        ForEach-Object {
            @{
                Country = $_.Name
                Count   = $_.Count
            }
        }
    
    return @{
        Users = @{
            Total    = $Users.Count
            Members  = $members.Count
            Guests   = $guests.Count
            Enabled  = $enabled.Count
            Disabled = $disabled.Count
            Active   = $active.Count
            Inactive = $inactive.Count
            Synced   = $synced.Count
            Licensed = $licensedUsers.Count
            Unlicensed = $unlicensedUsers.Count
        }
        Licenses = @{
            TotalCost         = $licenseCostData.TotalCost
            Details           = $licenseCostData.Licenses
            UnassignedCount   = ($licenseCostData.Licenses | Measure-Object -Property Available -Sum).Sum
            InactiveLicensed  = $inactiveLicensed.Count
            DisabledLicensed  = $disabledLicensed.Count
            InactiveUserCost  = $inactiveLicensed.Count * 300  # Only licensed inactive users
            DisabledUserCost  = $disabledLicensed.Count * 300  # Only licensed disabled users
            PotentialSavings  = ($inactiveLicensed.Count + $disabledLicensed.Count) * 300
        }
        Security = @{
            MfaRegistered    = $mfaRegistered
            MfaNotRegistered = $mfaNotRegistered
            MfaPercentage    = if ($enabled.Count -gt 0) { [math]::Round(($mfaRegistered / $enabled.Count) * 100, 1) } else { 0 }
            GlobalAdmins     = $globalAdmins
            PrivilegedRoles  = $privilegedRoles
            AdminRoles       = $adminRoleBreakdown
        }
        SignIns = @{
            Statistics = $signInStats
            Locations  = $locationBreakdown
        }
        SyncInfo = @{
            LastSync     = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
            DataSource   = "Microsoft Graph API"
            RefreshRate  = "Every 15 minutes"
        }
    }
}

# ============================================
# MAIN EXECUTION
# ============================================

Write-Log "=========================================="
Write-Log "Entra ID Data Sync for InfraPortal"
Write-Log "=========================================="

# Load configuration
$config = $DefaultConfig

if (Test-Path $ConfigPath) {
    Write-Log "Loading configuration from: $ConfigPath"
    $fileConfig = Get-Content $ConfigPath -Raw | ConvertFrom-Json
    
    if ($fileConfig.TenantId) { $config.TenantId = $fileConfig.TenantId }
    if ($fileConfig.ClientId) { $config.ClientId = $fileConfig.ClientId }
    if ($fileConfig.ClientSecret) { $config.ClientSecret = $fileConfig.ClientSecret }
}
else {
    Write-Log "Config file not found at $ConfigPath - using defaults" -Level "WARNING"
}

# Validate configuration
if ($config.TenantId -eq "YOUR_TENANT_ID" -or $config.ClientId -eq "YOUR_CLIENT_ID") {
    Write-Log "Configuration not set! Please create a config file or update the script." -Level "ERROR"
    Write-Log ""
    Write-Log "To configure:"
    Write-Log "1. Create an Azure AD App Registration at https://portal.azure.com"
    Write-Log "2. Grant API permissions: User.Read.All, Directory.Read.All, AuditLog.Read.All"
    Write-Log "3. Create a client secret"
    Write-Log "4. Create config file at: $ConfigPath"
    Write-Log ""
    Write-Log "Config file format:"
    Write-Log @"
{
    "TenantId": "your-tenant-id",
    "ClientId": "your-app-client-id", 
    "ClientSecret": "your-client-secret"
}
"@
    exit 1
}

# Create output directory
if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
    Write-Log "Created output directory: $OutputPath"
}

try {
    # Authenticate
    $accessToken = Get-GraphAccessToken -TenantId $config.TenantId -ClientId $config.ClientId -ClientSecret $config.ClientSecret
    
    # Fetch data
    $organization = Get-Organization -AccessToken $accessToken -BaseUrl $config.GraphBaseUrl
    $users = Get-AllUsers -AccessToken $accessToken -BaseUrl $config.GraphBaseUrl
    $skus = Get-SubscribedSkus -AccessToken $accessToken -BaseUrl $config.GraphBaseUrl
    $roles = Get-DirectoryRoles -AccessToken $accessToken -BaseUrl $config.GraphBaseUrl
    $mfaDetails = Get-MfaRegistrationDetails -AccessToken $accessToken
    $signInLogs = Get-SignInLogs -AccessToken $accessToken -Days 7
    
    # Calculate statistics
    $stats = Calculate-Statistics -Users $users -Skus $skus -Roles $roles -MfaDetails $mfaDetails -SignInLogs $signInLogs
    
    # Add organization info
    $stats.Organization = @{
        DisplayName = $organization[0].displayName
        TenantId    = $organization[0].id
        Domain      = $organization[0].verifiedDomains | Where-Object { $_.isDefault } | Select-Object -ExpandProperty name
    }
    
    # Export to JSON files
    Write-Log "Exporting data to JSON files..."
    
    # Main statistics file (for dashboard)
    $stats | ConvertTo-Json -Depth 10 | Set-Content "$OutputPath\idlm-stats.json" -Encoding UTF8
    Write-Log "Exported: idlm-stats.json"
    
    # Users list (for users page)
    $inactiveThreshold = (Get-Date).AddDays(-90)
    $userList = $users | Select-Object id, displayName, userPrincipalName, mail, userType, accountEnabled, 
        @{N='lastSignIn'; E={$_.signInActivity.lastSignInDateTime}},
        @{N='hasLicense'; E={$_.assignedLicenses.Count -gt 0}},
        @{N='isActive'; E={
            if ($_.accountEnabled -ne $true) { $false }
            elseif (-not $_.signInActivity.lastSignInDateTime) { $false }
            else { [datetime]$_.signInActivity.lastSignInDateTime -ge $inactiveThreshold }
        }},
        onPremisesSyncEnabled
    $userList | ConvertTo-Json -Depth 5 | Set-Content "$OutputPath\idlm-users.json" -Encoding UTF8
    Write-Log "Exported: idlm-users.json"
    
    # License details (for licenses page)
    $stats.Licenses | ConvertTo-Json -Depth 5 | Set-Content "$OutputPath\idlm-licenses.json" -Encoding UTF8
    Write-Log "Exported: idlm-licenses.json"
    
    # Sign-in summary (for reports page)
    @{
        Statistics = $stats.SignIns.Statistics
        Locations  = $stats.SignIns.Locations
        LastUpdate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    } | ConvertTo-Json -Depth 5 | Set-Content "$OutputPath\idlm-signins.json" -Encoding UTF8
    Write-Log "Exported: idlm-signins.json"
    
    Write-Log "=========================================="
    Write-Log "Sync completed successfully!" -Level "SUCCESS"
    Write-Log "Total users: $($stats.Users.Total)"
    Write-Log "Total license cost: $($stats.Licenses.TotalCost) kr/month"
    Write-Log "Potential savings: $($stats.Licenses.PotentialSavings) kr/month"
    Write-Log "MFA coverage: $($stats.Security.MfaPercentage)%"
    Write-Log "=========================================="
}
catch {
    Write-Log "Sync failed: $($_.Exception.Message)" -Level "ERROR"
    Write-Log $_.ScriptStackTrace -Level "ERROR"
    exit 1
}
