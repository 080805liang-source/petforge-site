"""Create a per-pet Windows shortcut without changing startup or copying the app."""
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

SCRIPT = r'''
$ErrorActionPreference = 'Stop'
$pet = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:PETFORGE_SHORTCUT_DATA)) | ConvertFrom-Json
$desktop = if ($pet.desktop) { $pet.desktop } else { [Environment]::GetFolderPath('DesktopDirectory') }
if (-not [IO.Directory]::Exists($desktop)) { throw 'Desktop folder unavailable' }
$shell = New-Object -ComObject WScript.Shell
$path = Join-Path $desktop ($pet.name + ' - PET FORGE.lnk')
if ([IO.File]::Exists($path) -and $shell.CreateShortcut($path).TargetPath -ne $pet.target) {
  $path = Join-Path $desktop ($pet.name + ' - PET FORGE (' + $pet.id + ').lnk')
}
if ([IO.File]::Exists($path) -and $shell.CreateShortcut($path).TargetPath -ne $pet.target) { throw 'Shortcut name is already in use' }
$link = $shell.CreateShortcut($path)
$link.TargetPath = $pet.target
$link.WorkingDirectory = $pet.directory
$link.Description = 'PET FORGE desktop pet'
$link.IconLocation = $pet.target + ',0'
$link.Save()
[Console]::Out.Write($path)
'''


def create_desktop_shortcut(directory: Path, name: str, *, desktop: Path | None = None, force: bool = False) -> bool:
    if sys.platform != 'win32':
        return False
    directory = directory.resolve()
    target = directory / 'PetForge.exe'
    if not target.is_file():
        return False
    marker = directory / '.desktop-shortcut.json'
    try:
        if not force and json.loads(marker.read_text(encoding='utf8')).get('target') == str(target):
            return True
    except (OSError, ValueError):
        pass
    safe_name = re.sub(r'[\x00-\x1f<>:"/\\|?*]', '', str(name)).strip(' .')[:48] or '我的桌宠'
    data = {'target': str(target), 'directory': str(directory), 'name': safe_name,
            'id': hashlib.sha256(str(target).casefold().encode()).hexdigest()[:8],
            'desktop': str(desktop.resolve()) if desktop else None}
    env = {**os.environ, 'PETFORGE_SHORTCUT_DATA': base64.b64encode(json.dumps(data).encode()).decode()}
    encoded = base64.b64encode(SCRIPT.encode('utf-16-le')).decode()
    try:
        powershell = Path(os.environ.get('SystemRoot', r'C:\Windows')) / 'System32/WindowsPowerShell/v1.0/powershell.exe'
        result = subprocess.run([str(powershell), '-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded],
                                env=env, capture_output=True, timeout=15, creationflags=subprocess.CREATE_NO_WINDOW)
        if result.returncode or not result.stdout:
            return False
        marker.write_text(json.dumps({'target': str(target)}, ensure_ascii=False), encoding='utf8')
        return True
    except (OSError, subprocess.TimeoutExpired):
        return False
