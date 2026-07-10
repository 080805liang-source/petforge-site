"use strict";

const body = document.body;
const previewPet = document.querySelector("#preview-pet");
const previewBubble = document.querySelector("#preview-bubble");
const petImage = document.querySelector("#pet-image");
const petName = document.querySelector("#pet-name");
const petLine = document.querySelector("#pet-line");
const petSize = document.querySelector("#pet-size");
const petOpacity = document.querySelector("#pet-opacity");
const sizeOutput = document.querySelector("#size-output");
const opacityOutput = document.querySelector("#opacity-output");
const petStatus = document.querySelector("#pet-status");
const petAnimation = document.querySelector("#pet-animation");
const bubbleStyle = document.querySelector("#bubble-style");
const petPosition = document.querySelector("#pet-position");
const customLabel = document.querySelector("#custom-label");
const customType = document.querySelector("#custom-type");
const customTarget = document.querySelector("#custom-target");
const alwaysOnTop = document.querySelector("#always-on-top");
const petShadow = document.querySelector("#pet-shadow");
const exportButton = document.querySelector("#export-config");
const buildButton = document.querySelector("#build-package");
const buildStatus = document.querySelector("#build-status");
const sceneCard = document.querySelector("[data-tilt]");
const encoder = new TextEncoder();

let currentImageName = "sample-pet.png";

const PET_APP_SOURCE = String.raw`# -*- coding: utf-8 -*-
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
        if self.config.get("shadow", True):
            self.canvas.create_oval(34, self.photo.height() + 42, self.width - 34, self.photo.height() + 76, fill="#222222", outline="", stipple="gray25")
        self.pet_id = self.canvas.create_image(self.width // 2, self.photo.height() // 2 + 28, image=self.photo)
        self.bubble_ids = []
        self.drag_start = (0, 0)
        self.place_window()
        self.build_menu()
        self.bind_events()
        self.show_bubble(self.status_text(), 1800)

    def status_text(self):
        return {
            "companion": "陪伴中",
            "working": "工作中",
            "resting": "休息中",
            "sleeping": "睡觉中",
        }.get(self.config.get("status"), "陪伴中")

    def place_window(self):
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

    def build_menu(self):
        self.menu = tk.Menu(self.root, tearoff=False)
        self.menu.add_command(label="说一句话", command=lambda: self.show_bubble(self.config.get("clickLine", "Ready."), 2200))
        self.menu.add_separator()
        for item in self.config.get("quickMenu", []):
            if item not in ("窗口置顶", "桌面阴影"):
                self.menu.add_command(label=item, command=lambda label=item: self.run_quick_action(label))
        shortcut = self.config.get("customShortcut") or {}
        if shortcut.get("label") and shortcut.get("target"):
            self.menu.add_command(label=shortcut["label"], command=lambda: self.open_target(shortcut.get("type", "url"), shortcut.get("target", "")))
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
        self.root.geometry(f"+{self.root.winfo_x() + event.x - self.drag_start[0]}+{self.root.winfo_y() + event.y - self.drag_start[1]}")

    def left_click(self, _event):
        self.animate()
        self.show_bubble(self.config.get("clickLine", "Ready."), 2400)

    def open_menu(self, event):
        self.menu.tk_popup(event.x_root, event.y_root)

    def animate(self):
        mode = self.config.get("clickAnimation", "jump")
        if mode == "shake":
            for index, offset in enumerate([-9, 9, -7, 7, 0]):
                self.root.after(index * 55, lambda value=offset: self.canvas.move(self.pet_id, value, 0))
        elif mode == "glow":
            glow = self.canvas.create_oval(20, 18, self.width - 20, self.photo.height() + 52, outline="#77d9bd", width=4)
            self.root.after(260, lambda: self.canvas.delete(glow))
        elif mode != "none":
            for index, offset in enumerate([-18, -12, 18, 12, 0]):
                self.root.after(index * 55, lambda value=offset: self.canvas.move(self.pet_id, 0, value))

    def show_bubble(self, text, duration):
        self.clear_bubble()
        safe_text = str(text)[:48]
        fill = "#17201f" if self.config.get("bubbleStyle") == "dark" else "#ffffff"
        ink = "#ffffff" if self.config.get("bubbleStyle") == "dark" else "#17201f"
        rect = self.canvas.create_rectangle(12, 10, min(self.width - 12, 278), 72, fill=fill, outline="#dfe6df")
        label = self.canvas.create_text(26, 24, text=safe_text, anchor="nw", fill=ink, width=230, font=("Microsoft YaHei UI", 10, "bold"))
        self.bubble_ids = [rect, label]
        self.root.after(duration, self.clear_bubble)

    def clear_bubble(self):
        for item_id in self.bubble_ids:
            self.canvas.delete(item_id)
        self.bubble_ids = []

    def run_quick_action(self, label):
        actions = {
            "打开浏览器": lambda: webbrowser.open("https://www.bing.com"),
            "打开 Steam": lambda: subprocess.Popen(["cmd", "/c", "start", "", "steam://open/main"], shell=False),
            "打开 WeGame": lambda: subprocess.Popen(["cmd", "/c", "start", "", "wegame://"], shell=False),
            "打开哔哩哔哩": lambda: webbrowser.open("https://www.bilibili.com"),
            "打开文件夹": lambda: os.startfile(BASE_DIR),
            "休息提醒": lambda: self.show_bubble("该休息一下啦。", 2600),
        }
        try:
            actions.get(label, lambda: None)()
            self.show_bubble(f"已执行：{label}", 1800)
        except Exception as exc:
            self.show_bubble(f"启动失败：{exc}", 2600)

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
`;

function setStatus(message, type = "") {
  if (!buildStatus) return;
  buildStatus.textContent = message;
  buildStatus.classList.toggle("is-error", type === "error");
  buildStatus.classList.toggle("is-success", type === "success");
}

function getEnabledFeatures() {
  return [...document.querySelectorAll(".toggle-list input:checked")]
    .map((input) => input.value);
}

function getConfig() {
  return {
    name: petName.value.trim() || "Untitled Pet",
    image: currentImageName,
    size: Number(petSize.value),
    opacity: Number(petOpacity.value),
    clickLine: petLine.value.trim() || "Ready.",
    status: petStatus.value,
    clickAnimation: petAnimation.value,
    bubbleStyle: bubbleStyle.value,
    position: petPosition.value,
    alwaysOnTop: Boolean(alwaysOnTop.checked),
    shadow: Boolean(petShadow.checked),
    quickMenu: getEnabledFeatures(),
    customShortcut: {
      label: customLabel.value.trim(),
      type: customType.value,
      target: customTarget.value.trim()
    },
    generatedAt: new Date().toISOString()
  };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeName(name) {
  return (name || "desktop-pet").replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "desktop-pet";
}

function updatePreview() {
  const size = Number(petSize.value);
  const opacity = Number(petOpacity.value);
  previewPet.style.width = `${Math.round(210 * size / 100)}px`;
  previewPet.style.opacity = String(opacity / 100);
  previewPet.style.filter = petShadow.checked
    ? "drop-shadow(0 26px 28px rgba(23, 32, 31, 0.2))"
    : "none";
  previewBubble.textContent = petLine.value.trim() || "Ready.";
  previewBubble.classList.toggle("style-glass", bubbleStyle.value === "glass");
  previewBubble.classList.toggle("style-dark", bubbleStyle.value === "dark");
  sizeOutput.textContent = `${size}%`;
  opacityOutput.textContent = `${opacity}%`;
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = makeCrcTable();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTime(date) {
  return (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
}

function dosDate(date) {
  return ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
}

function u16(value) {
  return new Uint8Array([value & 255, (value >>> 8) & 255]);
}

function u32(value) {
  return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]);
}

function concatBytes(parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function createZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  const now = new Date();
  const time = dosTime(now);
  const date = dosDate(now);

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = entry.data instanceof Uint8Array ? entry.data : encoder.encode(entry.data);
    const crc = crc32(data);
    const local = concatBytes([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(time), u16(date),
      u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), nameBytes, data
    ]);
    const central = concatBytes([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(time), u16(date),
      u32(crc), u32(data.length), u32(data.length), u16(nameBytes.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset), nameBytes
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }

  const centralBytes = concatBytes(centrals);
  const end = concatBytes([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(centralBytes.length), u32(offset), u16(0)
  ]);
  return new Blob([concatBytes([...locals, centralBytes, end])], { type: "application/zip" });
}

async function blobToPngBytes(blob, sizePercent) {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const targetHeight = Math.max(96, Math.min(420, Math.round(220 * sizePercent / 100)));
    const ratio = targetHeight / img.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(64, Math.round(img.naturalWidth * ratio));
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    return new Uint8Array(await pngBlob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function getPetPngBytes(config) {
  if (petImage.files?.[0]) {
    return blobToPngBytes(petImage.files[0], config.size);
  }
  const response = await fetch("assets/sample-pet.png");
  return blobToPngBytes(await response.blob(), config.size);
}

function packageReadme(config) {
  return `# ${config.name}

这是由桌宠工坊生成的 Windows 桌宠程序包。

运行方式：

1. 解压整个 zip。
2. 双击 run_desktop_pet.bat。

说明：

- 当前包使用 Python/Tkinter 运行桌宠。
- 如果电脑没有 Python，请先安装 Python 3。
- 右键桌宠可以打开快捷菜单。
- 左键拖拽可以移动桌宠。
- 左键点击会触发台词和动画。
`;
}

async function buildPackageInBrowser() {
  const config = getConfig();
  const name = safeName(config.name);
  const pngBytes = await getPetPngBytes(config);
  const entries = [
    { name: "README.md", data: packageReadme(config) },
    { name: "run_desktop_pet.bat", data: "@echo off\r\ncd /d %~dp0\\app\r\npy -3 desktop_pet.pyw || pythonw desktop_pet.pyw || python desktop_pet.pyw\r\n" },
    { name: "app/config.json", data: JSON.stringify(config, null, 2) },
    { name: "app/desktop_pet.pyw", data: PET_APP_SOURCE },
    { name: "app/assets/pet.png", data: pngBytes }
  ];
  return { name, blob: createZip(entries) };
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", () => {
    body.classList.remove("is-jumping");
    void body.offsetWidth;
    body.classList.add("is-jumping");
    window.setTimeout(() => body.classList.remove("is-jumping"), 760);
  });
});

if (sceneCard) {
  sceneCard.addEventListener("pointermove", (event) => {
    const rect = sceneCard.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    sceneCard.style.transform = `rotateX(${7 - y * 8}deg) rotateY(${-13 + x * 12}deg)`;
  });

  sceneCard.addEventListener("pointerleave", () => {
    sceneCard.style.transform = "";
  });
}

petImage?.addEventListener("change", () => {
  const file = petImage.files?.[0];
  if (!file) return;

  currentImageName = file.name;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    previewPet.src = String(reader.result);
  });
  reader.readAsDataURL(file);
});

[petLine, petSize, petOpacity, bubbleStyle, petShadow].forEach((control) => {
  control?.addEventListener("input", updatePreview);
  control?.addEventListener("change", updatePreview);
});

exportButton?.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(getConfig(), null, 2)], {
    type: "application/json;charset=utf-8"
  });
  downloadBlob(blob, "desktop-pet-config.json");
});

buildButton?.addEventListener("click", async () => {
  buildButton.disabled = true;
  setStatus("正在生成 Windows 桌宠程序包...");

  try {
    const result = await buildPackageInBrowser();
    downloadBlob(result.blob, `${result.name}-windows-pet.zip`);
    setStatus("程序包已生成并开始下载。解压后双击 run_desktop_pet.bat 运行。", "success");
  } catch (error) {
    setStatus(`生成失败：${error.message}`, "error");
  } finally {
    buildButton.disabled = false;
  }
});

updatePreview();
