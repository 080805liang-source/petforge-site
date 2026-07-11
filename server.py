# -*- coding: utf-8 -*-
from __future__ import annotations

import cgi
import json
import mimetypes
import re
import shutil
import uuid
import zipfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
BUILDS_DIR = ROOT / "builds"
DIST_DIR = ROOT / "dist"
APP_BINARY = ROOT / "assets" / "PetForge.exe"
PORT = 8765
HOST = "0.0.0.0"



def safe_name(value: str) -> str:
    value = re.sub(r'[\\/:*?"<>|\s]+', "-", value.strip())
    return value.strip("-")[:48] or "desktop-pet"


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")


def prepare_image(source, target: Path, config: dict) -> None:
    if source is None:
        raise ValueError("A desktop pet image is required")
    image = Image.open(source)

    image = image.convert("RGBA")
    size_percent = int(config.get("size") or 100)
    target_height = max(96, min(420, round(220 * size_percent / 100)))
    ratio = target_height / image.height
    target_width = max(64, round(image.width * ratio))
    image = image.resize((target_width, target_height), Image.Resampling.LANCZOS)
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, "PNG")


def package_readme(config: dict) -> str:
    return f"""# {config.get('name', 'Desktop Pet')}

这是由 PET FORGE 生成的 Windows 桌宠应用包。

运行方式：

1. 解压整个 zip。
2. 双击 `PetForge.exe`。

说明：

- PetForge.exe 已包含运行环境，不需要安装 Python。
- 右键桌宠可以打开快捷菜单。
- 左键拖拽可以移动桌宠。
- 左键点击会触发台词和动画。
"""


def create_package(config: dict, image_field) -> Path:
    build_id = uuid.uuid4().hex[:10]
    name = safe_name(config.get("name", "desktop-pet"))
    build_root = BUILDS_DIR / f"{name}-{build_id}"
    package_root = build_root / name
    assets_dir = package_root / "assets"

    if build_root.exists():
        shutil.rmtree(build_root)
    if not APP_BINARY.is_file():
        raise FileNotFoundError("PetForge.exe is missing from assets")
    assets_dir.mkdir(parents=True, exist_ok=True)

    image_source = image_field.file if image_field is not None else None
    prepare_image(image_source, assets_dir / "pet.png", config)

    shutil.copy2(APP_BINARY, package_root / "PetForge.exe")
    write_text(package_root / "config.json", json.dumps(config, ensure_ascii=False, indent=2))
    write_text(package_root / "README.md", package_readme(config))

    DIST_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = DIST_DIR / f"{name}-windows-pet.zip"
    counter = 1
    while zip_path.exists():
        zip_path = DIST_DIR / f"{name}-windows-pet-{counter}.zip"
        counter += 1

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for file_path in package_root.rglob("*"):
            archive.write(file_path, file_path.relative_to(package_root))

    return zip_path


class PackagerHandler(SimpleHTTPRequestHandler):
    server_version = "PetForge/0.1"

    def do_POST(self) -> None:
        if self.path != "/api/build":
            self.send_error(404)
            return

        try:
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={
                    "REQUEST_METHOD": "POST",
                    "CONTENT_TYPE": self.headers.get("Content-Type", ""),
                },
            )
            raw_config = form.getvalue("config")
            if not raw_config:
                self.send_error(400, "Missing config")
                return
            config = json.loads(raw_config)
            image_field = form["image"] if "image" in form and getattr(form["image"], "filename", "") else None
            zip_path = create_package(config, image_field)
            data = zip_path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "application/zip")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Content-Disposition", 'attachment; filename="desktop-pet.zip"')
            self.end_headers()
            self.wfile.write(data)
        except Exception as exc:
            message = f"Build failed: {exc}"
            encoded = message.encode("utf-8", errors="replace")
            self.send_response(500)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main() -> None:
    mimetypes.add_type("application/javascript", ".js")
    BUILDS_DIR.mkdir(parents=True, exist_ok=True)
    DIST_DIR.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer((HOST, PORT), PackagerHandler)
    print(f"桌宠工坊已启动：http://127.0.0.1:{PORT}")
    print(f"手机访问：请用同一个 Wi-Fi 下的电脑 IP，例如 http://192.168.x.x:{PORT}")
    print(f"项目目录：{ROOT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
