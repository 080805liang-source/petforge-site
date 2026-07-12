# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import os
import sys
import webbrowser
from pathlib import Path
import tkinter as tk
from tkinter import messagebox


def app_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


BASE_DIR = app_dir()
CONFIG_PATH = BASE_DIR / "config.json"
IMAGE_PATH = BASE_DIR / "assets" / "pet.png"


def fail(message: str) -> None:
    root = tk.Tk()
    root.withdraw()
    messagebox.showerror("PetForge", message, parent=root)
    root.destroy()
    raise SystemExit(1)


def load_config() -> dict:
    if not CONFIG_PATH.is_file():
        fail("找不到 config.json。请不要只移动 PetForge.exe，请保持解压后的文件结构完整。")
    if not IMAGE_PATH.is_file():
        fail("找不到桌宠图片 assets\\pet.png。请重新从网站下载桌宠项目包。")
    try:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"无法读取桌宠配置：{exc}")


class DesktopPet:
    def __init__(self) -> None:
        self.config = load_config()
        self.root = tk.Tk()
        self.root.title(self.config.get("name", "PetForge"))
        self.root.overrideredirect(True)
        self.root.attributes("-transparentcolor", "#ff00ff")
        self.root.attributes("-topmost", bool(self.config.get("alwaysOnTop", True)))
        opacity = max(0.25, min(1.0, float(self.config.get("opacity", 96)) / 100))
        self.root.attributes("-alpha", opacity)

        try:
            self.photo = tk.PhotoImage(file=IMAGE_PATH)
        except tk.TclError as exc:
            self.root.destroy()
            fail(f"无法加载桌宠图片：{exc}")

        self.width = self.photo.width() + 80
        self.height = self.photo.height() + 96
        self.canvas = tk.Canvas(
            self.root,
            width=self.width,
            height=self.height,
            bg="#ff00ff",
            highlightthickness=0,
        )
        self.canvas.pack()
        if self.config.get("shadow", True):
            self.canvas.create_oval(
                34,
                self.photo.height() + 42,
                self.width - 34,
                self.photo.height() + 76,
                fill="#222222",
                outline="",
                stipple="gray25",
            )
        self.pet_id = self.canvas.create_image(
            self.width // 2,
            self.photo.height() // 2 + 28,
            image=self.photo,
        )
        self.bubble_ids: list[int] = []
        self.drag_start = (0, 0)
        self.dragged = False
        self.place_window()
        self.build_menu()
        self.bind_events()
        self.show_bubble(self.status_text(), 1800)

    def status_text(self) -> str:
        return {
            "companion": "陪伴中",
            "working": "工作中",
            "resting": "休息中",
            "sleeping": "睡眠中",
        }.get(self.config.get("status"), "陪伴中")

    def place_window(self) -> None:
        screen_w = self.root.winfo_screenwidth()
        screen_h = self.root.winfo_screenheight()
        position = self.config.get("position", "bottom-right")
        if position == "bottom-left":
            x, y = 48, screen_h - self.height - 72
        elif position == "center":
            x, y = (screen_w - self.width) // 2, (screen_h - self.height) // 2
        else:
            x, y = screen_w - self.width - 72, screen_h - self.height - 72
        self.root.geometry(f"{self.width}x{self.height}+{max(0, x)}+{max(0, y)}")

    def build_menu(self) -> None:
        self.menu = tk.Menu(self.root, tearoff=False)
        self.menu.add_command(
            label="说一句话",
            command=lambda: self.show_bubble(self.config.get("clickLine", "你好。"), 2200),
        )
        shortcuts = self.config.get("customShortcuts", [])
        if shortcuts:
            self.menu.add_separator()
        for shortcut in shortcuts:
            label = str(shortcut.get("label", "")).strip()
            target = str(shortcut.get("target", "")).strip()
            if label and target:
                self.menu.add_command(
                    label=label,
                    command=lambda item=shortcut: self.open_target(
                        item.get("type", "file"),
                        item.get("target", ""),
                        item.get("fallback", ""),
                    ),
                )
        self.menu.add_separator()
        self.menu.add_command(label="退出桌宠", command=self.root.destroy)

    def bind_events(self) -> None:
        self.canvas.bind("<ButtonPress-1>", self.start_drag)
        self.canvas.bind("<B1-Motion>", self.drag)
        self.canvas.bind("<ButtonRelease-1>", self.release_left)
        self.canvas.bind("<Button-3>", self.open_menu)
        self.root.bind("<Escape>", lambda _event: self.root.destroy())

    def start_drag(self, event: tk.Event) -> None:
        self.drag_start = (event.x, event.y)
        self.dragged = False

    def drag(self, event: tk.Event) -> None:
        dx, dy = event.x - self.drag_start[0], event.y - self.drag_start[1]
        if abs(dx) > 4 or abs(dy) > 4:
            self.dragged = True
        self.root.geometry(f"+{self.root.winfo_x() + dx}+{self.root.winfo_y() + dy}")

    def release_left(self, _event: tk.Event) -> None:
        if not self.dragged:
            self.animate()
            self.show_bubble(self.config.get("clickLine", "你好。"), 2400)

    def open_menu(self, event: tk.Event) -> None:
        self.menu.tk_popup(event.x_root, event.y_root)

    def animate(self) -> None:
        mode = self.config.get("clickAnimation", "jump")
        if mode == "shake":
            offsets = [-9, 9, -7, 7, 0]
            for index, offset in enumerate(offsets):
                self.root.after(index * 55, lambda value=offset: self.canvas.move(self.pet_id, value, 0))
        elif mode == "glow":
            glow = self.canvas.create_oval(
                20,
                18,
                self.width - 20,
                self.photo.height() + 52,
                outline="#77d9bd",
                width=4,
            )
            self.root.after(260, lambda: self.canvas.delete(glow))
        elif mode != "none":
            offsets = [-18, -12, 18, 12, 0]
            for index, offset in enumerate(offsets):
                self.root.after(index * 55, lambda value=offset: self.canvas.move(self.pet_id, 0, value))

    def show_bubble(self, text: object, duration: int) -> None:
        self.clear_bubble()
        safe_text = str(text)[:48]
        dark = self.config.get("bubbleStyle") == "dark"
        fill = "#17201f" if dark else "#ffffff"
        ink = "#ffffff" if dark else "#17201f"
        rect = self.canvas.create_rectangle(
            12,
            10,
            min(self.width - 12, 278),
            72,
            fill=fill,
            outline="#dfe6df",
        )
        label = self.canvas.create_text(
            26,
            24,
            text=safe_text,
            anchor="nw",
            fill=ink,
            width=230,
            font=("Microsoft YaHei UI", 10, "bold"),
        )
        self.bubble_ids = [rect, label]
        self.root.after(duration, self.clear_bubble)

    def clear_bubble(self) -> None:
        for item_id in self.bubble_ids:
            self.canvas.delete(item_id)
        self.bubble_ids = []

    def open_target(self, target_type: str, target: object, fallback: object = "") -> None:
        try:
            value = os.path.expandvars(str(target).strip())
            if target_type == "url":
                webbrowser.open(value)
            else:
                os.startfile(value)
            self.show_bubble("已打开快捷入口", 1800)
        except OSError as exc:
            fallback_url = str(fallback).strip()
            if fallback_url:
                webbrowser.open(fallback_url)
                self.show_bubble("未找到客户端，已打开官网", 2200)
            else:
                self.show_bubble(f"打开失败：{exc}", 2600)

    def run(self) -> None:
        self.root.mainloop()


if __name__ == "__main__":
    DesktopPet().run()
