$ErrorActionPreference = 'Stop'
$previousPath = $env:PATH
Push-Location $PSScriptRoot
try {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        $portableNode = Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot '.tools') -Directory -Filter 'node-*-win-x64' -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $portableNode) { throw 'Install Node.js 22.13+ and run npm install, then npm run dev.' }
        $env:PATH = "$($portableNode.FullName);$env:PATH"
    }
    if (-not (Test-Path -LiteralPath 'node_modules')) {
        & npm.cmd install
        if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
    }
    & npm.cmd run dev
} finally {
    $env:PATH = $previousPath
    Pop-Location
}
