<#
.SYNOPSIS
    Server health monitoring module with intelligent alerting.
.DESCRIPTION
    Monitors server availability and sends alerts only after consecutive failures
    to prevent false-positive notifications. Includes recovery alerts.
.NOTES
    Part of InfraDiscovery toolkit
    Version: 1.0
#>

#region Configuration
function Get-HealthMonitorConfig {
    param(
        [string]$ConfigPath
    )
    
    $defaultConfig = @{
        ConsecutiveFailuresForAlert = 3
        CheckIntervalMinutes = 15
        HealthStatePath = "Data/server-health-state.json"
        AlertConfig = @{
            Email = @{
                Enabled = $false
                SmtpServer = "smtp.office365.com"
                SmtpPort = 587
                UseSsl = $true
                From = "infrastructure@company.com"
                To = @("it-team@company.com")
                CredentialPath = $null
            }
            Teams = @{
                Enabled = $false
                WebhookUrl = ""
            }
        }
    }
    
    if ($ConfigPath -and (Test-Path $ConfigPath)) {
        try {
            $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
            return $config
        } catch {
            Write-Warning "Could not load config from $ConfigPath, using defaults"
        }
    }
    
    return $defaultConfig
}
#endregion

#region State Management
function Get-HealthState {
    param([string]$StatePath)
    
    if (Test-Path $StatePath) {
        try {
            return Get-Content $StatePath -Raw | ConvertFrom-Json -AsHashtable
        } catch {
            Write-Warning "Could not load state file: $_"
        }
    }
    return @{ LastCheck = $null; Servers = @{} }
}

function Save-HealthState {
    param(
        [hashtable]$State,
        [string]$StatePath
    )
    
    $dir = Split-Path $StatePath -Parent
    if ($dir -and !(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $State | ConvertTo-Json -Depth 5 | Set-Content $StatePath -Encoding UTF8
}

function Update-ServerState {
    param(
        [hashtable]$State,
        [string]$ServerName,
        [bool]$IsOnline,
        [int]$FailureThreshold = 3
    )
    
    if (-not $State.Servers) { $State.Servers = @{} }
    
    if (-not $State.Servers.ContainsKey($ServerName)) {
        $State.Servers[$ServerName] = @{
            ConsecutiveFailures = 0
            LastStatus = "Unknown"
            LastStatusChange = (Get-Date).ToString("o")
            AlertSent = $false
            RecoveryAlertSent = $true
        }
    }
    
    $serverState = $State.Servers[$ServerName]
    $previousStatus = $serverState.LastStatus
    
    if ($IsOnline) {
        $serverState.ConsecutiveFailures = 0
        $serverState.LastStatus = "Online"
        
        if ($previousStatus -eq "Offline" -and $serverState.AlertSent -and -not $serverState.RecoveryAlertSent) {
            $serverState.RecoveryAlertSent = $true
            $serverState.LastStatusChange = (Get-Date).ToString("o")
            return @{ Action = "SendRecoveryAlert"; Server = $ServerName }
        }
    } else {
        $serverState.ConsecutiveFailures++
        $serverState.LastStatus = "Offline"
        
        if ($serverState.ConsecutiveFailures -ge $FailureThreshold -and -not $serverState.AlertSent) {
            $serverState.AlertSent = $true
            $serverState.RecoveryAlertSent = $false
            $serverState.LastStatusChange = (Get-Date).ToString("o")
            return @{ Action = "SendDownAlert"; Server = $ServerName; FailureCount = $serverState.ConsecutiveFailures }
        }
    }
    
    return $null
}
#endregion

#region Alert Functions
function Send-ServerDownAlert {
    param(
        [string]$ServerName,
        [string]$ServerIP,
        [int]$FailureCount,
        [int]$MinutesDown,
        [hashtable]$AlertConfig,
        [string]$PortalUrl = ""
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $subject = "SERVER DOWN: $ServerName"
    
    # HTML Email
    $htmlBody = @"
<!DOCTYPE html>
<html>
<head><style>
body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; padding: 20px; }
.container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
.header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 25px; text-align: center; }
.content { padding: 25px; }
.alert-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
.info-item { background: #f8fafc; padding: 15px; border-radius: 8px; }
.footer { background: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #64748b; }
</style></head>
<body>
<div class="container">
    <div class="header"><h1>Server Down Alert</h1></div>
    <div class="content">
        <div class="alert-box"><strong>$ServerName</strong> has been unreachable for ~$MinutesDown minutes ($FailureCount consecutive failures).</div>
        <div class="info-grid">
            <div class="info-item"><div style="font-size:12px;color:#64748b;">Server</div><div style="font-size:18px;font-weight:600;">$ServerName</div></div>
            <div class="info-item"><div style="font-size:12px;color:#64748b;">IP Address</div><div style="font-size:18px;font-weight:600;">$ServerIP</div></div>
            <div class="info-item"><div style="font-size:12px;color:#64748b;">Detection Time</div><div style="font-size:18px;font-weight:600;">$timestamp</div></div>
            <div class="info-item"><div style="font-size:12px;color:#64748b;">Failed Checks</div><div style="font-size:18px;font-weight:600;">$FailureCount</div></div>
        </div>
    </div>
    <div class="footer">Infrastructure Monitoring - Automated Alert</div>
</div>
</body></html>
"@

    # Send Email
    if ($AlertConfig.Email.Enabled) {
        try {
            $emailParams = @{
                From = $AlertConfig.Email.From
                To = $AlertConfig.Email.To
                Subject = $subject
                Body = $htmlBody
                BodyAsHtml = $true
                SmtpServer = $AlertConfig.Email.SmtpServer
                Port = $AlertConfig.Email.SmtpPort
                UseSsl = $AlertConfig.Email.UseSsl
            }
            if ($AlertConfig.Email.CredentialPath -and (Test-Path $AlertConfig.Email.CredentialPath)) {
                $emailParams.Credential = Import-Clixml $AlertConfig.Email.CredentialPath
            }
            Send-MailMessage @emailParams
            Write-Host "  Email alert sent for $ServerName" -ForegroundColor Green
        } catch {
            Write-Warning "Failed to send email: $_"
        }
    }
    
    # Send Teams
    if ($AlertConfig.Teams.Enabled -and $AlertConfig.Teams.WebhookUrl) {
        try {
            $teamsCard = @{
                "@type" = "MessageCard"
                "@context" = "http://schema.org/extensions"
                themeColor = "FF0000"
                summary = "Server Down: $ServerName"
                sections = @(@{
                    activityTitle = "Server Down Alert"
                    activitySubtitle = $ServerName
                    facts = @(
                        @{ name = "Server"; value = $ServerName }
                        @{ name = "IP"; value = $ServerIP }
                        @{ name = "Status"; value = "OFFLINE" }
                        @{ name = "Failed Checks"; value = "$FailureCount" }
                        @{ name = "Time"; value = $timestamp }
                    )
                })
            }
            Invoke-RestMethod -Uri $AlertConfig.Teams.WebhookUrl -Method Post -Body ($teamsCard | ConvertTo-Json -Depth 10) -ContentType 'application/json' | Out-Null
            Write-Host "  Teams alert sent for $ServerName" -ForegroundColor Green
        } catch {
            Write-Warning "Failed to send Teams alert: $_"
        }
    }
}

function Send-ServerRecoveryAlert {
    param(
        [string]$ServerName,
        [string]$ServerIP,
        [string]$DownSince,
        [hashtable]$AlertConfig
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $downtime = "Unknown"
    if ($DownSince) {
        try { $downtime = "{0:hh\:mm\:ss}" -f ((Get-Date) - [datetime]$DownSince) } catch {}
    }
    
    $subject = "SERVER RECOVERED: $ServerName"
    $htmlBody = @"
<!DOCTYPE html>
<html>
<head><style>
body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; padding: 20px; }
.container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
.header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 25px; text-align: center; }
.content { padding: 25px; }
.success-box { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 15px 0; }
</style></head>
<body>
<div class="container">
    <div class="header"><h1>Server Recovered</h1></div>
    <div class="content">
        <div class="success-box"><strong>$ServerName</strong> is back online. Downtime: $downtime</div>
    </div>
</div>
</body></html>
"@

    if ($AlertConfig.Email.Enabled) {
        try {
            $emailParams = @{
                From = $AlertConfig.Email.From
                To = $AlertConfig.Email.To
                Subject = $subject
                Body = $htmlBody
                BodyAsHtml = $true
                SmtpServer = $AlertConfig.Email.SmtpServer
                Port = $AlertConfig.Email.SmtpPort
                UseSsl = $AlertConfig.Email.UseSsl
            }
            if ($AlertConfig.Email.CredentialPath -and (Test-Path $AlertConfig.Email.CredentialPath)) {
                $emailParams.Credential = Import-Clixml $AlertConfig.Email.CredentialPath
            }
            Send-MailMessage @emailParams
            Write-Host "  Recovery email sent for $ServerName" -ForegroundColor Green
        } catch {
            Write-Warning "Failed to send recovery email: $_"
        }
    }
    
    if ($AlertConfig.Teams.Enabled -and $AlertConfig.Teams.WebhookUrl) {
        try {
            $teamsCard = @{
                "@type" = "MessageCard"
                themeColor = "22c55e"
                summary = "Server Recovered: $ServerName"
                sections = @(@{
                    activityTitle = "Server Recovered"
                    facts = @(
                        @{ name = "Server"; value = $ServerName }
                        @{ name = "Status"; value = "ONLINE" }
                        @{ name = "Downtime"; value = $downtime }
                    )
                })
            }
            Invoke-RestMethod -Uri $AlertConfig.Teams.WebhookUrl -Method Post -Body ($teamsCard | ConvertTo-Json -Depth 10) -ContentType 'application/json' | Out-Null
        } catch {}
    }
}
#endregion

#region Main Monitoring
function Test-ServerHealth {
    param(
        [string]$ServerName,
        [string]$ServerIP,
        [PSCredential]$Credential
    )
    
    try {
        $ping = Test-Connection -ComputerName $ServerIP -Count 1 -Quiet -ErrorAction SilentlyContinue
        if (-not $ping) { return $false }
        
        if ($Credential) {
            $result = Invoke-Command -ComputerName $ServerIP -Credential $Credential -ScriptBlock { $true } -ErrorAction Stop
        }
        return $true
    } catch {
        return $false
    }
}

function Start-HealthMonitor {
    param(
        [Parameter(Mandatory)]
        [array]$Servers,
        
        [PSCredential]$Credential,
        
        [string]$StatePath = "Data/server-health-state.json",
        
        [int]$FailureThreshold = 3,
        
        [int]$CheckIntervalMinutes = 15,
        
        [hashtable]$AlertConfig = @{ Email = @{ Enabled = $false }; Teams = @{ Enabled = $false } }
    )
    
    Write-Host "`nServer Health Monitor" -ForegroundColor Cyan
    Write-Host "Threshold: $FailureThreshold consecutive failures" -ForegroundColor Gray
    Write-Host ""
    
    $state = Get-HealthState -StatePath $StatePath
    $state.LastCheck = (Get-Date).ToString("o")
    $alerts = @()
    
    foreach ($server in $Servers) {
        $name = if ($server.Name) { $server.Name } else { $server }
        $ip = if ($server.IP) { $server.IP } else { $server }
        
        Write-Host "  Checking $name..." -NoNewline
        $isOnline = Test-ServerHealth -ServerName $name -ServerIP $ip -Credential $Credential
        
        if ($isOnline) {
            Write-Host " Online" -ForegroundColor Green
        } else {
            $failCount = 0
            if ($state.Servers -and $state.Servers[$name]) {
                $failCount = $state.Servers[$name].ConsecutiveFailures + 1
            }
            Write-Host " Offline ($failCount/$FailureThreshold)" -ForegroundColor Red
        }
        
        $alertAction = Update-ServerState -State $state -ServerName $name -IsOnline $isOnline -FailureThreshold $FailureThreshold
        if ($alertAction) {
            $alertAction.IP = $ip
            $alertAction.DownSince = $state.Servers[$name].LastStatusChange
            $alerts += $alertAction
        }
    }
    
    foreach ($alert in $alerts) {
        if ($alert.Action -eq "SendDownAlert") {
            $minutesDown = $alert.FailureCount * $CheckIntervalMinutes
            Write-Host "`nALERT: $($alert.Server) DOWN - Sending notification..." -ForegroundColor Red
            Send-ServerDownAlert -ServerName $alert.Server -ServerIP $alert.IP -FailureCount $alert.FailureCount -MinutesDown $minutesDown -AlertConfig $AlertConfig
        }
        elseif ($alert.Action -eq "SendRecoveryAlert") {
            Write-Host "`nRECOVERY: $($alert.Server) - Sending notification..." -ForegroundColor Green
            Send-ServerRecoveryAlert -ServerName $alert.Server -ServerIP $alert.IP -DownSince $alert.DownSince -AlertConfig $AlertConfig
        }
    }
    
    Save-HealthState -State $state -StatePath $StatePath
    
    $online = ($state.Servers.Values | Where-Object { $_.LastStatus -eq "Online" }).Count
    $offline = ($state.Servers.Values | Where-Object { $_.LastStatus -eq "Offline" }).Count
    Write-Host "`nSummary: $online online, $offline offline, $($alerts.Count) alerts" -ForegroundColor Cyan
    
    return $state
}
#endregion

Export-ModuleMember -Function Get-HealthMonitorConfig, Get-HealthState, Save-HealthState, Update-ServerState, Send-ServerDownAlert, Send-ServerRecoveryAlert, Test-ServerHealth, Start-HealthMonitor
