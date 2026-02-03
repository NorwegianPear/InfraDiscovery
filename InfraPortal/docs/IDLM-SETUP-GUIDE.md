# IDLM Integration Setup Guide

## Overview

The InfraPortal IDLM (Identity License Management) module can pull live data from Microsoft Entra ID using the Microsoft Graph API. Since the portal is hosted on-premises, we use a **backend data collector** approach.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           INFRASTRUCTURE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐ │
│  │   Scheduled Task  │────▶│  Sync-EntraData  │────▶│   JSON Files     │ │
│  │  (Every 15 min)   │     │   .ps1 Script    │     │  (api/data/*.json│ │
│  └──────────────────┘     └────────┬─────────┘     └────────┬─────────┘ │
│                                    │                         │          │
│                                    ▼                         │          │
│                           ┌──────────────────┐               │          │
│                           │ Microsoft Graph  │               │          │
│                           │      API         │               │          │
│                           └──────────────────┘               │          │
│                                    │                         │          │
│                                    │                         ▼          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                       IIS Web Server                              │   │
│  │  ┌─────────────────┐                    ┌─────────────────────┐  │   │
│  │  │   InfraPortal   │◀───── serves ─────│  Static JSON files   │  │   │
│  │  │   index.html    │                    │  (IDLM data)         │  │   │
│  │  └────────┬────────┘                    └─────────────────────┘  │   │
│  │           │                                                       │   │
│  │           ▼ JavaScript fetch()                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Setup Instructions

### Step 1: Create Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Configure:
   - **Name:** `InfraPortal Data Sync`
   - **Supported account types:** Single tenant
   - **Redirect URI:** Leave blank (not needed for client credentials flow)
5. Click **Register**

### Step 2: Grant API Permissions

1. Go to **API permissions** in your app registration
2. Click **Add a permission** → **Microsoft Graph** → **Application permissions**
3. Add these permissions:

| Permission | Purpose |
|------------|---------|
| `User.Read.All` | Read all user profiles |
| `Directory.Read.All` | Read directory data, groups, roles |
| `AuditLog.Read.All` | Read sign-in logs |
| `Reports.Read.All` | Read usage reports |
| `Organization.Read.All` | Read organization info |

4. Click **Grant admin consent for [Your Organization]**
5. Verify all permissions show green checkmarks

### Step 3: Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Set description: `InfraPortal Sync`
4. Set expiration: 24 months (recommended)
5. Click **Add**
6. **IMPORTANT:** Copy the **Value** immediately (it's only shown once!)

### Step 4: Configure the Script

1. Navigate to `InfraPortal/api/config/`
2. Copy `entra-config.example.json` to `entra-config.json`
3. Edit `entra-config.json`:

```json
{
    "TenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "ClientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "ClientSecret": "your-secret-value-here"
}
```

4. Get the values from Azure Portal:
   - **TenantId:** Overview page → Directory (tenant) ID
   - **ClientId:** Overview page → Application (client) ID
   - **ClientSecret:** The value you copied in Step 3

### Step 5: Test the Sync Script

```powershell
# Run manually to test
cd C:\inetpub\wwwroot\InfraPortal\scripts
.\Sync-EntraData.ps1

# Check output
Get-Content ..\api\data\idlm-stats.json | ConvertFrom-Json
```

### Step 6: Create Scheduled Task

```powershell
# Run as Administrator
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File C:\inetpub\wwwroot\InfraPortal\scripts\Sync-EntraData.ps1"
$trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 15) -Once -At (Get-Date)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName "InfraPortal-Entra-Sync" -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Syncs Entra ID data for InfraPortal IDLM"
```

### Step 7: Configure IIS for JSON API

Add a virtual directory or ensure the `api/data` folder is accessible:

```powershell
# Ensure MIME type for JSON is set (usually default in IIS)
# The JSON files will be served statically from /api/data/
```

## Output Files

The sync script creates these JSON files in `api/data/`:

| File | Description | Used By |
|------|-------------|---------|
| `idlm-stats.json` | Main statistics (users, licenses, security) | Dashboard |
| `idlm-users.json` | List of all users with details | Users page |
| `idlm-licenses.json` | License costs and allocations | Licenses page |
| `idlm-signins.json` | Sign-in statistics and locations | Reports page |

## InfraPortal JavaScript Integration

The portal's JavaScript loads data from these files:

```javascript
// Example fetch in InfraPortal
async function loadIDLMData() {
    try {
        const response = await fetch('/api/data/idlm-stats.json');
        const data = await response.json();
        updateDashboard(data);
    } catch (error) {
        console.error('Failed to load IDLM data:', error);
        // Fall back to demo data
        useDemoData();
    }
}
```

## Security Considerations

### Client Secret Protection
- **NEVER** commit `entra-config.json` to source control
- Add to `.gitignore`: `InfraPortal/api/config/entra-config.json`
- Consider using Azure Key Vault for production

### Principle of Least Privilege
- Only grant required permissions (listed above)
- Use **Application** permissions, not Delegated
- Review permissions quarterly

### Network Security
- The app registration allows access from any IP
- Consider using Conditional Access to restrict access
- Monitor sign-ins to the app registration

## Troubleshooting

### Authentication Errors

```
AADSTS7000215: Invalid client secret
```
→ Client secret expired or incorrect. Create a new one.

```
AADSTS700016: Application not found
```
→ Wrong ClientId or TenantId. Double-check values.

### Permission Errors

```
Insufficient privileges to complete the operation
```
→ Missing API permissions or admin consent not granted.

### No Data Returned

```
Retrieved 0 users
```
→ App registration may not have User.Read.All permission or user doesn't have Azure AD P1/P2 for sign-in activity.

## Alternative: Client-Side MSAL.js

For interactive user authentication (user signs in directly), you can use MSAL.js. This is useful for:
- User-specific views
- Real-time data
- Actions requiring user consent

See [MSAL.js Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/tutorial-v2-javascript-spa) for implementation details.

## Files Created

```
InfraPortal/
├── scripts/
│   └── Sync-EntraData.ps1       # Main sync script
├── api/
│   ├── config/
│   │   ├── entra-config.example.json  # Template config
│   │   └── entra-config.json          # Your config (create this)
│   └── data/
│       ├── idlm-stats.json      # Generated: Main statistics
│       ├── idlm-users.json      # Generated: User list
│       ├── idlm-licenses.json   # Generated: License data
│       └── idlm-signins.json    # Generated: Sign-in logs
└── docs/
    └── IDLM-SETUP-GUIDE.md      # This guide
```
