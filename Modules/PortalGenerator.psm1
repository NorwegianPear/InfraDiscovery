<#
.SYNOPSIS
    HTML Portal Generator module for InfraDiscovery framework.

.DESCRIPTION
    Generates comprehensive HTML documentation portals from infrastructure
    discovery data with modern responsive design and deep analysis.

.NOTES
    Author: InfraDiscovery Framework
    Version: 1.0
#>

#region Configuration
$script:ModuleRoot = $PSScriptRoot
$script:TemplatesPath = Join-Path $PSScriptRoot "..\Templates"
#endregion

#region Helper Functions
function Get-EnvironmentDataPath {
    param([string]$Environment)
    return Join-Path $PSScriptRoot "..\Environments\$Environment\Data"
}

function Get-EnvironmentReportsPath {
    param([string]$Environment)
    $path = Join-Path $PSScriptRoot "..\Environments\$Environment\Reports"
    if (-not (Test-Path $path)) {
        New-Item -Path $path -ItemType Directory -Force | Out-Null
    }
    return $path
}

function Get-DiscoveryData {
    param([string]$Environment)
    
    $dataPath = Get-EnvironmentDataPath -Environment $Environment
    $latestFile = Join-Path $dataPath "discovery-latest.json"
    
    if (-not (Test-Path $latestFile)) {
        throw "No discovery data found for '$Environment'. Run discovery first."
    }
    
    return Get-Content $latestFile -Raw | ConvertFrom-Json
}

function ConvertTo-SafeHtml {
    param([string]$Text)
    if (-not $Text) { return "" }
    return [System.Web.HttpUtility]::HtmlEncode($Text)
}
#endregion

#region Portal Generation

<#
.SYNOPSIS
    Generates the complete HTML portal for an environment.
#>
function New-InfraPortal {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Environment,
        
        [Parameter(Mandatory = $false)]
        [string]$Theme = "modern-dark",
        
        [Parameter(Mandatory = $false)]
        [switch]$OpenInBrowser
    )
    
    Write-Host "`n" -NoNewline
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║            Generating Portal - $($Environment.PadRight(24))    ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    
    # Load discovery data
    try {
        $data = Get-DiscoveryData -Environment $Environment
        Write-Host "✓ Loaded discovery data from $($data.DiscoveryDate)" -ForegroundColor Green
    }
    catch {
        Write-Error "Failed to load discovery data: $_"
        return $null
    }
    
    # Generate HTML
    $html = Get-PortalHtml -Data $data -Environment $Environment -Theme $Theme
    
    # Save portal
    $reportsPath = Get-EnvironmentReportsPath -Environment $Environment
    $portalFile = Join-Path $reportsPath "Infrastructure-Portal.html"
    $timestampFile = Join-Path $reportsPath "Infrastructure-Portal-$(Get-Date -Format 'yyyyMMdd-HHmmss').html"
    
    $html | Out-File $portalFile -Encoding UTF8
    $html | Out-File $timestampFile -Encoding UTF8
    
    Write-Host "✓ Portal generated: $portalFile" -ForegroundColor Green
    
    if ($OpenInBrowser) {
        Start-Process $portalFile
    }
    
    return $portalFile
}

<#
.SYNOPSIS
    Generates the full HTML content for the portal.
#>
function Get-PortalHtml {
    param(
        [object]$Data,
        [string]$Environment,
        [string]$Theme
    )
    
    # Calculate statistics
    $totalServers = $Data.Servers.Count
    $onlineServers = ($Data.Servers | Where-Object Online).Count
    $dcCount = ($Data.Servers | Where-Object { $_.Roles -contains 'DomainController' }).Count
    $totalWorkstations = $Data.Workstations.Count
    
    # Calculate security score
    $securityScore = Get-SecurityScore -Data $Data
    
    # Build server rows
    $serverRows = ""
    foreach ($server in ($Data.Servers | Sort-Object Name)) {
        $statusClass = if ($server.Online) { "status-online" } else { "status-offline" }
        $statusText = if ($server.Online) { "Online" } else { "Offline" }
        $roles = if ($server.Roles) { ($server.Roles -join ", ") } else { "-" }
        $memoryText = if ($server.Hardware.TotalMemoryGB) { "$($server.Hardware.TotalMemoryGB) GB" } else { "-" }
        
        $serverRows += @"
        <tr>
            <td><strong>$($server.Name)</strong></td>
            <td>$($server.IPv4Address ?? '-')</td>
            <td>$($server.OperatingSystem ?? '-')</td>
            <td>$roles</td>
            <td>$memoryText</td>
            <td><span class="status-badge $statusClass">$statusText</span></td>
        </tr>
"@
    }
    
    # Build DC rows
    $dcRows = ""
    if ($Data.ActiveDirectory.DomainControllers) {
        foreach ($dc in $Data.ActiveDirectory.DomainControllers) {
            $roles = if ($dc.Roles) { ($dc.Roles -join ", ") } else { "-" }
            $gcText = if ($dc.IsGlobalCatalog) { "Yes" } else { "No" }
            
            $dcRows += @"
            <tr>
                <td><strong>$($dc.Name)</strong></td>
                <td>$($dc.HostName)</td>
                <td>$($dc.IPv4Address ?? '-')</td>
                <td>$($dc.Site ?? '-')</td>
                <td>$gcText</td>
                <td>$roles</td>
            </tr>
"@
        }
    }
    
    # Build DNS zone rows
    $dnsRows = ""
    if ($Data.DNS.Zones) {
        foreach ($zone in ($Data.DNS.Zones | Sort-Object ZoneName)) {
            $dnsRows += @"
            <tr>
                <td><strong>$($zone.ZoneName)</strong></td>
                <td>$($zone.ZoneType)</td>
                <td>$($zone.RecordCount)</td>
                <td>$($zone.ARecords)</td>
                <td>$(if ($zone.IsDsIntegrated) { 'Yes' } else { 'No' })</td>
            </tr>
"@
        }
    }
    
    # Build DHCP scope rows  
    $dhcpRows = ""
    if ($Data.DHCP.Scopes) {
        foreach ($scope in $Data.DHCP.Scopes) {
            $usageClass = if ($scope.PercentInUse -gt 80) { "text-danger" } elseif ($scope.PercentInUse -gt 60) { "text-warning" } else { "text-success" }
            
            $dhcpRows += @"
            <tr>
                <td><strong>$($scope.Name)</strong></td>
                <td>$($scope.ScopeId)</td>
                <td>$($scope.StartRange) - $($scope.EndRange)</td>
                <td>$($scope.InUse) / $($scope.Free + $scope.InUse)</td>
                <td class="$usageClass"><strong>$($scope.PercentInUse)%</strong></td>
                <td><span class="status-badge $(if ($scope.State -eq 'Active') { 'status-online' } else { 'status-offline' })">$($scope.State)</span></td>
            </tr>
"@
        }
    }

    # Generate the full HTML
    $html = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>$Environment Infrastructure Portal</title>
    <style>
        :root {
            --bg-primary: #0d1117;
            --bg-secondary: #161b22;
            --bg-tertiary: #21262d;
            --text-primary: #f0f6fc;
            --text-secondary: #8b949e;
            --accent-blue: #58a6ff;
            --accent-green: #3fb950;
            --accent-yellow: #d29922;
            --accent-red: #f85149;
            --accent-purple: #a371f7;
            --border-color: #30363d;
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
        }
        
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        
        /* Header */
        .header {
            background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
            border-bottom: 1px solid var(--border-color);
            padding: 30px 0;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 2.5em;
            background: linear-gradient(90deg, var(--accent-blue), var(--accent-purple));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .header .subtitle { color: var(--text-secondary); margin-top: 5px; }
        
        /* Navigation */
        .nav {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 30px;
            padding: 15px;
            background: var(--bg-secondary);
            border-radius: 10px;
            border: 1px solid var(--border-color);
        }
        
        .nav-btn {
            padding: 10px 20px;
            background: var(--bg-tertiary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 14px;
        }
        
        .nav-btn:hover, .nav-btn.active {
            background: var(--accent-blue);
            border-color: var(--accent-blue);
        }
        
        /* Cards */
        .card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 10px;
            padding: 25px;
        }
        
        .card h3 {
            color: var(--text-secondary);
            font-size: 0.9em;
            text-transform: uppercase;
            margin-bottom: 10px;
        }
        
        .card .value {
            font-size: 2.5em;
            font-weight: bold;
            color: var(--accent-blue);
        }
        
        .card .value.green { color: var(--accent-green); }
        .card .value.yellow { color: var(--accent-yellow); }
        .card .value.red { color: var(--accent-red); }
        .card .value.purple { color: var(--accent-purple); }
        
        /* Tables */
        .table-container {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 30px;
        }
        
        .table-header {
            padding: 20px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .table-header h2 { font-size: 1.3em; }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }
        
        th {
            background: var(--bg-tertiary);
            color: var(--text-secondary);
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.85em;
        }
        
        tr:hover { background: var(--bg-tertiary); }
        
        /* Status badges */
        .status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 500;
        }
        
        .status-online { background: rgba(63, 185, 80, 0.2); color: var(--accent-green); }
        .status-offline { background: rgba(248, 81, 73, 0.2); color: var(--accent-red); }
        .status-warning { background: rgba(210, 153, 34, 0.2); color: var(--accent-yellow); }
        
        .text-success { color: var(--accent-green); }
        .text-warning { color: var(--accent-yellow); }
        .text-danger { color: var(--accent-red); }
        
        /* Pages */
        .page { display: none; }
        .page.active { display: block; }
        
        /* Security Score */
        .score-ring {
            width: 150px;
            height: 150px;
            margin: 20px auto;
        }
        
        .progress-ring {
            transform: rotate(-90deg);
        }
        
        .progress-ring-circle {
            stroke-dasharray: 440;
            stroke-dashoffset: calc(440 - (440 * var(--progress)) / 100);
            transition: stroke-dashoffset 1s ease;
        }
        
        /* Footer */
        .footer {
            text-align: center;
            padding: 30px;
            color: var(--text-secondary);
            border-top: 1px solid var(--border-color);
            margin-top: 50px;
        }
        
        /* Info panels */
        .info-panel {
            background: var(--bg-tertiary);
            border-left: 4px solid var(--accent-blue);
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        
        .info-panel.warning { border-left-color: var(--accent-yellow); }
        .info-panel.success { border-left-color: var(--accent-green); }
        .info-panel.danger { border-left-color: var(--accent-red); }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1>🏢 $Environment Infrastructure</h1>
            <p class="subtitle">Domain: $($Data.Domain) | Last Discovery: $($Data.DiscoveryDate)</p>
        </div>
    </div>
    
    <div class="container">
        <!-- Navigation -->
        <div class="nav">
            <button class="nav-btn active" onclick="showPage('dashboard')">📊 Dashboard</button>
            <button class="nav-btn" onclick="showPage('servers')">🖥️ Servers</button>
            <button class="nav-btn" onclick="showPage('ad')">🔐 Active Directory</button>
            <button class="nav-btn" onclick="showPage('dns')">🌐 DNS</button>
            <button class="nav-btn" onclick="showPage('dhcp')">📡 DHCP</button>
            <button class="nav-btn" onclick="showPage('security')">🛡️ Security</button>
            <button class="nav-btn" onclick="showPage('workstations')">💻 Workstations</button>
        </div>
        
        <!-- Dashboard Page -->
        <div id="dashboard" class="page active">
            <div class="card-grid">
                <div class="card">
                    <h3>Total Servers</h3>
                    <div class="value">$totalServers</div>
                    <p style="color: var(--text-secondary)">$onlineServers online</p>
                </div>
                <div class="card">
                    <h3>Domain Controllers</h3>
                    <div class="value purple">$dcCount</div>
                    <p style="color: var(--text-secondary)">FSMO roles distributed</p>
                </div>
                <div class="card">
                    <h3>Workstations</h3>
                    <div class="value green">$totalWorkstations</div>
                    <p style="color: var(--text-secondary)">Windows clients</p>
                </div>
                <div class="card">
                    <h3>Security Score</h3>
                    <div class="value $(if ($securityScore -ge 70) { 'green' } elseif ($securityScore -ge 50) { 'yellow' } else { 'red' })">$securityScore%</div>
                    <p style="color: var(--text-secondary)">Overall posture</p>
                </div>
            </div>
            
            <div class="info-panel">
                <strong>Environment Overview</strong><br>
                Forest: $($Data.ActiveDirectory.Forest.Name ?? 'N/A') | 
                Domain Mode: $($Data.ActiveDirectory.Domain.DomainMode ?? 'N/A') |
                Sites: $($Data.ActiveDirectory.Sites.Count ?? 0) |
                OUs: $($Data.ActiveDirectory.OrganizationalUnits.Count ?? 0) |
                GPOs: $($Data.ActiveDirectory.GroupPolicies.Count ?? 0)
            </div>
        </div>
        
        <!-- Servers Page -->
        <div id="servers" class="page">
            <div class="table-container">
                <div class="table-header">
                    <h2>🖥️ Server Inventory</h2>
                    <span style="color: var(--text-secondary)">$totalServers servers</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>IP Address</th>
                            <th>Operating System</th>
                            <th>Roles</th>
                            <th>Memory</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        $serverRows
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Active Directory Page -->
        <div id="ad" class="page">
            <div class="card-grid">
                <div class="card">
                    <h3>Forest Name</h3>
                    <div class="value" style="font-size: 1.5em;">$($Data.ActiveDirectory.Forest.Name ?? 'N/A')</div>
                </div>
                <div class="card">
                    <h3>Users</h3>
                    <div class="value green">$($Data.ActiveDirectory.Statistics.UserCount ?? 0)</div>
                </div>
                <div class="card">
                    <h3>Groups</h3>
                    <div class="value purple">$($Data.ActiveDirectory.Statistics.GroupCount ?? 0)</div>
                </div>
                <div class="card">
                    <h3>GPOs</h3>
                    <div class="value yellow">$($Data.ActiveDirectory.Statistics.GPOCount ?? 0)</div>
                </div>
            </div>
            
            <div class="table-container">
                <div class="table-header">
                    <h2>🔐 Domain Controllers</h2>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Hostname</th>
                            <th>IP Address</th>
                            <th>Site</th>
                            <th>Global Catalog</th>
                            <th>FSMO Roles</th>
                        </tr>
                    </thead>
                    <tbody>
                        $dcRows
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- DNS Page -->
        <div id="dns" class="page">
            <div class="table-container">
                <div class="table-header">
                    <h2>🌐 DNS Zones</h2>
                    <span style="color: var(--text-secondary)">$($Data.DNS.Zones.Count ?? 0) zones</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Zone Name</th>
                            <th>Type</th>
                            <th>Total Records</th>
                            <th>A Records</th>
                            <th>AD Integrated</th>
                        </tr>
                    </thead>
                    <tbody>
                        $dnsRows
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- DHCP Page -->
        <div id="dhcp" class="page">
            <div class="table-container">
                <div class="table-header">
                    <h2>📡 DHCP Scopes</h2>
                    <span style="color: var(--text-secondary)">$($Data.DHCP.Scopes.Count ?? 0) scopes</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Scope Name</th>
                            <th>Scope ID</th>
                            <th>Range</th>
                            <th>In Use / Total</th>
                            <th>Utilization</th>
                            <th>State</th>
                        </tr>
                    </thead>
                    <tbody>
                        $dhcpRows
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Security Page -->
        <div id="security" class="page">
            <div class="card-grid">
                <div class="card" style="text-align: center;">
                    <h3>Security Score</h3>
                    <svg class="score-ring" viewBox="0 0 160 160">
                        <circle cx="80" cy="80" r="70" fill="none" stroke="var(--bg-tertiary)" stroke-width="12"/>
                        <circle class="progress-ring progress-ring-circle" cx="80" cy="80" r="70" fill="none" 
                                stroke="$(if ($securityScore -ge 70) { 'var(--accent-green)' } elseif ($securityScore -ge 50) { 'var(--accent-yellow)' } else { 'var(--accent-red)' })" 
                                stroke-width="12" style="--progress: $securityScore"/>
                        <text x="80" y="85" text-anchor="middle" fill="var(--text-primary)" font-size="28" font-weight="bold">$securityScore%</text>
                    </svg>
                </div>
                <div class="card">
                    <h3>Domain Controllers</h3>
                    <div class="value green">$dcCount</div>
                    <p style="color: var(--text-secondary)">Redundancy $(if ($dcCount -ge 2) { '✓' } else { '⚠' })</p>
                </div>
                <div class="card">
                    <h3>PKI Infrastructure</h3>
                    <div class="value $(if ($Data.PKI.HasPKI) { 'green' } else { 'yellow' })">$(if ($Data.PKI.HasPKI) { 'Yes' } else { 'No' })</div>
                    <p style="color: var(--text-secondary)">Certificate Services</p>
                </div>
            </div>
            
            <div class="info-panel $(if ($securityScore -ge 70) { 'success' } elseif ($securityScore -ge 50) { 'warning' } else { 'danger' })">
                <strong>Security Assessment</strong><br>
                Score based on: DC redundancy, AD configuration, service availability, and infrastructure health.
            </div>
        </div>
        
        <!-- Workstations Page -->
        <div id="workstations" class="page">
            <div class="info-panel">
                <strong>Workstation Summary</strong><br>
                Total: $totalWorkstations Windows workstations in domain
            </div>
            
            <div class="table-container">
                <div class="table-header">
                    <h2>💻 Workstations (Sample)</h2>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Operating System</th>
                            <th>Last Logon</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        $(($Data.Workstations | Select-Object -First 50 | ForEach-Object {
                            "<tr><td><strong>$($_.Name)</strong></td><td>$($_.OperatingSystem)</td><td>$($_.LastLogon ?? 'N/A')</td><td><span class='status-badge $(if ($_.Enabled) { 'status-online' } else { 'status-offline' })'>$(if ($_.Enabled) { 'Enabled' } else { 'Disabled' })</span></td></tr>"
                        }) -join "`n")
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p>Generated by InfraDiscovery Framework | $(Get-Date -Format "yyyy-MM-dd HH:mm")</p>
            <p style="font-size: 0.9em;">Environment: $Environment | Domain: $($Data.Domain)</p>
        </div>
    </div>
    
    <script>
        function showPage(pageId) {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
            event.target.classList.add('active');
        }
    </script>
</body>
</html>
"@

    return $html
}

<#
.SYNOPSIS
    Calculates a security score based on infrastructure data.
#>
function Get-SecurityScore {
    param([object]$Data)
    
    $score = 50  # Base score
    
    # DC redundancy (+15)
    $dcCount = ($Data.Servers | Where-Object { $_.Roles -contains 'DomainController' }).Count
    if ($dcCount -ge 2) { $score += 15 }
    elseif ($dcCount -eq 1) { $score += 5 }
    
    # Online servers ratio (+10)
    $onlineRatio = ($Data.Servers | Where-Object Online).Count / [Math]::Max($Data.Servers.Count, 1)
    $score += [int]($onlineRatio * 10)
    
    # PKI infrastructure (+10)
    if ($Data.PKI.HasPKI) { $score += 10 }
    
    # Multiple sites (+5)
    if ($Data.ActiveDirectory.Sites.Count -gt 1) { $score += 5 }
    
    # GPOs configured (+5)
    if ($Data.ActiveDirectory.GroupPolicies.Count -gt 5) { $score += 5 }
    
    # DHCP not overutilized (+5)
    $highUsageScopes = $Data.DHCP.Scopes | Where-Object { $_.PercentInUse -gt 90 }
    if (-not $highUsageScopes) { $score += 5 }
    
    return [Math]::Min($score, 100)
}

#endregion

# Export functions
Export-ModuleMember -Function @(
    'New-InfraPortal',
    'Get-SecurityScore'
)
