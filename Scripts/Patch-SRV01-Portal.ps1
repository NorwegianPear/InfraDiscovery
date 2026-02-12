<#
.SYNOPSIS
    Patches the SRV01 InfraPortal with missing pages and nav fixes.
    
.DESCRIPTION
    Applies 5 patches to the SRV01 portal:
    1. Early script block for reliable toggleNavSection/showPage
    2. Deploy VM nav link in Infrastructure section
    3. Jumbo Frames nav link in Network section
    4. Jumbo Frames page content
    5. Deploy VM page content
    
    DEPLOY TARGET: DALIR-SRV01 (10.25.80.102) - NEVER APP01!
#>

$ErrorActionPreference = 'Stop'

# ============================================================
# SOURCE AND DESTINATION
# ============================================================
$SRV01Share = "S:\inetpub\wwwroot\InfraPortal"
$LocalRepo  = "C:\Users\uylephan\OneDrive\GitHub\Dalir\InfraPortal"
$SRV01File  = "$SRV01Share\index.html"
$LocalFile  = "$LocalRepo\index.html"

# Verify we're targeting SRV01
if (-not (Test-Path $SRV01File)) {
    throw "Cannot find $SRV01File - ensure S: drive is mapped to \\10.25.80.102\C$"
}

Write-Host "=== Patching SRV01 Portal ===" -ForegroundColor Cyan
Write-Host "Source: $SRV01File" -ForegroundColor Gray

# Read the SRV01 file
$lines = [System.Collections.Generic.List[string]](Get-Content $SRV01File)
$originalCount = $lines.Count
Write-Host "Original line count: $originalCount" -ForegroundColor Gray

# Read the local file for extracting page content
$localLines = Get-Content $LocalFile

# ============================================================
# PATCH 1: Early Script Block (after </script> before </head>)
# ============================================================
Write-Host "`n[PATCH 1] Adding early script block..." -ForegroundColor Yellow

$earlyScript = @'
    <!-- Core Navigation Functions - Defined early for reliability -->
    <!-- These ensure nav collapse/expand and page navigation work even if later scripts encounter errors -->
    <script>
        (function() {
            'use strict';
            
            // Toggle navigation section collapse/expand
            function _toggleNavSection(titleElement) {
                if (!titleElement) return;
                var section = titleElement.parentElement;
                if (!section) return;
                section.classList.toggle('collapsed');
                try {
                    var sectionTitle = titleElement.textContent.trim();
                    var collapsedSections = JSON.parse(localStorage.getItem('navCollapsed') || '{}');
                    collapsedSections[sectionTitle] = section.classList.contains('collapsed');
                    localStorage.setItem('navCollapsed', JSON.stringify(collapsedSections));
                } catch(e) { /* localStorage may be unavailable */ }
            }
            window.toggleNavSection = _toggleNavSection;
            
            // Page navigation
            function _showPage(pageId) {
                if (!pageId) return;
                document.querySelectorAll('.page-content').forEach(function(p) {
                    p.style.display = 'none';
                    p.classList.remove('active');
                });
                document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
                var page = document.getElementById('page-' + pageId);
                if (page) {
                    page.style.display = 'block';
                    page.classList.add('active');
                }
                var navItem = document.querySelector('[data-page="' + pageId + '"]');
                if (navItem) {
                    navItem.classList.add('active');
                    var parentSection = navItem.closest('.nav-section');
                    if (parentSection && parentSection.classList.contains('collapsed')) {
                        parentSection.classList.remove('collapsed');
                    }
                }
                window.location.hash = pageId;
                try {
                    if (pageId === 'monitoring' && typeof refreshMonitoringData === 'function') refreshMonitoringData();
                    if (pageId === 'trends' && typeof loadTrendsPageData === 'function') {
                        loadTrendsPageData();
                        if (typeof initTrafficChart === 'function') setTimeout(initTrafficChart, 100);
                    }
                    if (pageId === 'dataflow') {
                        if (typeof loadLiveDataflowData === 'function') loadLiveDataflowData();
                        if (typeof loadDatabaseDataflowStats === 'function') loadDatabaseDataflowStats();
                    }
                    if (pageId.startsWith('idlm-') && typeof IDLMController !== 'undefined') IDLMController.showPage(pageId);
                } catch(e) { console.warn('Page hook error:', e); }
            }
            window.showPage = _showPage;
            
            // Restore collapsed state on page load
            function _restoreNavCollapsedState() {
                try {
                    var collapsedSections = JSON.parse(localStorage.getItem('navCollapsed') || '{}');
                    var alwaysExpanded = ['Infrastructure', 'Network', 'Dashboard'];
                    document.querySelectorAll('.nav-section-title').forEach(function(title) {
                        var sectionTitle = title.textContent.trim();
                        if (alwaysExpanded.indexOf(sectionTitle) !== -1) {
                            title.parentElement.classList.remove('collapsed');
                        } else if (collapsedSections[sectionTitle]) {
                            title.parentElement.classList.add('collapsed');
                        }
                    });
                } catch(e) { /* localStorage may be unavailable */ }
            }
            
            document.addEventListener('DOMContentLoaded', function() {
                _restoreNavCollapsedState();
                var hash = window.location.hash.slice(1);
                if (hash && document.getElementById('page-' + hash)) {
                    _showPage(hash);
                }
            });
        })();
    </script>
'@

# Find the </script> before </head>
$headCloseIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i].Trim() -eq '</head>') {
        $headCloseIdx = $i
        break
    }
}
if ($headCloseIdx -eq -1) { throw "Could not find </head> tag" }

# Find the </script> just before </head>
$scriptCloseIdx = -1
for ($i = $headCloseIdx - 1; $i -ge 0; $i--) {
    if ($lines[$i].Trim() -eq '</script>') {
        $scriptCloseIdx = $i
        break
    }
}
if ($scriptCloseIdx -eq -1) { throw "Could not find </script> before </head>" }

# Insert early script block after </script>
$earlyScriptLines = $earlyScript -split "`n"
$insertOffset = 0
foreach ($sl in $earlyScriptLines) {
    $lines.Insert($scriptCloseIdx + 1 + $insertOffset, $sl)
    $insertOffset++
}
$patch1Added = $insertOffset
Write-Host "  Inserted $patch1Added lines after line $($scriptCloseIdx + 1)" -ForegroundColor Green

# ============================================================
# PATCH 2: Deploy VM nav link in Infrastructure section
# ============================================================
Write-Host "`n[PATCH 2] Adding Deploy VM nav link..." -ForegroundColor Yellow

$deployVMNav = @'
                <a href="#" class="nav-item" data-page="deployvm" onclick="showPage('deployvm')">
                    <span class="nav-icon">🚀</span>
                    <span class="nav-label">Deploy VM</span>
                </a>
'@

# Find "Storage & Disks</span>" in nav and then find the closing </a> after it
$storageNavIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'data-page="storage".*onclick') {
        $storageNavIdx = $i
        break
    }
}
if ($storageNavIdx -eq -1) { throw "Could not find storage nav item" }

# Find the </a> after storage nav
$storageCloseIdx = -1
for ($i = $storageNavIdx; $i -lt $lines.Count; $i++) {
    if ($lines[$i].Trim() -eq '</a>' -and $i -gt $storageNavIdx) {
        $storageCloseIdx = $i
        break
    }
}
if ($storageCloseIdx -eq -1) { throw "Could not find </a> after storage nav" }

# Insert Deploy VM nav after storage </a>
$navLines = $deployVMNav -split "`n"
$insertOffset = 0
foreach ($nl in $navLines) {
    $lines.Insert($storageCloseIdx + 1 + $insertOffset, $nl)
    $insertOffset++
}
$patch2Added = $insertOffset
Write-Host "  Inserted $patch2Added lines after line $($storageCloseIdx + 1)" -ForegroundColor Green

# ============================================================
# PATCH 3: Jumbo Frames nav link in Network section
# ============================================================
Write-Host "`n[PATCH 3] Adding Jumbo Frames nav link..." -ForegroundColor Yellow

$jumboNav = @'
                <a href="#" class="nav-item" data-page="jumboframes" onclick="showPage('jumboframes')">
                    <span class="nav-icon">📦</span>
                    <span class="nav-label">Jumbo Frames</span>
                </a>
'@

# Find dataflow nav item
$dataflowNavIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'data-page="dataflow".*onclick') {
        $dataflowNavIdx = $i
        break
    }
}
if ($dataflowNavIdx -eq -1) { throw "Could not find dataflow nav item" }

# Find </a> after dataflow nav
$dataflowCloseIdx = -1
for ($i = $dataflowNavIdx; $i -lt $lines.Count; $i++) {
    if ($lines[$i].Trim() -eq '</a>' -and $i -gt $dataflowNavIdx) {
        $dataflowCloseIdx = $i
        break
    }
}
if ($dataflowCloseIdx -eq -1) { throw "Could not find </a> after dataflow nav" }

$navLines = $jumboNav -split "`n"
$insertOffset = 0
foreach ($nl in $navLines) {
    $lines.Insert($dataflowCloseIdx + 1 + $insertOffset, $nl)
    $insertOffset++
}
$patch3Added = $insertOffset
Write-Host "  Inserted $patch3Added lines after line $($dataflowCloseIdx + 1)" -ForegroundColor Green

# ============================================================
# PATCH 4: Jumbo Frames page content (after page-dataflow)
# ============================================================
Write-Host "`n[PATCH 4] Adding Jumbo Frames page content..." -ForegroundColor Yellow

# Extract from local file (lines 7965-8141)
$jumboPageContent = $localLines[7964..8140]  # 0-indexed

# Find page-diagrams in current (patched) lines
$diagramsPageIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'id="page-diagrams"') {
        $diagramsPageIdx = $i
        break
    }
}
if ($diagramsPageIdx -eq -1) { throw "Could not find page-diagrams" }

# Insert jumbo frames page before page-diagrams (with blank line)
$lines.Insert($diagramsPageIdx, "")
$insertOffset = 1
foreach ($pl in $jumboPageContent) {
    $lines.Insert($diagramsPageIdx + $insertOffset, $pl)
    $insertOffset++
}
$patch4Added = $insertOffset
Write-Host "  Inserted $patch4Added lines before page-diagrams" -ForegroundColor Green

# ============================================================
# PATCH 5: Deploy VM page content (after page-storage)
# ============================================================
Write-Host "`n[PATCH 5] Adding Deploy VM page content..." -ForegroundColor Yellow

# Extract from local file (lines 16876-17117)
$deployPageContent = $localLines[16875..17116]  # 0-indexed

# Find page-certificates in current (patched) lines (it comes right after page-storage)
$certsPageIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'id="page-certificates"') {
        $certsPageIdx = $i
        break
    }
}
if ($certsPageIdx -eq -1) { throw "Could not find page-certificates" }

# Insert deploy VM page before page-certificates
$lines.Insert($certsPageIdx, "")
$insertOffset = 1
foreach ($pl in $deployPageContent) {
    $lines.Insert($certsPageIdx + $insertOffset, $pl)
    $insertOffset++
}
$patch5Added = $insertOffset
Write-Host "  Inserted $patch5Added lines before page-certificates" -ForegroundColor Green

# ============================================================
# WRITE PATCHED FILE
# ============================================================
Write-Host "`n=== Writing patched file ===" -ForegroundColor Cyan
$totalAdded = $patch1Added + $patch2Added + $patch3Added + $patch4Added + $patch5Added
Write-Host "Original: $originalCount lines"
Write-Host "Added:    $totalAdded lines"
Write-Host "New total: $($lines.Count) lines"

# Write to SRV01
Set-Content -Path $SRV01File -Value $lines -Encoding UTF8
Write-Host "`nFile written to $SRV01File" -ForegroundColor Green

# Verify
$newSize = (Get-Item $SRV01File).Length
Write-Host "New file size: $newSize bytes ($('{0:N0}' -f $newSize))" -ForegroundColor Green

# Quick verification
$content = Get-Content $SRV01File -Raw
$checks = @(
    @{ Name = "Early script block"; Pattern = "_toggleNavSection" }
    @{ Name = "Deploy VM nav link"; Pattern = 'data-page="deployvm"' }
    @{ Name = "Jumbo Frames nav link"; Pattern = 'data-page="jumboframes"' }
    @{ Name = "Deploy VM page"; Pattern = 'id="page-deployvm"' }
    @{ Name = "Jumbo Frames page"; Pattern = 'id="page-jumboframes"' }
)
Write-Host "`n=== Verification ===" -ForegroundColor Cyan
$allGood = $true
foreach ($check in $checks) {
    $found = $content -match [regex]::Escape($check.Pattern)
    $status = if ($found) { "OK" } else { "MISSING"; $allGood = $false }
    $color = if ($found) { "Green" } else { "Red" }
    Write-Host "  [$status] $($check.Name)" -ForegroundColor $color
}

if ($allGood) {
    Write-Host "`n ALL PATCHES APPLIED SUCCESSFULLY!" -ForegroundColor Green
} else {
    Write-Host "`n SOME PATCHES FAILED - CHECK ABOVE" -ForegroundColor Red
}
