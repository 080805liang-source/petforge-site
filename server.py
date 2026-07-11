# -*- coding: utf-8 -*-
from __future__ import annotations

import cgi
import json
import mimetypes
import re
import shutil
import subprocess
import time
import uuid
import zipfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
BUILDS_DIR = ROOT / "builds"
DIST_DIR = ROOT / "dist"
PORT = 8765
HOST = "0.0.0.0"


PET_APP_SOURCE = r'''# -*- coding: utf-8 -*-
import json
import os
import subprocess
import webbrowser
import tkinter as tk


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "config.json")
IMAGE_PATH = os.path.join(BASE_DIR, "assets", "pet.png")


def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


class DesktopPet:
    def __init__(self):
        self.config = load_config()
        self.root = tk.Tk()
        self.root.title(self.config.get("name", "Desktop Pet"))
        self.root.overrideredirect(True)
        self.root.attributes("-transparentcolor", "#ff00ff")
        self.root.attributes("-topmost", bool(self.config.get("alwaysOnTop", True)))
        self.root.attributes("-alpha", max(0.25, min(1.0, self.config.get("opacity", 96) / 100)))

        self.photo = tk.PhotoImage(file=IMAGE_PATH)
        self.width = self.photo.width() + 80
        self.height = self.photo.height() + 96
        self.canvas = tk.Canvas(self.root, width=self.width, height=self.height, bg="#ff00ff", highlightthickness=0)
        self.canvas.pack()

        self.shadow_id = None
        if self.config.get("shadow", True):
            self.shadow_id = self.canvas.create_oval(
                34,
                self.photo.height() + 42,
                self.width - 34,
                self.photo.height() + 76,
                fill="#222222",
                outline="",
                stipple="gray25",
            )

        self.pet_id = self.canvas.create_image(self.width // 2, self.photo.height() // 2 + 28, image=self.photo)
        self.bubble_ids = []
        self.drag_start = (0, 0)
        self.place_window()
        self.build_menu()
        self.bind_events()
        self.show_bubble(self.status_text(), 1800)

    def status_text(self):
        status_map = {
            "companion": "陪伴中",
            "working": "工作中",
            "resting": "休息中",
            "sleeping": "睡觉中",
        }
        return status_map.get(self.config.get("status"), "陪伴中")

    def place_window(self):
        screen_w = self.root.winfo_screenwidth()
        screen_h = self.root.winfo_screenheight()
        position = self.config.get("position", "bottom-right")
        if position == "bottom-left":
            x = 48
            y = screen_h - self.height - 72
        elif position == "center":
            x = (screen_w - self.width) // 2
            y = (screen_h - self.height) // 2
        else:
            x = screen_w - self.width - 72
            y = screen_h - self.height - 72
        self.root.geometry(f"{self.width}x{self.height}+{max(0, x)}+{max(0, y)}")

    def build_menu(self):
        self.menu = tk.Menu(self.root, tearoff=False)
        self.menu.add_command(label="说一句话", command=lambda: self.show_bubble(self.config.get("clickLine", "Ready."), 2200))
        self.menu.add_separator()

        for item in self.config.get("quickMenu", []):
            if item in ("窗口置顶", "桌面阴影"):
                continue
            self.menu.add_command(label=item, command=lambda label=item: self.run_quick_action(label))

        shortcut = self.config.get("customShortcut") or {}
        if shortcut.get("label") and shortcut.get("target"):
            self.menu.add_command(
                label=shortcut["label"],
                command=lambda: self.open_target(shortcut.get("type", "url"), shortcut.get("target", "")),
            )

        self.menu.add_separator()
        self.menu.add_command(label="退出桌宠", command=self.root.destroy)

    def bind_events(self):
        self.canvas.bind("<ButtonPress-1>", self.start_drag)
        self.canvas.bind("<B1-Motion>", self.drag)
        self.canvas.bind("<ButtonRelease-1>", self.left_click)
        self.canvas.bind("<Button-3>", self.open_menu)
        self.root.bind("<Escape>", lambda _event: self.root.destroy())

    def start_drag(self, event):
        self.drag_start = (event.x, event.y)

    def drag(self, event):
        x = self.root.winfo_x() + event.x - self.drag_start[0]
        y = self.root.winfo_y() + event.y - self.drag_start[1]
        self.root.geometry(f"+{x}+{y}")

    def left_click(self, _event):
        self.animate()
        self.show_bubble(self.config.get("clickLine", "Ready."), 2400)

    def open_menu(self, event):
        self.menu.tk_popup(event.x_root, event.y_root)

    def animate(self):
        mode = self.config.get("clickAnimation", "jump")
        if mode == "none":
            return
        if mode == "shake":
            offsets = [-9, 9, -7, 7, 0]
            for index, offset in enumerate(offsets):
                self.root.after(index * 55, lambda value=offset: self.canvas.move(self.pet_id, value, 0))
        elif mode == "glow":
            glow = self.canvas.create_oval(20, 18, self.width - 20, self.photo.height() + 52, outline="#77d9bd", width=4)
            self.root.after(260, lambda: self.canvas.delete(glow))
        else:
            offsets = [-18, -12, 18, 12, 0]
            for index, offset in enumerate(offsets):
                self.root.after(index * 55, lambda value=offset: self.canvas.move(self.pet_id, 0, value))

    def show_bubble(self, text, duration):
        for item_id in self.bubble_ids:
            self.canvas.delete(item_id)
        self.bubble_ids.clear()
        safe_text = str(text)[:48]
        fill = "#17201f" if self.config.get("bubbleStyle") == "dark" else "#ffffff"
        ink = "#ffffff" if self.config.get("bubbleStyle") == "dark" else "#17201f"
        rect = self.canvas.create_rectangle(12, 10, min(self.width - 12, 278), 72, fill=fill, outline="#dfe6df")
        label = self.canvas.create_text(26, 24, text=safe_text, anchor="nw", fill=ink, width=230, font=("Microsoft YaHei UI", 10, "bold"))
        self.bubble_ids.extend([rect, label])
        self.root.after(duration, self.clear_bubble)

    def clear_bubble(self):
        for item_id in self.bubble_ids:
            self.canvas.delete(item_id)
        self.bubble_ids.clear()

    def run_quick_action(self, label):
        actions = {
            "打开浏览器": lambda: webbrowser.open("https://www.bing.com"),
            "打开 Steam": lambda: self.open_url("steam://open/main"),
            "打开 WeGame": lambda: self.open_url("wegame://"),
            "打开哔哩哔哩": lambda: webbrowser.open("https://www.bilibili.com"),
            "打开文件夹": lambda: os.startfile(BASE_DIR),
            "休息提醒": lambda: self.show_bubble("该休息一下啦。", 2600),
        }
        action = actions.get(label)
        if action:
            try:
                action()
                self.show_bubble(f"已执行：{label}", 1800)
            except Exception as exc:
                self.show_bubble(f"启动失败：{exc}", 2600)

    def open_url(self, url):
        subprocess.Popen(["cmd", "/c", "start", "", url], shell=False)

    def open_target(self, target_type, target):
        try:
            if target_type == "url":
                webbrowser.open(target)
            else:
                os.startfile(target)
            self.show_bubble("已打开自定义入口", 1800)
        except Exception as exc:
            self.show_bubble(f"打开失败：{exc}", 2600)

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    DesktopPet().run()
'''


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

这是由桌宠工坊生成的 Windows 桌宠程序包。

运行方式：

1. 解压整个 zip。
2. 双击 `run_desktop_pet.bat`。

说明：

- 当前包使用 Python/Tkinter 运行桌宠。
- 如果电脑没有 Python，请先安装 Python 3。
- 右键桌宠可以打开快捷菜单。
- 左键拖拽可以移动桌宠。
- 左键点击会触发台词和动画。
"""


def create_package(config: dict, image_field) -> Path:
    build_id = uuid.uuid4().hex[:10]
    name = safe_name(config.get("name", "desktop-pet"))
    build_root = BUILDS_DIR / f"{name}-{build_id}"
    package_root = build_root / name
    app_dir = package_root / "app"
    assets_dir = app_dir / "assets"

    if build_root.exists():
        shutil.rmtree(build_root)
    assets_dir.mkdir(parents=True, exist_ok=True)

    image_source = image_field.file if image_field is not None else None
    prepare_image(image_source, assets_dir / "pet.png", config)

    write_text(app_dir / "desktop_pet.pyw", PET_APP_SOURCE)
    write_text(app_dir / "config.json", json.dumps(config, ensure_ascii=False, indent=2))
    write_text(package_root / "README.md", package_readme(config))
    write_text(
        package_root / "run_desktop_pet.bat",
        "@echo off\r\ncd /d %~dp0\\app\r\npy -3 desktop_pet.pyw || pythonw desktop_pet.pyw || python desktop_pet.pyw\r\n",
    )

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
