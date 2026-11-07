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
from pathlib import Path
import tkinter as tk
from tkinter import messagebox
from ctypes import wintypes


def app_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


BASE_DIR = app_dir()
CONFIG_PATH = BASE_DIR / "config.json"
IMAGE_PATH = BASE_DIR / "assets" / "pet.png"
FRAME_SECONDS = 1 / 60


def motion_offset(points: list[tuple[float, float]], elapsed: float, duration: float) -> tuple[float, float]:
    progress = max(0.0, min(1.0, elapsed / duration)) * (len(points) - 1)
    index = min(int(progress), len(points) - 2)
    blend = progress - index
    blend = blend * blend * (3 - 2 * blend)
    start, end = points[index], points[index + 1]
    return start[0] + (end[0] - start[0]) * blend, start[1] + (end[1] - start[1]) * blend


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
        self.shadow_ids: list[int] = []
        self.shadow_enabled = bool(self.config.get("shadow", False))
        self.set_shadow_enabled(self.shadow_enabled)
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
        self.motion_active = False
        self.motion_points: list[tuple[float, float]] = []
        self.motion_started = 0.0
        self.motion_duration = 0.0
        self.motion_enabled = False
        self.frame_timer = None
        self.static_timer = None
        self.keyboard_timer = None
        self.wander_timer = None
        self.timer_precision = False
        self.particles: list[dict] = []
        self.pending_click: str | None = None
        self.double_click_pending = False
        self.aura_id: int | None = None
        self.bubble_token = 0
        self.hovered = False
        self.cursor_offset = (0, 0)
        self.last_cursor_near = False
        self.last_proactive_at = 0.0
        self.typing_active = False
        self.typing_started = 0.0
        self.typing_ids: list[int] = []
        self.last_typing_hint_at = 0.0
        self.place_window()
        self.build_menu()
        self.bind_events()
        self.root.bind("<Destroy>", self.on_destroy, add="+")
        self.show_bubble("单击互动 · 双击亲近 · 拖动移动 · 右键更多", 3200)
        self.set_motion_enabled(bool(self.config.get("motionEnabled", True)))
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
        self.shadow_var = tk.BooleanVar(value=self.shadow_enabled)
        self.motion_var = tk.BooleanVar(value=bool(self.config.get("motionEnabled", True)))
        self.menu.add_checkbutton(label="显示柔和阴影", variable=self.shadow_var, command=lambda: self.set_shadow_enabled(self.shadow_var.get(), persist=True))
        self.menu.add_checkbutton(label="动态模式（目标 60 帧/秒）", variable=self.motion_var, command=lambda: self.set_motion_enabled(self.motion_var.get(), persist=True))
        self.menu.add_command(label="隐藏 10 秒", command=self.hide_temporarily)
        self.menu.add_command(label="切换始终置顶", command=self.toggle_topmost)
        self.menu.add_command(label="退出桌宠", command=self.root.destroy)

    def save_preferences(self) -> None:
        self.config.update(shadow=self.shadow_enabled, motionEnabled=self.motion_enabled, targetFps=60)
        try:
            CONFIG_PATH.write_text(json.dumps(self.config, ensure_ascii=False, indent=2), encoding="utf-8")
        except OSError:
            self.show_bubble("设置已在本次运行生效，当前文件夹无法保存设置。", 2600)

    def set_shadow_enabled(self, enabled: bool, persist: bool = False) -> None:
        self.shadow_enabled = enabled
        for item in self.shadow_ids:
            self.canvas.delete(item)
        self.shadow_ids = []
        if enabled:
            center_y = self.photo.height() + 48
            # Layer light tones instead of a solid black ellipse; Windows Tk
            # does not consistently apply stipple patterns to oval fills.
            for inset, color in [(0, "#eeeae3"), (8, "#e8e4dc"), (16, "#e1ddd5"), (24, "#dad6cf")]:
                item = self.canvas.create_oval(44 + inset, center_y - 10 + inset / 4, self.width - 44 - inset, center_y + 10 - inset / 4, fill=color, outline="")
                self.canvas.tag_lower(item)
                self.shadow_ids.append(item)
        if persist:
            self.save_preferences()

    def set_motion_enabled(self, enabled: bool, persist: bool = False) -> None:
        self.motion_enabled = enabled
        for field in ("frame_timer", "static_timer", "keyboard_timer", "wander_timer"):
            timer = getattr(self, field)
            if timer is not None:
                self.root.after_cancel(timer)
                setattr(self, field, None)
        if sys.platform.startswith("win"):
            if enabled and not self.timer_precision:
                self.timer_precision = ctypes.windll.winmm.timeBeginPeriod(1) == 0
            elif not enabled and self.timer_precision:
                ctypes.windll.winmm.timeEndPeriod(1)
                self.timer_precision = False
        self.motion_active = False
        self.typing_active = False
        if self.aura_id is not None:
            self.canvas.delete(self.aura_id)
            self.aura_id = None
        for item in self.typing_ids:
            self.canvas.delete(item)
        self.typing_ids = []
        for particle in self.particles:
            self.canvas.delete(particle["id"])
        self.particles = []
        self.canvas.coords(self.pet_id, self.pet_base_x, self.pet_base_y)
        if enabled:
            now = time.perf_counter()
            self.idle_started = now
            self.next_idle_action = now + 6
            self.last_frame_at = now
            self.next_frame_at = now + FRAME_SECONDS
            self.frame_timer = self.root.after(17, self.frame)
            if self.config.get("keyboardSync", False):
                self.keyboard_timer = self.root.after(90, self.track_keyboard)
            if self.config.get("wanderEnabled", False):
                self.wander_timer = self.root.after(random.randint(18000, 28000), self.wander)
        else:
            self.last_frame_at = time.perf_counter()
            self.static_timer = self.root.after(100, self.static_tick)
        if persist:
            self.save_preferences()

    def on_destroy(self, event: tk.Event) -> None:
        if event.widget == self.root and self.timer_precision:
            ctypes.windll.winmm.timeEndPeriod(1)
            self.timer_precision = False

    def frame(self) -> None:
        self.frame_timer = None
        if not self.motion_enabled:
            return
        now = time.perf_counter()
        delta = min(now - self.last_frame_at, .1)
        self.last_frame_at = now
        self.track_cursor(delta)
        if self.motion_active:
            elapsed = now - self.motion_started
            x, y = motion_offset(self.motion_points, elapsed, self.motion_duration)
            self.canvas.coords(self.pet_id, self.pet_base_x + x, self.pet_base_y + y)
            self.motion_active = elapsed < self.motion_duration
        elif self.typing_active:
            self.play_typing_step(now)
        elif not self.dragged:
            self.idle(now)
        self.update_particles(now)
        self.next_frame_at += FRAME_SECONDS
        if self.next_frame_at <= time.perf_counter():
            self.next_frame_at = time.perf_counter() + FRAME_SECONDS
        self.frame_timer = self.root.after(max(1, math.ceil((self.next_frame_at - time.perf_counter()) * 1000)), self.frame)

    def static_tick(self) -> None:
        self.static_timer = None
        if self.motion_enabled:
            return
        now = time.perf_counter()
        self.track_cursor(min(now - self.last_frame_at, .2))
        self.last_frame_at = now
        self.static_timer = self.root.after(100, self.static_tick)

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
        if not self.motion_enabled or self.motion_active or self.typing_active:
            return
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

    def play_motion(self, offsets: list[tuple[int, int]]) -> None:
        if not self.motion_enabled or self.typing_active:
            return
        self.motion_points = [(0, 0), *offsets]
        self.motion_started = time.perf_counter()
        self.motion_duration = max(.07, len(offsets) * .07)
        self.motion_active = True

    def idle(self, now: float) -> None:
        if not self.motion_active and not self.typing_active and not self.dragged:
            behavior = self.config.get("idleBehavior", "float")
            elapsed = now - self.idle_started
            if behavior == "still":
                bob = 0
            elif behavior == "nap":
                bob = math.sin(elapsed / 1.32)
            elif behavior == "look":
                bob = math.sin(elapsed / .6) * 2
                if now >= self.next_idle_action:
                    self.next_idle_action = now + 5.28
                    self.play_motion([(5, 0), (-5, 0), (0, 0)])
            elif behavior == "stretch":
                bob = math.sin(elapsed / .6) * 3
                if now >= self.next_idle_action:
                    self.next_idle_action = now + 6
                    self.play_motion([(0, 5), (0, -10), (0, -4), (0, 0)])
            else:
                bob = math.sin(elapsed / .6) * 3
            if not self.motion_active:
                look_x, look_y = self.cursor_offset
                self.canvas.coords(self.pet_id, self.pet_base_x + look_x, self.pet_base_y + bob + look_y)

    def cursor_position(self) -> tuple[int, int] | None:
        if not sys.platform.startswith("win"):
            return None
        point = wintypes.POINT()
        if ctypes.windll.user32.GetCursorPos(ctypes.byref(point)):
            return point.x, point.y
        return None

    def track_cursor(self, delta: float) -> None:
        cursor = self.cursor_position()
        mode = self.config.get("cursorFollowMode", "look")
        if cursor and not self.dragged:
            mouse_x, mouse_y = cursor
            center_x = self.root.winfo_x() + self.width // 2
            center_y = self.root.winfo_y() + self.height // 2
            dx, dy = mouse_x - center_x, mouse_y - center_y
            distance = max(1, math.hypot(dx, dy))

            if mode == "look":
                target_x, target_y = max(-8, min(8, dx / 38)), max(-4, min(4, dy / 55))
                blend = 1 - math.exp(-delta / .09)
                self.cursor_offset = (self.cursor_offset[0] + (target_x - self.cursor_offset[0]) * blend, self.cursor_offset[1] + (target_y - self.cursor_offset[1]) * blend)
            else:
                self.cursor_offset = (0, 0)

            if mode == "follow" and 170 < distance < 760 and not self.motion_active:
                target_x = max(8, min(self.root.winfo_screenwidth() - self.width - 8, mouse_x - self.width // 2))
                target_y = max(36, min(self.root.winfo_screenheight() - self.height - 56, mouse_y - self.height - 18))
                self.move_toward(target_x, target_y, delta, 1.7)
            elif mode == "playful" and distance < 210 and not self.motion_active:
                away_x = self.root.winfo_x() - int(dx * .44)
                away_y = self.root.winfo_y() - int(dy * .44)
                safe_x = max(8, min(self.root.winfo_screenwidth() - self.width - 8, away_x))
                safe_y = max(36, min(self.root.winfo_screenheight() - self.height - 56, away_y))
                self.move_toward(safe_x, safe_y, delta, .16)

            is_near = distance < 190
            frequency = self.config.get("proactiveFrequency", "gentle")
            interval = {"lively": 15, "gentle": 32, "quiet": 10**9}.get(frequency, 32)
            if is_near and not self.last_cursor_near and time.monotonic() - self.last_proactive_at > interval:
                self.last_proactive_at = time.monotonic()
                if frequency != "quiet" and self.config.get("hoverBubble", True):
                    self.show_bubble(random.choice(["鼠标来啦！", "我在看着你哦。", "想和我玩一下吗？"]), 1800)
            self.last_cursor_near = is_near

    def move_toward(self, target_x: float, target_y: float, delta: float, smooth_seconds: float) -> None:
        current_x, current_y = self.root.winfo_x(), self.root.winfo_y()
        previous = getattr(self, "window_position", (current_x, current_y))
        if abs(current_x - previous[0]) > 1 or abs(current_y - previous[1]) > 1:
            previous = (current_x, current_y)
        blend = 1 - math.exp(-delta / smooth_seconds)
        self.window_position = (previous[0] + (target_x - previous[0]) * blend, previous[1] + (target_y - previous[1]) * blend)
        self.root.geometry(f"+{round(self.window_position[0])}+{round(self.window_position[1])}")

    def is_key_active(self) -> bool:
        if not sys.platform.startswith("win"):
            return False
        user32 = ctypes.windll.user32
        # 只读取“是否有任意按键按下”的状态，不记录任何键名或输入内容。
        key_ranges = (range(0x08, 0x5B), range(0x60, 0x70), range(0x70, 0x88))
        return any(user32.GetAsyncKeyState(key) & 0x8000 for key_range in key_ranges for key in key_range)

    def track_keyboard(self) -> None:
        self.keyboard_timer = None
        if not self.motion_enabled:
            return
        if self.config.get("keyboardSync", False) and self.is_key_active():
            self.start_typing_effect()
        if self.config.get("keyboardSync", False):
            self.keyboard_timer = self.root.after(90, self.track_keyboard)

    def start_typing_effect(self) -> None:
        if not self.motion_enabled or self.typing_active or self.motion_active or self.dragged:
            return
        self.typing_active = True
        self.typing_started = time.perf_counter()
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

    def play_typing_step(self, now: float) -> None:
        elapsed = now - self.typing_started
        if elapsed >= .675:
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
        sequence = [(0, 0), *[offsets[index % len(offsets)] for index in range(8)], (0, 0)]
        x_offset, y_offset = motion_offset(sequence, elapsed, .675)
        self.canvas.coords(self.pet_id, self.pet_base_x + x_offset, self.pet_base_y + y_offset)

    def spawn_particles(self, close: bool = False) -> None:
        if not self.motion_enabled:
            return
        symbols = ["✦", "♥", "·"] if close else ["✦", "·", "+"]
        for _ in range(5 if close else 3):
            particle = self.canvas.create_text(
                self.pet_base_x + random.randint(-42, 42),
                self.pet_base_y + random.randint(-28, 18),
                text=random.choice(symbols),
                fill=random.choice(["#8ce4ff", "#ffb9dd", "#fff1a6"]),
                font=("Segoe UI Symbol", 13, "bold"),
            )
            self.particles.append({ "id": particle, "start": time.perf_counter(), "x": self.canvas.coords(particle)[0], "y": self.canvas.coords(particle)[1], "vx": random.randint(-3, 3) / .055 })

    def update_particles(self, now: float) -> None:
        remaining = []
        for particle in self.particles:
            elapsed = now - particle["start"]
            if elapsed >= .44:
                self.canvas.delete(particle["id"])
            else:
                self.canvas.coords(particle["id"], particle["x"] + particle["vx"] * elapsed, particle["y"] - elapsed * (5 / .055))
                remaining.append(particle)
        self.particles = remaining

    def on_hover(self, _event: tk.Event) -> None:
        self.hovered = True
        if not self.motion_enabled:
            if self.config.get("hoverBubble", True):
                self.show_bubble("我在这里，安静陪着你。", 1800)
            return
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
        if not self.motion_enabled:
            return
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
        self.wander_timer = None
        if not self.motion_enabled:
            return
        if self.config.get("wanderEnabled", False) and not self.dragged and not self.desktop_hidden:
            screen_w = self.root.winfo_screenwidth()
            screen_h = self.root.winfo_screenheight()
            x = random.randint(24, max(24, screen_w - self.width - 24))
            y = random.randint(80, max(80, screen_h - self.height - 88))
            self.root.geometry(f"+{x}+{y}")
            if self.config.get("hoverBubble", True):
                self.show_bubble(random.choice(["我来这里看看。", "换个地方陪你。", "巡游完成！"]), 1700)
        if self.config.get("wanderEnabled", False):
            self.wander_timer = self.root.after(random.randint(22000, 42000), self.wander)

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
