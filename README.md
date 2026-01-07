# InfraDiscovery

[![Atea](https://img.shields.io/badge/Atea-Norge%20AS-00a3e0?style=for-the-badge)](https://www.atea.no)
[![PowerShell](https://img.shields.io/badge/PowerShell-5.1+-5391FE?style=for-the-badge&logo=powershell&logoColor=white)](https://docs.microsoft.com/powershell/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20Server-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://www.microsoft.com/windows-server)

A modular PowerShell-based infrastructure discovery, documentation, and portal deployment framework.

> **Created by [Uy Le Phan Thai](mailto:uy.le.phan@atea.no)** | Senior Consultant - Infrastructure | [Atea Norge AS](https://www.atea.no)

## Features

- **Credential Management**: Secure encrypted credential storage per environment
- **Infrastructure Discovery**: Automated discovery of AD, DNS, DHCP, Servers, Workstations, PKI, IIS
- **Network Discovery**: Palo Alto firewall discovery (routes, interfaces, zones, VPNs)
- **HTML Portal Generation**: Beautiful responsive documentation portal with deep analysis
- **Web Portal Deployment**: Deploy to IIS with scheduled data refresh
- **Visio Diagram Generation**: Professional diagrams using vendor stencils
- **Performance Optimization**: Defender exclusions, SMB tuning
- **Jumbo Frame Deployment**: Phased MTU 9014 deployment with rollback
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
.\Start-InfraDiscovery.ps1 -Action Network -Environment "MyCompany"
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
│   ├── [Environment]-admin.xml     # AD/Windows credentials (DPAPI encrypted)
│   └── [Environment]-paloalto.xml  # Palo Alto API credentials
├── Modules/
│   ├── CredentialManager.psm1  # Secure credential handling
│   ├── InfraDiscovery.psm1     # Windows infrastructure discovery
│   ├── NetworkDiscovery.psm1   # Network device discovery (Palo Alto)
│   ├── NetworkDeviceStatus.psm1 # Live network device monitoring
│   ├── PortalGenerator.psm1    # HTML portal generation
│   ├── PortalDeployer.psm1     # IIS deployment
│   ├── PerformanceOptimizer.psm1  # Performance tuning
│   └── JumboFrameDeployer.psm1    # Jumbo Frame deployment
├── Templates/
│   └── network-infrastructure.json  # Network template
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

### 2. Configure Network Devices

Edit `Config/environments.json` to add network devices:

```json
{
  "environments": {
    "MyCompany": {
      "networkDevices": {
        "paloAlto": {
          "firewalls": ["10.0.0.1", "10.0.0.2"],
          "panorama": null
        }
      }
    }
  }
}
```

### 3. Set Palo Alto Credentials

```powershell
Import-Module .\Modules\NetworkDiscovery.psm1
Set-PaloAltoCredential -Environment "MyCompany"
```

### 4. Run Discovery

```powershell
# Windows infrastructure discovery
.\Start-InfraDiscovery.ps1 -Action Discover -Environment "CustomerName"

# Network device discovery (Palo Alto)
.\Start-InfraDiscovery.ps1 -Action Network -Environment "CustomerName"
```

## Network Discovery

### Palo Alto Firewall Discovery

Discovers the following from Palo Alto firewalls via REST API:

| Category | Data Collected |
|----------|----------------|
| **System Info** | Hostname, Model, Serial, Software Version, Uptime |
| **Interfaces** | Name, IP, Zone, Status, MAC, Speed |
| **Routes** | Destination, NextHop, Interface, Metric |
| **Zones** | Name, Type (Layer2/Layer3), Interfaces |
| **VPN Tunnels** | Tunnel interfaces and status |

```powershell
# Direct module usage
Import-Module .\Modules\NetworkDiscovery.psm1

$cred = Get-Credential
$data = Get-PaloAltoDiscovery -Firewalls @("10.25.99.55") -Credential $cred

# View discovered networks
$data.Firewalls[0].Routes | Where-Object { $_.Destination -ne "0.0.0.0/0" }
```

### Output

Network discovery saves to:
- `Environments/[Environment]/Data/network-discovery-[timestamp].json`
- `Environments/[Environment]/Data/network-discovery-latest.json`

## Modules Reference

### NetworkDiscovery.psm1

```powershell
Import-Module .\Modules\NetworkDiscovery.psm1

# Palo Alto Discovery
Get-PaloAltoDiscovery -Firewalls @("10.0.0.1") -Credential $cred

# Full network discovery for environment
Start-NetworkDiscovery -Environment "MyCompany"

# Credential management
Set-PaloAltoCredential -Environment "MyCompany"
Get-PaloAltoCredential -Environment "MyCompany"
```

### PerformanceOptimizer.psm1

```powershell
Import-Module .\Modules\PerformanceOptimizer.psm1

# Check Defender exclusions
Get-DefenderExclusions -ComputerName "SERVER01" -Credential $cred

# Deploy Defender exclusions
Deploy-DefenderExclusions -ComputerName "10.x.x.10" -Credential $cred `
    -ExclusionPaths @("D:\Apps", "D:\Data") `
    -ExclusionProcesses @("app.exe")

# Get overall performance status
Get-PerformanceStatus -ComputerName "SERVER01" -Credential $cred
```

### JumboFrameDeployer.psm1

```powershell
Import-Module .\Modules\JumboFrameDeployer.psm1

# Check Jumbo Frame support
Test-JumboFrameSupport -ComputerName "SERVER01" -Credential $cred

# Get status across servers
$servers = @{ "APP01" = "10.x.x.10"; "SRV01" = "10.x.x.20" }
Get-JumboFrameStatus -Servers $servers -Credential $cred

# Interactive deployment wizard
Start-JumboFrameDeployment -Servers $servers -Credential $cred
```

## Credential Security

Credentials are stored using Windows DPAPI encryption:
- Encrypted with current user's Windows credentials
- Only readable by the user who created them
- Stored in `Credentials/[Environment]-admin.xml` (Windows) or `[Environment]-paloalto.xml` (Network)

```powershell
# Manually manage Windows credentials
Import-Module .\Modules\CredentialManager.psm1
Set-InfraCredential -Environment "MyCompany"
Get-InfraCredential -Environment "MyCompany"

# Manage Palo Alto credentials
Import-Module .\Modules\NetworkDiscovery.psm1
Set-PaloAltoCredential -Environment "MyCompany"
```

## Requirements

- Windows PowerShell 5.1 or PowerShell 7+
- Active Directory PowerShell module (RSAT) - for AD discovery
- Admin credentials for target environment
- For Palo Alto: API access enabled on firewall
- For IIS deployment: WebAdministration module on target server

## Interactive Menu

```
  ╔══════════════════════════════════════════════════════════════╗
  ║            Infrastructure Discovery Framework                 ║
  ╚══════════════════════════════════════════════════════════════╝

  ┌──────────────────────────────────────────────────────────────┐
  │  [1] Setup New Environment                                   │
  │  [2] Run Infrastructure Discovery                            │
  │  [3] Run Network Discovery (Palo Alto, etc.)                 │
  │  [4] Generate HTML Portal                                    │
  │  [5] Deploy Portal to IIS                                    │
  │  [6] Full Workflow (Discover → Generate → Deploy)            │
  ├──────────────────────────────────────────────────────────────┤
  │  [C] Manage Credentials                                      │
  │  [E] Edit Environment Config                                 │
  │  [V] Generate Visio Diagrams                                 │
  │  [P] Performance Optimization                                │
  │  [J] Jumbo Frames Deployment                                 │
  └──────────────────────────────────────────────────────────────┘
```

## 👤 Author

**Uy Le Phan Thai**  
Senior Consultant - Infrastructure  
[Atea Norge AS](https://www.atea.no)

## 👤 Author

**Uy Le Phan Thai**  
Senior Consultant - Infrastructure  
[Atea Norge AS](https://www.atea.no)

## License

MIT License - Use freely for any infrastructure documentation needs.  
© 2026 Atea Norge AS  
© 2026 Atea Norge AS



