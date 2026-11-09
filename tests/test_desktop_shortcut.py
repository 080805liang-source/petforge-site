import base64
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from desktop_shortcut import create_desktop_shortcut


@unittest.skipUnless(sys.platform == 'win32', 'Windows shortcut integration')
class DesktopShortcutTests(unittest.TestCase):
    def setUp(self):
        test_dir = Path(__file__).resolve().parents[1] / '.build-tools/shortcut-tests'
        test_dir.mkdir(parents=True, exist_ok=True)
        self.tmp = tempfile.TemporaryDirectory(prefix='shortcut-', dir=test_dir)
        self.root = Path(self.tmp.name)
        self.desktop = self.root / '模拟桌面'
        self.desktop.mkdir()
        self.app = self.root / "金毛 桌宠 ' 测试"
        self.app.mkdir()
        shutil.copyfile(sys.executable, self.app / 'PetForge.exe')

    def tearDown(self):
        self.tmp.cleanup()

    def properties(self, link):
        encoded = base64.b64encode(str(link).encode('utf-16-le')).decode()
        script = "[Console]::OutputEncoding=[Text.UTF8Encoding]::new();$p=[Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('" + encoded + "'));$s=(New-Object -ComObject WScript.Shell).CreateShortcut($p);@{target=$s.TargetPath;directory=$s.WorkingDirectory}|ConvertTo-Json -Compress"
        result = subprocess.run(['powershell.exe', '-NoProfile', '-NonInteractive', '-EncodedCommand', base64.b64encode(script.encode('utf-16-le')).decode()], capture_output=True, check=True)
        return json.loads(result.stdout.decode('utf8', errors='replace'))

    def test_unicode_shortcut_targets_the_extracted_app_and_uses_its_directory(self):
        self.assertTrue(create_desktop_shortcut(self.app, '金毛 $(literal); "<>/:?*', desktop=self.desktop))
        links = list(self.desktop.glob('*.lnk'))
        self.assertEqual(len(links), 1)
        self.assertIn('$(literal);', links[0].name)
        data = self.properties(links[0])
        self.assertEqual(Path(data['target']), self.app / 'PetForge.exe')
        self.assertEqual(Path(data['directory']), self.app)
        self.assertTrue((self.app / '.desktop-shortcut.json').is_file())
        old = links[0].stat().st_mtime_ns
        self.assertTrue(create_desktop_shortcut(self.app, '金毛', desktop=self.desktop))
        self.assertEqual(links[0].stat().st_mtime_ns, old)
        links[0].unlink()
        self.assertTrue(create_desktop_shortcut(self.app, '金毛', desktop=self.desktop, force=True))
        self.assertEqual(len(list(self.desktop.glob('*.lnk'))), 1)

    def test_same_name_does_not_replace_another_pet_shortcut(self):
        other = self.root / '另一只宠物'
        other.mkdir()
        shutil.copyfile(sys.executable, other / 'PetForge.exe')
        self.assertTrue(create_desktop_shortcut(self.app, '宠物', desktop=self.desktop))
        first = next(self.desktop.glob('*.lnk'))
        original = first.read_bytes()
        self.assertTrue(create_desktop_shortcut(other, '宠物', desktop=self.desktop))
        self.assertEqual(first.read_bytes(), original)
        self.assertEqual(len(list(self.desktop.glob('*.lnk'))), 2)

    def test_missing_executable_and_unwritable_desktop_fail_without_stopping_pet(self):
        self.assertFalse(create_desktop_shortcut(self.root, '宠物', desktop=self.desktop))
        self.assertFalse(create_desktop_shortcut(self.app, '宠物', desktop=self.root / 'missing'))
        self.assertFalse((self.app / '.desktop-shortcut.json').exists())
        with patch('desktop_shortcut.subprocess.run', side_effect=subprocess.TimeoutExpired('powershell', 15)):
            self.assertFalse(create_desktop_shortcut(self.app, '宠物', desktop=self.desktop))


if __name__ == '__main__':
    unittest.main()
