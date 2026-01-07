<#
.SYNOPSIS
    Scheduled task registration for infrastructure monitoring.
.DESCRIPTION
    Creates Windows Scheduled Tasks for automated portal refresh
    and server health monitoring.
.NOTES
    Part of InfraDiscovery toolkit
    Version: 1.0
#>

function Register-MonitoringTask {
    param(
        [Parameter(Mandatory)]
        [string]$TaskName,
        
        [Parameter(Mandatory)]
        [string]$ScriptPath,
        
        [string]$Arguments = "",
        
        [int]$IntervalMinutes = 15,
        
        [string]$Description = "Infrastructure monitoring task",
        
        [PSCredential]$RunAsCredential
    )
    
    # Check admin
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Warning "Administrator privileges required to register scheduled tasks"
        return $false
    }
    
    # Remove existing
    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "  Removing existing task: $TaskName" -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }
    
    # Create action
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`" $Arguments"
    
    # Create trigger
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration ([TimeSpan]::MaxValue)
    
    # Create settings
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable -MultipleInstances IgnoreNew
    
    # Register
    if ($RunAsCredential) {
        $principal = New-ScheduledTaskPrincipal -UserId $RunAsCredential.UserName -LogonType Password -RunLevel Highest
        Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Password $RunAsCredential.GetNetworkCredential().Password -Description $Description | Out-Null
    } else {
        $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
        Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description $Description | Out-Null
    }
    
    Write-Host "  Registered: $TaskName (every $IntervalMinutes min)" -ForegroundColor Green
    return $true
}

function Unregister-MonitoringTask {
    param(
        [Parameter(Mandatory)]
        [string]$TaskName
    )
    
    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existing) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "  Removed: $TaskName" -ForegroundColor Green
        return $true
    }
    Write-Host "  Not found: $TaskName" -ForegroundColor Gray
    return $false
}

function Get-MonitoringTaskStatus {
    param(
        [string[]]$TaskNames
    )
    
    $results = @()
    foreach ($name in $TaskNames) {
        $task = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
        if ($task) {
            $info = Get-ScheduledTaskInfo -TaskName $name
            $results += [PSCustomObject]@{
                Name = $name
                Status = $task.State
                LastRun = $info.LastRunTime
                NextRun = $info.NextRunTime
                LastResult = $info.LastTaskResult
            }
        } else {
            $results += [PSCustomObject]@{
                Name = $name
                Status = "Not Registered"
                LastRun = $null
                NextRun = $null
                LastResult = $null
            }
        }
    }
    return $results
}

function Register-InfraMonitoringTasks {
    param(
        [Parameter(Mandatory)]
        [string]$ScriptRoot,
        
        [string]$TaskPrefix = "InfraMonitor",
        
        [int]$RefreshIntervalMinutes = 15,
        
        [PSCredential]$RunAsCredential
    )
    
    Write-Host "`nRegistering Infrastructure Monitoring Tasks" -ForegroundColor Cyan
    Write-Host "=" * 50 -ForegroundColor Gray
    
    $tasks = @(
        @{
            Name = "$TaskPrefix-PortalRefresh"
            Script = Join-Path $ScriptRoot "Start-InfraDiscovery.ps1"
            Args = "-RefreshOnly"
            Description = "Refreshes infrastructure portal data"
        }
        @{
            Name = "$TaskPrefix-HealthMonitor"
            Script = Join-Path $ScriptRoot "Scripts\Monitor-ServerHealth.ps1"
            Args = ""
            Description = "Monitors server health with alerting"
        }
    )
    
    foreach ($task in $tasks) {
        if (Test-Path $task.Script) {
            Register-MonitoringTask -TaskName $task.Name -ScriptPath $task.Script -Arguments $task.Args -IntervalMinutes $RefreshIntervalMinutes -Description $task.Description -RunAsCredential $RunAsCredential
        } else {
            Write-Warning "Script not found: $($task.Script)"
        }
    }
    
    Write-Host "`nTask Status:" -ForegroundColor Cyan
    Get-MonitoringTaskStatus -TaskNames ($tasks | ForEach-Object { $_.Name }) | Format-Table -AutoSize
}

Export-ModuleMember -Function Register-MonitoringTask, Unregister-MonitoringTask, Get-MonitoringTaskStatus, Register-InfraMonitoringTasks
