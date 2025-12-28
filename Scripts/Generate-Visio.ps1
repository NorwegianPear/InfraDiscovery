<#
.SYNOPSIS
    Generates Visio infrastructure diagrams using vendor stencils.

.DESCRIPTION
    Creates professional Visio diagrams from infrastructure discovery data
    using proper vendor stencils (VMware, Microsoft, Veeam, etc.)

.PARAMETER Environment
    The name of the environment to generate diagrams for.

.PARAMETER StencilsPath
    Path to vendor stencils. Defaults to common locations.

.EXAMPLE
    .\Generate-Visio.ps1 -Environment "CustomerA"

.NOTES
    Author: InfraDiscovery Framework
    Version: 1.0
    Requires: Microsoft Visio installed
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Environment,
    
    [Parameter(Mandatory = $false)]
    [string]$StencilsPath
)

$script:ScriptRoot = $PSScriptRoot
$script:DataPath = Join-Path $PSScriptRoot "..\Environments\$Environment\Data"
$script:OutputPath = Join-Path $PSScriptRoot "..\Environments\$Environment\Diagrams"

# Create output directory
if (-not (Test-Path $script:OutputPath)) {
    New-Item -Path $script:OutputPath -ItemType Directory -Force | Out-Null
}

# Load discovery data
$discoveryFile = Join-Path $script:DataPath "discovery-latest.json"
if (-not (Test-Path $discoveryFile)) {
    Write-Error "No discovery data found for '$Environment'. Run discovery first."
    exit 1
}

$data = Get-Content $discoveryFile -Raw | ConvertFrom-Json

Write-Host "`n" -NoNewline
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║            Visio Diagram Generation - $($Environment.PadRight(16))    ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Check for Visio
try {
    $visio = New-Object -ComObject Visio.Application
    $visio.Visible = $true
    Write-Host "✓ Microsoft Visio opened" -ForegroundColor Green
}
catch {
    Write-Warning "Microsoft Visio not available. Creating diagram specification file instead."
    
    # Create a specification file that can be used to manually create the diagram
    $spec = @{
        Environment = $Environment
        GeneratedDate = Get-Date -Format "yyyy-MM-dd HH:mm"
        Servers = $data.Servers | ForEach-Object {
            @{
                Name = $_.Name
                IP = $_.IPv4Address
                OS = $_.OperatingSystem
                Roles = $_.Roles
                Online = $_.Online
            }
        }
        DomainControllers = $data.ActiveDirectory.DomainControllers
        DNSZones = $data.DNS.Zones.ZoneName
        DHCPScopes = $data.DHCP.Scopes | ForEach-Object { "$($_.Name) ($($_.ScopeId))" }
        Layout = @{
            DomainControllers = "Top Row"
            Servers = "Middle Section - Grouped by Role"
            Network = "Bottom - Show subnets and connections"
        }
        SuggestedStencils = @(
            "Microsoft - Servers and Databases"
            "Microsoft - Active Directory"
            "VMware vSphere"
            "Generic Network Shapes"
        )
    }
    
    $specFile = Join-Path $script:OutputPath "diagram-spec-$(Get-Date -Format 'yyyyMMdd').json"
    $spec | ConvertTo-Json -Depth 5 | Out-File $specFile -Encoding UTF8
    
    Write-Host "Created diagram specification: $specFile" -ForegroundColor Yellow
    exit 0
}

# Find stencils
$stencilPaths = @(
    $StencilsPath,
    "$env:USERPROFILE\OneDrive - Atea\Dokumenter\Mine figurer\Stencils",
    "$env:USERPROFILE\Documents\My Shapes",
    "C:\Program Files\Microsoft Office\root\Office16\Visio Content\1033"
) | Where-Object { $_ -and (Test-Path $_) }

function Open-VisioStencil {
    param([string]$StencilName, [string[]]$SearchPaths)
    
    foreach ($basePath in $SearchPaths) {
        $stencilFile = Get-ChildItem -Path $basePath -Filter "*$StencilName*" -Recurse -File | 
            Where-Object { $_.Extension -in '.vss', '.vssx', '.vssm' } | 
            Select-Object -First 1
        
        if ($stencilFile) {
            try {
                return $visio.Documents.OpenEx($stencilFile.FullName, 4)  # visOpenDocked
            }
            catch {
                Write-Verbose "Could not open stencil: $($stencilFile.Name)"
            }
        }
    }
    return $null
}

# Create new document
$doc = $visio.Documents.Add("")
$page = $doc.Pages.Item(1)
$page.Name = "$Environment Infrastructure"

Write-Host "Creating infrastructure diagram..." -ForegroundColor Cyan

# Try to load stencils
$serverStencil = Open-VisioStencil -StencilName "Server" -SearchPaths $stencilPaths
$networkStencil = Open-VisioStencil -StencilName "Network" -SearchPaths $stencilPaths
$adStencil = Open-VisioStencil -StencilName "Directory" -SearchPaths $stencilPaths

# Fallback to basic shapes if no stencils
if (-not $serverStencil) {
    $serverStencil = $visio.Documents.OpenEx("BASIC_M.VSS", 4)
}

# Layout configuration
$startX = 1.5
$startY = 10
$xSpacing = 2.5
$ySpacing = 2

# Draw title
$titleShape = $page.DrawRectangle(0.5, $startY + 1, 12, $startY + 1.5)
$titleShape.Text = "$Environment Infrastructure - $($data.Domain)"
$titleShape.CellsU("FillForegnd").FormulaU = "RGB(0,51,102)"
$titleShape.CellsU("Char.Color").FormulaU = "RGB(255,255,255)"
$titleShape.CellsU("Char.Size").FormulaU = "14pt"

# Group servers by role
$dcs = $data.Servers | Where-Object { $_.Roles -contains 'DomainController' }
$fileServers = $data.Servers | Where-Object { $_.Roles -contains 'FileServer' }
$webServers = $data.Servers | Where-Object { $_.Roles -contains 'IIS' }
$otherServers = $data.Servers | Where-Object { 
    $_.Roles -notcontains 'DomainController' -and 
    $_.Roles -notcontains 'FileServer' -and 
    $_.Roles -notcontains 'IIS'
}

$currentY = $startY - 1

# Draw Domain Controllers section
if ($dcs.Count -gt 0) {
    # Section label
    $labelShape = $page.DrawRectangle(0.5, $currentY, 12, $currentY + 0.4)
    $labelShape.Text = "Domain Controllers"
    $labelShape.CellsU("FillForegnd").FormulaU = "RGB(0,102,153)"
    $labelShape.CellsU("Char.Color").FormulaU = "RGB(255,255,255)"
    $labelShape.CellsU("LinePattern").FormulaU = "0"
    
    $currentY -= 0.6
    $currentX = $startX
    
    foreach ($dc in $dcs) {
        $shape = $page.DrawRectangle($currentX, $currentY - 1.2, $currentX + 2, $currentY)
        $shape.Text = "$($dc.Name)`n$($dc.IPv4Address)"
        
        # Color based on status
        if ($dc.Online) {
            $shape.CellsU("FillForegnd").FormulaU = "RGB(200,230,200)"
        }
        else {
            $shape.CellsU("FillForegnd").FormulaU = "RGB(255,200,200)"
        }
        
        $currentX += $xSpacing
        if ($currentX > 10) {
            $currentX = $startX
            $currentY -= $ySpacing
        }
    }
    
    $currentY -= $ySpacing
}

# Draw other server sections similarly
$sections = @(
    @{ Name = "File Servers"; Servers = $fileServers; Color = "RGB(153,204,255)" },
    @{ Name = "Web Servers (IIS)"; Servers = $webServers; Color = "RGB(255,229,153)" },
    @{ Name = "Other Servers"; Servers = $otherServers; Color = "RGB(224,224,224)" }
)

foreach ($section in $sections) {
    if ($section.Servers.Count -gt 0) {
        # Section label
        $labelShape = $page.DrawRectangle(0.5, $currentY, 12, $currentY + 0.4)
        $labelShape.Text = $section.Name
        $labelShape.CellsU("FillForegnd").FormulaU = $section.Color
        $labelShape.CellsU("LinePattern").FormulaU = "0"
        
        $currentY -= 0.6
        $currentX = $startX
        
        foreach ($server in $section.Servers) {
            $shape = $page.DrawRectangle($currentX, $currentY - 1.2, $currentX + 2, $currentY)
            $rolesText = if ($server.Roles) { ($server.Roles -join ", ") } else { "" }
            $shape.Text = "$($server.Name)`n$($server.IPv4Address)`n$rolesText"
            
            if ($server.Online) {
                $shape.CellsU("FillForegnd").FormulaU = "RGB(230,255,230)"
            }
            else {
                $shape.CellsU("FillForegnd").FormulaU = "RGB(255,230,230)"
            }
            
            $currentX += $xSpacing
            if ($currentX > 10) {
                $currentX = $startX
                $currentY -= $ySpacing
            }
        }
        
        $currentY -= $ySpacing
    }
}

# Add legend
$legendY = $currentY - 1
$page.DrawRectangle(0.5, $legendY - 1, 4, $legendY)
$legendText = $page.Shapes.ItemFromID($page.Shapes.Count)
$legendText.Text = "Legend:`n  Green = Online`n  Red = Offline"
$legendText.CellsU("Char.Size").FormulaU = "8pt"

# Add metadata
$metaY = $legendY - 1.5
$metaShape = $page.DrawRectangle(0.5, $metaY - 0.5, 6, $metaY)
$metaShape.Text = "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm') | Environment: $Environment | Domain: $($data.Domain)"
$metaShape.CellsU("Char.Size").FormulaU = "8pt"
$metaShape.CellsU("FillForegnd").FormulaU = "RGB(240,240,240)"

# Save diagram
$outputFile = Join-Path $script:OutputPath "$Environment-Infrastructure-$(Get-Date -Format 'yyyyMMdd').vsdx"
$doc.SaveAs($outputFile)

Write-Host "✓ Diagram saved: $outputFile" -ForegroundColor Green

# Create network topology page
$netPage = $doc.Pages.Add()
$netPage.Name = "Network Topology"

$netPage.DrawRectangle(0.5, 10, 12, 10.5).Text = "$Environment Network Topology"

# Add DNS zones
$dnsY = 9
$netPage.DrawRectangle(0.5, $dnsY, 12, $dnsY + 0.4).Text = "DNS Zones"

$dnsX = 1
foreach ($zone in ($data.DNS.Zones | Select-Object -First 8)) {
    $zoneShape = $netPage.DrawRectangle($dnsX, $dnsY - 1, $dnsX + 2.5, $dnsY - 0.2)
    $zoneShape.Text = "$($zone.ZoneName)`n$($zone.RecordCount) records"
    $dnsX += 2.7
    if ($dnsX > 10) { 
        $dnsX = 1
        $dnsY -= 1.2
    }
}

# Add DHCP scopes
$dhcpY = $dnsY - 2
if ($data.DHCP.Scopes.Count -gt 0) {
    $netPage.DrawRectangle(0.5, $dhcpY, 12, $dhcpY + 0.4).Text = "DHCP Scopes"
    
    $dhcpX = 1
    foreach ($scope in $data.DHCP.Scopes) {
        $scopeShape = $netPage.DrawRectangle($dhcpX, $dhcpY - 1, $dhcpX + 2.5, $dhcpY - 0.2)
        $scopeShape.Text = "$($scope.Name)`n$($scope.ScopeId)`n$($scope.PercentInUse)% used"
        
        # Color by utilization
        if ($scope.PercentInUse -gt 80) {
            $scopeShape.CellsU("FillForegnd").FormulaU = "RGB(255,200,200)"
        }
        elseif ($scope.PercentInUse -gt 60) {
            $scopeShape.CellsU("FillForegnd").FormulaU = "RGB(255,255,200)"
        }
        else {
            $scopeShape.CellsU("FillForegnd").FormulaU = "RGB(200,255,200)"
        }
        
        $dhcpX += 2.7
        if ($dhcpX > 10) {
            $dhcpX = 1
            $dhcpY -= 1.2
        }
    }
}

# Save with all pages
$doc.Save()

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " Visio Diagrams Generated!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  File: $outputFile" -ForegroundColor White
Write-Host "  Pages: Infrastructure, Network Topology" -ForegroundColor White
Write-Host ""
Write-Host "  Tip: Open in Visio and apply better stencils for professional look." -ForegroundColor Gray
Write-Host ""
