# Magpie one-click launcher: SSH tunnel to octal31 + Chrome app window.
# Requires: Windows 10/11 built-in OpenSSH client; key-based auth to both hops (see README_windows.md).
param(
    [string]$User = "huiyuche",
    [string]$Jump = "arcade@iro.umontreal.ca",
    [string]$TargetHost = "octal31.iro.umontreal.ca",
    [int]$Port = 8500
)

$ErrorActionPreference = "Stop"

function Test-PortOpen([int]$p) {
    try {
        $c = New-Object Net.Sockets.TcpClient
        $c.Connect("127.0.0.1", $p)
        $c.Close()
        return $true
    } catch { return $false }
}

# 1) Tunnel: reuse an existing one if the port is already forwarded (idempotent relaunch).
if (-not (Test-PortOpen $Port)) {
    Write-Host "Opening SSH tunnel  localhost:$Port -> $TargetHost:$Port  (via $Jump) ..."
    Start-Process -WindowStyle Hidden ssh -ArgumentList @(
        "-N",
        "-o", "ExitOnForwardFailure=yes",
        "-o", "ServerAliveInterval=30",
        "-L", "${Port}:localhost:${Port}",
        "-J", $Jump,
        "$User@$TargetHost"
    )
    $deadline = (Get-Date).AddSeconds(20)
    while (-not (Test-PortOpen $Port)) {
        if ((Get-Date) -gt $deadline) {
            Write-Error ("Tunnel did not come up in 20s. Check: (1) VPN/network, (2) key auth to " +
                "$Jump and $TargetHost (run once in a terminal: ssh -J $Jump $User@$TargetHost), " +
                "(3) the Magpie server is running on $TargetHost port $Port.")
        }
        Start-Sleep -Milliseconds 500
    }
    Write-Host "Tunnel up."
} else {
    Write-Host "Port $Port already forwarded — reusing the existing tunnel."
}

# 2) Chrome as a dedicated app window (falls back to the default browser if Chrome is absent).
$url = "http://localhost:$Port"
$chrome = @(
    "$Env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${Env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$Env:LocalAppData\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($chrome) {
    Start-Process $chrome "--app=$url"
} else {
    Start-Process $url
}
