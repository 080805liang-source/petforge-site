# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import math
import os
import random
import sys
import time
import webbrowser
import ctypes
import hashlib
from pathlib import Path
import tkinter as tk
from tkinter import messagebox
from urllib.error import URLError
from urllib.request import Request, urlopen
from ctypes import wintypes

try:
    import winreg
except ImportError:
    winreg = None


def app_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


BASE_DIR = app_dir()
CONFIG_PATH = BASE_DIR / "config.json"
IMAGE_PATH = BASE_DIR / "assets" / "pet.png"
LICENSE_URL = "https://cloud-paw-vip-cn-d0eub7r110788a3-1460995143.ap-shanghai.app.tcloudbase.com/api/pet-license/verify"


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


def machine_hash() -> str:
    source = os.environ.get("COMPUTERNAME", "")
    if winreg is not None:
        try:
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography") as key:
                source = winreg.QueryValueEx(key, "MachineGuid")[0]
        except OSError:
            pass
    return hashlib.sha256(str(source).encode("utf-8")).hexdigest()


def verify_license(config: dict) -> None:
    license_data = config.get("license")
    if not isinstance(license_data, dict):
        fail("This desktop pet is an old package and cannot be started. Please download the latest VIP package from PET FORGE.")
    license_id = str(license_data.get("id", ""))
    expected_fingerprint = str(license_data.get("fingerprint", "")).lower()
    actual_fingerprint = hashlib.sha256(IMAGE_PATH.read_bytes()).hexdigest()
    if not license_id or actual_fingerprint != expected_fingerprint:
        fail("Desktop pet authorization is invalid. Please generate a new package from PET FORGE.")
    body = json.dumps({
        "licenseId": license_id,
        "fingerprint": actual_fingerprint,
        "deviceHash": machine_hash(),
    }).encode("utf-8")
    request = Request(LICENSE_URL, data=body, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urlopen(request, timeout=8) as response:
            result = json.loads(response.read().decode("utf-8"))
        if not result.get("active"):
            raise ValueError("inactive")
    except (URLError, OSError, ValueError, json.JSONDecodeError):
        fail("PET FORGE authorization could not be verified. Check your internet connection and VIP status, then try again.")


class DesktopPet:
    def __init__(self) -> None:
        self.config = load_config()
        self.root = tk.Tk()
        self.root.title(self.config.get("name", "PetForge"))
        self.root.overrideredirect(True)
        # Transparent, always-on-top Tk windows can render as black overlays on
        # some Windows graphics drivers. Use safe rendering by default.
        self.safe_rendering = bool(self.config.get("safeRendering", True))
        self.background = "#f7f4ef" if self.safe_rendering else "#ff00ff"
        self.root.configure(bg=self.background)
        if not self.safe_rendering:
            self.root.attributes("-transparentcolor", "#ff00ff")
        self.root.attributes("-topmost", bool(self.config.get("alwaysOnTop", False)))
        self.desktop_only = bool(self.config.get("desktopOnly", False))
        self.desktop_hidden = False
        opacity = max(0.25, min(1.0, float(self.config.get("opacity", 96)) / 100))
        self.root.attributes("-alpha", opacity)

        try:
            self.photo = tk.PhotoImage(file=IMAGE_PATH)
        except tk.TclError as exc:
            self.root.destroy()
            fail(f"无法加载桌宠图片：{exc}")

        max_width = max(180, self.root.winfo_screenwidth() - 120)
        max_height = max(180, self.root.winfo_screenheight() - 160)
        self.width = min(self.photo.width() + 80, max_width)
        self.height = min(self.photo.height() + 96, max_height)
        self.canvas = tk.Canvas(
            self.root,
            width=self.width,
            height=self.height,
            bg=self.background,
            highlightthickness=0,
        )
        self.canvas.pack()
        self.shadow_id: int | None = None
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
        self.pet_base_x = self.width // 2
        self.pet_base_y = self.photo.height() // 2 + 28
        self.pet_id = self.canvas.create_image(
            self.pet_base_x,
            self.pet_base_y,
            image=self.photo,
        )
        self.bubble_ids: list[int] = []
        self.drag_start = (0, 0)
        self.dragged = False
        self.idle_phase = 0
        self.motion_active = False
        self.pending_click: str | None = None
        self.double_click_pending = False
        self.aura_id: int | None = None
        self.bubble_token = 0
        self.hovered = False
        self.cursor_offset = (0, 0)
        self.last_cursor_near = False
        self.last_proactive_at = 0.0
        self.typing_active = False
        self.typing_ids: list[int] = []
        self.last_typing_hint_at = 0.0
        self.place_window()
        self.build_menu()
        self.bind_events()
        self.show_bubble("单击互动 · 双击亲近 · 拖动移动 · 右键更多", 3200)
        self.root.after(120, self.idle)
        self.root.after(160, self.track_cursor)
        if self.config.get("keyboardSync", False):
            self.root.after(90, self.track_keyboard)
        if self.config.get("wanderEnabled", False):
            self.root.after(random.randint(18000, 28000), self.wander)
        if self.desktop_only and sys.platform.startswith("win"):
            self.root.after(250, self.sync_desktop_visibility)

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
        self.menu.add_command(label="和我互动", command=self.interact)
        self.menu.add_command(
            label="看看我现在的状态",
            command=lambda: self.show_bubble(self.status_text(), 2200),
        )
        self.menu.add_command(label="显示互动说明", command=lambda: self.show_bubble("单击互动 · 双击亲近 · 拖动移动", 2600))
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
                        item.get("appPaths", []),
                    ),
                )
        self.menu.add_separator()
        self.menu.add_command(label="隐藏 10 秒", command=self.hide_temporarily)
        self.menu.add_command(label="切换始终置顶", command=self.toggle_topmost)
        self.menu.add_command(label="退出桌宠", command=self.root.destroy)

    def bind_events(self) -> None:
        self.canvas.bind("<ButtonPress-1>", self.start_drag)
        self.canvas.bind("<B1-Motion>", self.drag)
        self.canvas.bind("<ButtonRelease-1>", self.release_left)
        self.canvas.bind("<Double-Button-1>", self.double_click)
        self.canvas.bind("<Button-3>", self.open_menu)
        self.canvas.bind("<Enter>", self.on_hover)
        self.canvas.bind("<Leave>", self.on_leave)
        self.root.bind("<Escape>", lambda _event: self.root.destroy())

    def start_drag(self, event: tk.Event) -> None:
        self.drag_start = (event.x, event.y)
        self.dragged = False

    def drag(self, event: tk.Event) -> None:
        dx, dy = event.x - self.drag_start[0], event.y - self.drag_start[1]
        if abs(dx) > 4 or abs(dy) > 4:
            self.dragged = True
            self.cancel_pending_click()
        self.root.geometry(f"+{self.root.winfo_x() + dx}+{self.root.winfo_y() + dy}")

    def release_left(self, _event: tk.Event) -> None:
        if self.dragged:
            self.dragged = False
            return
        if self.double_click_pending:
            self.double_click_pending = False
            return
        self.cancel_pending_click()
        self.pending_click = self.root.after(210, self.interact)

    def double_click(self, _event: tk.Event) -> None:
        self.cancel_pending_click()
        self.double_click_pending = True
        effect = self.config.get("doubleClickEffect", "cuddle")
        if effect == "spin":
            self.animate(mode="spin")
            self.spawn_particles(close=True)
            self.show_bubble("转个圈给你看！", 2200)
        elif effect == "celebrate":
            self.animate(mode="glow")
            self.spawn_particles(close=True)
            self.show_bubble("今天也值得庆祝。", 2200)
        elif effect == "quiet":
            self.show_bubble("我在这里，安静陪着你。", 2200)
        else:
            self.interact(close=True)

    def cancel_pending_click(self) -> None:
        if self.pending_click is not None:
            self.root.after_cancel(self.pending_click)
            self.pending_click = None

    def open_menu(self, event: tk.Event) -> None:
        self.menu.tk_popup(event.x_root, event.y_root)

    def interaction_text(self, close: bool = False) -> str:
        custom_line = str(self.config.get("clickLine", "你好，我在这里。"))[:48]
        if self.config.get("status") == "sleeping":
            return random.choice(["我醒啦，陪你一会儿。", "轻轻点我就好。", custom_line])
        messages = [custom_line, "今天也陪着你。", "收到你的互动啦。", "要不要一起完成一件小事？"]
        if close:
            messages.extend(["好开心，贴贴！", "我们是最好的搭档。"])
        return random.choice(messages)

    def interact(self, close: bool = False) -> None:
        self.pending_click = None
        self.animate(close=close)
        if self.config.get("clickParticles", True):
            self.spawn_particles(close=close)
        self.show_bubble(self.interaction_text(close), 2400)

    def animate(self, close: bool = False, mode: str | None = None) -> None:
        if self.motion_active:
            return
        self.motion_active = True
        mode = mode or self.config.get("clickAnimation", "jump")
        if mode == "shake":
            offsets = [(-10, 0), (10, 0), (-7, 0), (7, 0), (0, 0)]
        elif mode == "wiggle":
            offsets = [(-6, -4), (7, -1), (-8, 2), (6, 0), (0, 0)]
        elif mode == "dash":
            offsets = [(18, 0), (34, -6), (14, -3), (0, 0)]
        elif mode == "spin":
            offsets = [(0, -14), (14, -8), (18, 4), (6, 12), (-12, 7), (-15, -4), (0, 0)]
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
            offsets = [(0, -5), (0, 0)]
        elif mode == "none":
            offsets = [(0, 0)]
        else:
            lift = -28 if close else -18
            offsets = [(0, lift), (0, lift - 8), (0, -8), (0, 0)]
        self.play_motion(offsets)

    def play_motion(self, offsets: list[tuple[int, int]], index: int = 0) -> None:
        if index >= len(offsets):
            self.canvas.coords(self.pet_id, self.pet_base_x, self.pet_base_y)
            self.motion_active = False
            return
        x_offset, y_offset = offsets[index]
        self.canvas.coords(self.pet_id, self.pet_base_x + x_offset, self.pet_base_y + y_offset)
        self.root.after(70, lambda: self.play_motion(offsets, index + 1))

    def idle(self) -> None:
        self.idle_phase += 1
        if not self.motion_active and not self.typing_active and not self.dragged:
            behavior = self.config.get("idleBehavior", "float")
            if behavior == "still":
                bob = 0
            elif behavior == "nap":
                bob = int(math.sin(self.idle_phase / 11) * 1)
            elif behavior == "look":
                bob = int(math.sin(self.idle_phase / 5) * 2)
                if self.idle_phase % 44 == 0:
                    self.play_motion([(5, 0), (-5, 0), (0, 0)])
            elif behavior == "stretch":
                bob = int(math.sin(self.idle_phase / 5) * 3)
                if self.idle_phase % 50 == 0:
                    self.play_motion([(0, 5), (0, -10), (0, -4), (0, 0)])
            else:
                bob = int(math.sin(self.idle_phase / 5) * 3)
            if not self.motion_active:
                look_x, look_y = self.cursor_offset
                self.canvas.coords(self.pet_id, self.pet_base_x + look_x, self.pet_base_y + bob + look_y)
        self.root.after(120, self.idle)

    def cursor_position(self) -> tuple[int, int] | None:
        if not sys.platform.startswith("win"):
            return None
        point = wintypes.POINT()
        if ctypes.windll.user32.GetCursorPos(ctypes.byref(point)):
            return point.x, point.y
        return None

    def track_cursor(self) -> None:
        cursor = self.cursor_position()
        mode = self.config.get("cursorFollowMode", "look")
        if cursor and not self.dragged:
            mouse_x, mouse_y = cursor
            center_x = self.root.winfo_x() + self.width // 2
            center_y = self.root.winfo_y() + self.height // 2
            dx, dy = mouse_x - center_x, mouse_y - center_y
            distance = max(1, math.hypot(dx, dy))

            if mode == "look":
                self.cursor_offset = (
                    max(-8, min(8, int(dx / 38))),
                    max(-4, min(4, int(dy / 55))),
                )
            else:
                self.cursor_offset = (0, 0)

            if mode == "follow" and 170 < distance < 760 and not self.motion_active:
                target_x = max(8, min(self.root.winfo_screenwidth() - self.width - 8, mouse_x - self.width // 2))
                target_y = max(36, min(self.root.winfo_screenheight() - self.height - 56, mouse_y - self.height - 18))
                next_x = round(self.root.winfo_x() + (target_x - self.root.winfo_x()) * .09)
                next_y = round(self.root.winfo_y() + (target_y - self.root.winfo_y()) * .09)
                self.root.geometry(f"+{next_x}+{next_y}")
            elif mode == "playful" and distance < 210 and not self.motion_active:
                away_x = self.root.winfo_x() - int(dx * .44)
                away_y = self.root.winfo_y() - int(dy * .44)
                safe_x = max(8, min(self.root.winfo_screenwidth() - self.width - 8, away_x))
                safe_y = max(36, min(self.root.winfo_screenheight() - self.height - 56, away_y))
                self.root.geometry(f"+{safe_x}+{safe_y}")

            is_near = distance < 190
            frequency = self.config.get("proactiveFrequency", "gentle")
            interval = {"lively": 15, "gentle": 32, "quiet": 10**9}.get(frequency, 32)
            if is_near and not self.last_cursor_near and time.monotonic() - self.last_proactive_at > interval:
                self.last_proactive_at = time.monotonic()
                if frequency != "quiet" and self.config.get("hoverBubble", True):
                    self.show_bubble(random.choice(["鼠标来啦！", "我在看着你哦。", "想和我玩一下吗？"]), 1800)
            self.last_cursor_near = is_near
        self.root.after(160, self.track_cursor)

    def is_key_active(self) -> bool:
        if not sys.platform.startswith("win"):
            return False
        user32 = ctypes.windll.user32
        # 只读取“是否有任意按键按下”的状态，不记录任何键名或输入内容。
        key_ranges = (range(0x08, 0x5B), range(0x60, 0x70), range(0x70, 0x88))
        return any(user32.GetAsyncKeyState(key) & 0x8000 for key_range in key_ranges for key in key_range)

    def track_keyboard(self) -> None:
        if self.config.get("keyboardSync", False) and self.is_key_active():
            self.start_typing_effect()
        if self.config.get("keyboardSync", False):
            self.root.after(90, self.track_keyboard)

    def start_typing_effect(self) -> None:
        if self.typing_active or self.dragged:
            return
        self.typing_active = True
        keyboard_top = self.photo.height() + 37
        board = self.canvas.create_rectangle(
            self.pet_base_x - 52, keyboard_top, self.pet_base_x + 52, keyboard_top + 20,
            fill="#dff5ff", outline="#7cb8db",
        )
        keys = self.canvas.create_text(
            self.pet_base_x, keyboard_top + 10, text="⌨  ·  ·  ·  ·", fill="#173047",
            font=("Segoe UI Symbol", 10, "bold"),
        )
        self.typing_ids = [board, keys]
        if self.config.get("keyboardReaction", "bongo") == "cheer" and time.monotonic() - self.last_typing_hint_at > 12:
            self.last_typing_hint_at = time.monotonic()
            self.show_bubble(random.choice(["打字也要加油！", "我在陪你完成它。", "键盘节奏真好听。"]), 1600)
        self.play_typing_step(0)

    def play_typing_step(self, step: int) -> None:
        if step >= 9:
            self.canvas.coords(self.pet_id, self.pet_base_x, self.pet_base_y)
            for item_id in self.typing_ids:
                self.canvas.delete(item_id)
            self.typing_ids = []
            self.typing_active = False
            return
        reaction = self.config.get("keyboardReaction", "bongo")
        if reaction == "quiet":
            offsets = [(0, 0), (1, -1), (0, 0)]
        else:
            offsets = [(-5, 5), (5, 1), (-3, 4), (4, 0)]
        x_offset, y_offset = offsets[step % len(offsets)]
        self.canvas.coords(self.pet_id, self.pet_base_x + x_offset, self.pet_base_y + y_offset)
        self.root.after(75, lambda: self.play_typing_step(step + 1))

    def spawn_particles(self, close: bool = False) -> None:
        symbols = ["✦", "♥", "·"] if close else ["✦", "·", "+"]
        for _ in range(5 if close else 3):
            particle = self.canvas.create_text(
                self.pet_base_x + random.randint(-42, 42),
                self.pet_base_y + random.randint(-28, 18),
                text=random.choice(symbols),
                fill=random.choice(["#8ce4ff", "#ffb9dd", "#fff1a6"]),
                font=("Segoe UI Symbol", 13, "bold"),
            )
            self.rise_particle(particle, random.randint(-3, 3), 0)

    def rise_particle(self, particle: int, horizontal: int, step: int) -> None:
        if step >= 8:
            self.canvas.delete(particle)
            return
        self.canvas.move(particle, horizontal, -5)
        self.root.after(55, lambda: self.rise_particle(particle, horizontal, step + 1))

    def on_hover(self, _event: tk.Event) -> None:
        self.hovered = True
        effect = self.config.get("hoverEffect", "halo")
        if effect == "halo" and self.aura_id is None:
            self.aura_id = self.canvas.create_oval(
                18, 18, self.width - 18, self.photo.height() + 52,
                outline="#8ddcff", width=2,
            )
            self.canvas.tag_lower(self.aura_id, self.pet_id)
        elif effect == "greeting" and self.config.get("hoverBubble", True):
            self.show_bubble(random.choice(["你好呀，我看到你啦。", "今天也一起加油。", "摸摸我吧！"]), 1800)
        elif effect == "hop":
            self.animate(mode="jump")
        elif effect == "sparkle":
            self.spawn_particles()
        elif effect == "shy":
            self.play_motion([(-8, 3), (-12, 4), (-6, 1), (0, 0)])

    def on_leave(self, _event: tk.Event) -> None:
        self.hovered = False
        if self.aura_id is not None:
            self.canvas.delete(self.aura_id)
            self.aura_id = None
        effect = self.config.get("leaveEffect", "stay")
        if effect == "goodbye":
            self.show_bubble(random.choice(["我在这里等你。", "一会儿见。", "忙完再来找我吧。"]), 1800)
        elif effect == "hide":
            self.root.withdraw()
            self.root.after(1100, self.restore_after_hide)

    def hide_temporarily(self) -> None:
        self.root.withdraw()
        self.root.after(10000, self.restore_after_hide)

    def restore_after_hide(self) -> None:
        self.root.deiconify()
        self.show_bubble("我回来啦。", 1800)

    def wander(self) -> None:
        if self.config.get("wanderEnabled", False) and not self.dragged and not self.desktop_hidden:
            screen_w = self.root.winfo_screenwidth()
            screen_h = self.root.winfo_screenheight()
            x = random.randint(24, max(24, screen_w - self.width - 24))
            y = random.randint(80, max(80, screen_h - self.height - 88))
            self.root.geometry(f"+{x}+{y}")
            if self.config.get("hoverBubble", True):
                self.show_bubble(random.choice(["我来这里看看。", "换个地方陪你。", "巡游完成！"]), 1700)
        if self.config.get("wanderEnabled", False):
            self.root.after(random.randint(22000, 42000), self.wander)

    def toggle_topmost(self) -> None:
        current = bool(self.root.attributes("-topmost"))
        self.root.attributes("-topmost", not current)
        self.show_bubble("已始终置顶" if not current else "已取消始终置顶", 1800)

    def is_desktop_foreground(self) -> bool:
        user32 = ctypes.windll.user32
        foreground = user32.GetForegroundWindow()
        if not foreground:
            return True
        root_handle = user32.GetAncestor(self.root.winfo_id(), 2)
        foreground_root = user32.GetAncestor(foreground, 2)
        if root_handle == foreground_root:
            return True
        class_name = ctypes.create_unicode_buffer(256)
        user32.GetClassNameW(foreground, class_name, len(class_name))
        return class_name.value in {"Progman", "WorkerW", "Shell_TrayWnd"}

    def sync_desktop_visibility(self) -> None:
        if not self.desktop_only:
            return
        on_desktop = self.is_desktop_foreground()
        if on_desktop and self.desktop_hidden:
            self.root.deiconify()
            self.root.lift()
            self.desktop_hidden = False
        elif not on_desktop and not self.desktop_hidden:
            self.root.withdraw()
            self.desktop_hidden = True
        self.root.after(250, self.sync_desktop_visibility)

    def show_bubble(self, text: object, duration: int) -> None:
        self.bubble_token += 1
        token = self.bubble_token
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
        self.root.after(duration, lambda: self.clear_bubble_if_current(token))

    def clear_bubble_if_current(self, token: int) -> None:
        if token == self.bubble_token:
            self.clear_bubble()

    def clear_bubble(self) -> None:
        for item_id in self.bubble_ids:
            self.canvas.delete(item_id)
        self.bubble_ids = []

    def open_target(
        self,
        target_type: str,
        target: object,
        fallback: object = "",
        app_paths: object = (),
    ) -> None:
        try:
            if target_type == "app":
                for raw_path in app_paths if isinstance(app_paths, list) else ():
                    app_path = Path(os.path.expandvars(str(raw_path).strip()))
                    if app_path.is_file():
                        os.startfile(str(app_path))
                        self.show_bubble("已打开本机软件", 1800)
                        return
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
