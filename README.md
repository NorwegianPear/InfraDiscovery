# InfraDiscovery

A modular PowerShell-based infrastructure discovery, documentation, and portal deployment framework.

## Features

- **Credential Management**: Secure encrypted credential storage per environment
- **Infrastructure Discovery**: Automated discovery of AD, DNS, DHCP, Servers, Workstations, PKI, IIS
- **HTML Portal Generation**: Beautiful responsive documentation portal with deep analysis
- **Web Portal Deployment**: Deploy to IIS with scheduled data refresh
- **Visio Diagram Generation**: Professional diagrams using vendor stencils
- **Multi-Environment Support**: Manage multiple environments from one installation

## Quick Start

```powershell
# 1. Clone and navigate to repo
cd InfraDiscovery

# 2. Launch the interactive menu
.\Start-InfraDiscovery.ps1

# 3. Or run specific commands:
.\Start-InfraDiscovery.ps1 -Action Setup -Environment "MyCompany"
.\Start-InfraDiscovery.ps1 -Action Discover -Environment "MyCompany"
.\Start-InfraDiscovery.ps1 -Action GeneratePortal -Environment "MyCompany"
.\Start-InfraDiscovery.ps1 -Action Deploy -Environment "MyCompany" -TargetServer "WEB01"
```

## Directory Structure

```
InfraDiscovery/
├── Start-InfraDiscovery.ps1    # Main entry point with interactive menu
├── Config/
│   └── environments.json       # Environment configurations
├── Credentials/
│   └── [Environment]-admin.xml # Encrypted credentials per environment
├── Modules/
│   ├── CredentialManager.psm1  # Secure credential handling
│   ├── InfraDiscovery.psm1     # Discovery functions
│   ├── PortalGenerator.psm1    # HTML portal generation
│   └── PortalDeployer.psm1     # IIS deployment
├── Templates/
│   ├── Portal-Template.html    # Base portal template
│   └── Styles/                 # CSS and assets
├── Environments/
│   └── [Environment]/          # Per-environment data
│       ├── Data/               # Discovery JSON output
│       ├── Reports/            # Generated HTML portals
│       └── Diagrams/           # Visio diagrams
└── Scripts/
    └── Generate-Visio.ps1      # Visio diagram generation
```

## Environment Setup

### 1. Create New Environment

```powershell
.\Start-InfraDiscovery.ps1 -Action Setup -Environment "CustomerName"
```

This will prompt for:
- Domain name (e.g., ad.customer.no)
- Domain controller(s)
- Admin credentials (stored encrypted)

### 2. Run Discovery

```powershell
.\Start-InfraDiscovery.ps1 -Action Discover -Environment "CustomerName"
```

Discovers:
- Active Directory (forest, domains, sites, OUs, GPOs)
- DNS zones and records
- DHCP scopes
- Servers with roles (DC, DNS, DHCP, File, SQL, IIS, PKI)
- Workstations
- Network topology

### 3. Generate Portal

```powershell
.\Start-InfraDiscovery.ps1 -Action GeneratePortal -Environment "CustomerName"
```

Creates a comprehensive HTML portal with:
- Dashboard overview
- Server inventory
- Active Directory details
- Network configuration
- Security posture analysis
- Capacity planning
- Risk assessment

### 4. Deploy to IIS

```powershell
.\Start-InfraDiscovery.ps1 -Action Deploy -Environment "CustomerName" -TargetServer "WEB01" -Hostname "infra.customer.no"
```

## Credential Security

Credentials are stored using Windows DPAPI encryption:
- Encrypted with current user's Windows credentials
- Only readable by the user who created them
- Stored in `Credentials/[Environment]-admin.xml`

```powershell
# Manually manage credentials
Import-Module .\Modules\CredentialManager.psm1
Set-InfraCredential -Environment "MyCompany"
Get-InfraCredential -Environment "MyCompany"
Remove-InfraCredential -Environment "MyCompany"
```

## Requirements

- Windows PowerShell 5.1 or PowerShell 7+
- Active Directory PowerShell module (RSAT)
- Admin credentials for target environment
- For IIS deployment: WebAdministration module on target server

## License

MIT License - Use freely for any infrastructure documentation needs.
