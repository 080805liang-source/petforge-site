[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[A-Za-z0-9.\-]+$')]
  [string]$PackageName,
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^CN=[^,]+(,|$)')]
  [string]$Publisher,
  [string]$Version = "1.0.0.0"
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\")).Path
$staging = Join-Path $root "store\staging"
$output = Join-Path $root "store\artifacts"
$manifestTemplate = Join-Path $PSScriptRoot "AppxManifest.xml.template"
$makeAppx = Get-Command makeappx.exe -ErrorAction SilentlyContinue
if (-not $makeAppx) {
  throw "找不到 makeappx.exe。请在 Windows runner 或安装 Windows SDK 的开发环境中运行。"
}

Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $output -Recurse -Force -ErrorAction SilentlyContinue
New-Item $staging -ItemType Directory -Force | Out-Null
New-Item (Join-Path $staging "assets") -ItemType Directory -Force | Out-Null
New-Item $output -ItemType Directory -Force | Out-Null

Copy-Item (Join-Path $root "assets\PetForge.exe") (Join-Path $staging "PetForge.exe")
Copy-Item (Join-Path $root "发布包\config.json") (Join-Path $staging "config.json")
Copy-Item (Join-Path $root "发布包\assets\pet.png") (Join-Path $staging "assets\pet.png")
Copy-Item (Join-Path $root "store\Assets\*") (Join-Path $staging "Assets") -Force

$manifest = Get-Content $manifestTemplate -Raw
$manifest = $manifest.Replace("__PACKAGE_NAME__", $PackageName).Replace("__PUBLISHER__", $Publisher).Replace('Version="1.0.0.0"', "Version=\"$Version\"")
Set-Content (Join-Path $staging "AppxManifest.xml") $manifest -Encoding UTF8

$msix = Join-Path $output "PETFORGE-$Version.msix"
& $makeAppx.Source pack /d $staging /p $msix /o
if ($LASTEXITCODE -ne 0) { throw "makeappx 打包失败，退出码 $LASTEXITCODE。" }
Write-Host "已生成 $msix"
Write-Host "提交 Microsoft Store 时不要自行签名；Store 会在认证后重新签名。"
