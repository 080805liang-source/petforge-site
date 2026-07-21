"use strict";

const body = document.body;
const previewPet = document.querySelector("#preview-pet");
const heroUserPet = document.querySelector("#hero-user-pet");
const heroAssetStatus = document.querySelector("#hero-asset-status");
const previewBubble = document.querySelector("#preview-bubble");
const previewEmpty = document.querySelector("#preview-empty");
const previewStatus = document.querySelector("#preview-status");
const petImage = document.querySelector("#pet-image");
const stylePresets = [...document.querySelectorAll(".style-preset")];
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
const shortcutTemplate = document.querySelector("#shortcut-template");
const manualShortcutFields = document.querySelector("#manual-shortcut-fields");
const addShortcutButton = document.querySelector("#add-shortcut");
const shortcutList = document.querySelector("#shortcut-list");
const alwaysOnTop = document.querySelector("#always-on-top");
const desktopOnly = document.querySelector("#desktop-only");
const petShadow = document.querySelector("#pet-shadow");
const exportButton = document.querySelector("#export-config");
const buildButton = document.querySelector("#build-package");
const buildStatus = document.querySelector("#build-status");
const encoder = new TextEncoder();
const supabaseConfig = window.PETFORGE_SUPABASE;

let currentImageName = "";
let customShortcuts = [];
let selectedStyle = "original";
let styledPetBlob = null;
let previewImageUrl = "";
let styleRequestId = 0;

const commonShortcutPresets = {
  "浏览器": { label: "打开浏览器", type: "url", target: "https://www.baidu.com/" },
  "抖音": { label: "打开抖音", type: "app", target: "snssdk1128://", fallback: "https://www.douyin.com/", appPaths: ["%LocalAppData%\\Douyin\\Douyin.exe", "%ProgramFiles%\\Douyin\\Douyin.exe"] },
  "哔哩哔哩": { label: "打开哔哩哔哩", type: "app", target: "bilibili://", fallback: "https://www.bilibili.com/", appPaths: ["%LocalAppData%\\Programs\\bilibili\\bilibili.exe", "%ProgramFiles%\\bilibili\\bilibili.exe"] },
  "QQ": { label: "打开 QQ", type: "app", target: "tencent://", fallback: "https://im.qq.com/", appPaths: ["%ProgramFiles%\\Tencent\\QQNT\\QQ.exe", "%ProgramFiles(x86)%\\Tencent\\QQNT\\QQ.exe", "%ProgramFiles%\\Tencent\\QQ\\QQ.exe", "%ProgramFiles(x86)%\\Tencent\\QQ\\QQ.exe", "%LocalAppData%\\Tencent\\QQ\\QQ.exe"] },
  "微信": { label: "打开微信", type: "app", target: "weixin://", fallback: "https://weixin.qq.com/", appPaths: ["%ProgramFiles%\\Tencent\\WeChat\\WeChat.exe", "%ProgramFiles(x86)%\\Tencent\\WeChat\\WeChat.exe", "%LocalAppData%\\Tencent\\WeChat\\WeChat.exe"] },
  "飞书": { label: "打开飞书", type: "app", target: "feishu://", fallback: "https://www.feishu.cn/", appPaths: ["%LocalAppData%\\Programs\\Feishu\\Feishu.exe", "%LocalAppData%\\Feishu\\Feishu.exe", "%ProgramFiles%\\Feishu\\Feishu.exe"] },
  "钉钉": { label: "打开钉钉", type: "app", target: "dingtalk://", fallback: "https://www.dingtalk.com/", appPaths: ["%LocalAppData%\\DingTalk\\DingTalk.exe", "%ProgramFiles(x86)%\\DingDing\\DingTalk.exe", "%ProgramFiles%\\DingDing\\DingTalk.exe"] },
  "企业微信": { label: "打开企业微信", type: "app", target: "wxwork://", fallback: "https://work.weixin.qq.com/", appPaths: ["%ProgramFiles%\\Tencent\\WeChat\\WXWork\\WXWork.exe", "%ProgramFiles(x86)%\\Tencent\\WeChat\\WXWork\\WXWork.exe"] },
  "WPS Office": { label: "打开 WPS Office", type: "app", target: "wps://", fallback: "https://www.wps.cn/", appPaths: ["%ProgramFiles%\\kingsoft\\WPS Office\\ksolaunch.exe", "%ProgramFiles(x86)%\\kingsoft\\WPS Office\\ksolaunch.exe"] },
  "Microsoft Office": { label: "打开 Microsoft Office", type: "url", target: "https://www.microsoft365.com/" },
  "Steam": { label: "打开 Steam", type: "app", target: "steam://open/main", fallback: "https://store.steampowered.com/", appPaths: ["%ProgramFiles(x86)%\\Steam\\steam.exe", "%ProgramFiles%\\Steam\\steam.exe"] },
  "Epic Games": { label: "打开 Epic Games", type: "app", target: "com.epicgames.launcher://apps", fallback: "https://store.epicgames.com/", appPaths: ["%ProgramFiles%\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe", "%ProgramFiles(x86)%\\Epic Games\\Launcher\\Portal\\Binaries\\Win32\\EpicGamesLauncher.exe"] },
  "网易云音乐": { label: "打开网易云音乐", type: "app", target: "orpheus://", fallback: "https://music.163.com/", appPaths: ["%ProgramFiles%\\Netease\\CloudMusic\\cloudmusic.exe", "%ProgramFiles(x86)%\\Netease\\CloudMusic\\cloudmusic.exe"] },
  "VS Code": { label: "打开 VS Code", type: "app", target: "vscode://", fallback: "https://code.visualstudio.com/", appPaths: ["%LocalAppData%\\Programs\\Microsoft VS Code\\Code.exe", "%ProgramFiles%\\Microsoft VS Code\\Code.exe"] },
  "Discord": { label: "打开 Discord", type: "app", target: "discord://", fallback: "https://discord.com/app", appPaths: ["%LocalAppData%\\Discord\\Update.exe"] }
};

function setStatus(message, type = "") {
  if (!buildStatus) return;
  buildStatus.textContent = message;
  buildStatus.classList.toggle("is-error", type === "error");
  buildStatus.classList.toggle("is-success", type === "success");
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
    desktopOnly: Boolean(desktopOnly.checked),
    shadow: Boolean(petShadow.checked),
    visualStyle: selectedStyle,
    customShortcuts,
    generatedAt: new Date().toISOString()
  };
}

function renderShortcuts() {
  if (!shortcutList) return;
  shortcutList.replaceChildren();
  if (!customShortcuts.length) {
    const empty = document.createElement("p");
    empty.className = "shortcut-empty";
    empty.textContent = "尚未添加快捷入口";
    shortcutList.append(empty);
    return;
  }

  customShortcuts.forEach((shortcut) => {
    const row = document.createElement("div");
    row.className = "shortcut-item";
    const text = document.createElement("span");
    text.textContent = shortcut.label;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "shortcut-remove";
    remove.dataset.shortcutId = shortcut.id;
    remove.setAttribute("aria-label", `移除 ${shortcut.label}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      customShortcuts = customShortcuts.filter((item) => item.id !== shortcut.id);
      renderShortcuts();
      setStatus("快捷入口已移除。");
    });
    row.append(text, remove);
    shortcutList.append(row);
  });
}

function addShortcut({ label, type, target, fallback = "", appPaths = [] }) {
  if (!label || !target) {
    setStatus("请填写快捷入口的名称和目标地址。", "error");
    return false;
  }
  if (customShortcuts.some((shortcut) => shortcut.label === label || shortcut.target === target)) {
    setStatus(`${label} 已在桌宠右键菜单中。`, "error");
    return false;
  }

  customShortcuts.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label,
    type,
    target,
    fallback,
    appPaths
  });
  return true;
}

function addCustomShortcut() {
  const label = customLabel?.value.trim();
  const target = customTarget?.value.trim();
  if (!addShortcut({ label, type: customType.value, target })) return;
  customLabel.value = "";
  customTarget.value = "";
  if (shortcutTemplate) shortcutTemplate.value = "";
  if (manualShortcutFields) manualShortcutFields.hidden = true;
  renderShortcuts();
  setStatus("快捷入口已加入桌宠右键菜单。", "success");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
  previewBubble.hidden = !petImage.files?.[0];
  previewEmpty.hidden = Boolean(petImage.files?.[0]);
  previewPet.hidden = !petImage.files?.[0];
  if (previewStatus) {
    previewStatus.textContent = petStatus.options[petStatus.selectedIndex].text;
  }
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

function limitImageSize(width, height) {
  const longestSide = 1600;
  const scale = Math.min(1, longestSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function posterize(context, width, height, levels) {
  const imageData = context.getImageData(0, 0, width, height);
  const step = 255 / (levels - 1);
  for (let index = 0; index < imageData.data.length; index += 4) {
    if (!imageData.data[index + 3]) continue;
    imageData.data[index] = Math.round(imageData.data[index] / step) * step;
    imageData.data[index + 1] = Math.round(imageData.data[index + 1] / step) * step;
    imageData.data[index + 2] = Math.round(imageData.data[index + 2] / step) * step;
  }
  context.putImageData(imageData, 0, 0);
}

function addComicInk(context, width, height) {
  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;
  const luminance = (index) => data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const index = (y * width + x) * 4;
      if (!data[index + 3]) continue;
      const right = index + 4;
      const below = index + width * 4;
      if (Math.abs(luminance(index) - luminance(right)) + Math.abs(luminance(index) - luminance(below)) > 112) {
        data[index] = 15;
        data[index + 1] = 23;
        data[index + 2] = 34;
      }
    }
  }
  context.putImageData(imageData, 0, 0);
}

async function renderStyle(blob, style) {
  if (style === "original") return blob;
  const sourceUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = sourceUrl;
    await image.decode();
    const size = limitImageSize(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d", { willReadFrequently: style === "comic" || style === "toon" });

    if (style === "pixel") {
      const pixelScale = Math.max(1, Math.ceil(Math.max(size.width, size.height) / 112));
      const smallWidth = Math.max(1, Math.round(size.width / pixelScale));
      const smallHeight = Math.max(1, Math.round(size.height / pixelScale));
      const smallCanvas = document.createElement("canvas");
      smallCanvas.width = smallWidth;
      smallCanvas.height = smallHeight;
      smallCanvas.getContext("2d").drawImage(image, 0, 0, smallWidth, smallHeight);
      context.imageSmoothingEnabled = false;
      context.drawImage(smallCanvas, 0, 0, smallWidth, smallHeight, 0, 0, size.width, size.height);
    } else {
      const filters = {
        toon: "saturate(1.32) contrast(1.12) brightness(1.07)",
        comic: "saturate(1.24) contrast(1.28)",
        chrome: "saturate(.62) contrast(1.2) brightness(1.12)",
        neon: "saturate(1.72) contrast(1.24) brightness(.96)"
      };
      context.filter = filters[style] || "none";
      context.drawImage(image, 0, 0, size.width, size.height);
      context.filter = "none";
    }

    if (style === "toon") posterize(context, size.width, size.height, 7);
    if (style === "comic") {
      posterize(context, size.width, size.height, 5);
      addComicInk(context, size.width, size.height);
    }
    if (style === "chrome" || style === "neon") {
      const sheen = context.createLinearGradient(0, 0, size.width, size.height);
      if (style === "chrome") {
        sheen.addColorStop(0, "rgba(102, 225, 255, .42)");
        sheen.addColorStop(.48, "rgba(255, 255, 255, .08)");
        sheen.addColorStop(1, "rgba(255, 102, 186, .38)");
      } else {
        sheen.addColorStop(0, "rgba(70, 233, 255, .34)");
        sheen.addColorStop(.52, "rgba(32, 24, 92, .1)");
        sheen.addColorStop(1, "rgba(255, 51, 187, .4)");
      }
      context.globalCompositeOperation = "source-atop";
      context.fillStyle = sheen;
      context.fillRect(0, 0, size.width, size.height);
      context.globalCompositeOperation = "source-over";
    }

    return await new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("风格处理失败")), "image/png"));
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function showStyledPet(blob) {
  if (previewImageUrl) URL.revokeObjectURL(previewImageUrl);
  previewImageUrl = URL.createObjectURL(blob);
  previewPet.src = previewImageUrl;
  heroUserPet.src = previewImageUrl;
  previewPet.hidden = false;
  heroUserPet.hidden = false;
  previewBubble.hidden = false;
  previewEmpty.hidden = true;
}

async function applySelectedStyle() {
  const source = petImage.files?.[0];
  if (!source) return;
  const requestId = ++styleRequestId;
  setStatus(selectedStyle === "original" ? "图片已载入。" : "正在生成风格化桌宠...");
  try {
    const result = await renderStyle(source, selectedStyle);
    if (requestId !== styleRequestId) return;
    styledPetBlob = selectedStyle === "original" ? null : result;
    showStyledPet(result);
    heroAssetStatus.textContent = selectedStyle === "original" ? "角色已进入创作舱" : "风格已应用到角色";
    buildButton.disabled = false;
    setStatus(selectedStyle === "original" ? "图片已载入。现在可以继续调试外观与功能。" : "风格已应用，生成包会使用当前效果。", "success");
    updatePreview();
  } catch (error) {
    setStatus(`风格处理失败：${error.message}`, "error");
  }
}

async function getPetPngBytes(config) {
  if (styledPetBlob || petImage.files?.[0]) {
    return blobToPngBytes(styledPetBlob || petImage.files[0], config.size);
  }
  throw new Error("请先上传你的桌宠图片");
}

function packageReadme(config) {
  return `# ${config.name}

这是由 PET FORGE 生成的 Windows 桌宠应用包。

运行方式：

1. 解压整个 zip。
2. 双击 PetForge.exe。

说明：

- PetForge.exe 已包含运行环境，不需要安装 Python。
- 右键桌宠可以打开快捷菜单。
- 左键拖拽可以移动桌宠。
- 左键点击会触发台词和动画。
`;
}

async function getDesktopAppBytes() {
  const response = await fetch(new URL("assets/PetForge.exe", document.baseURI), { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Windows 应用文件暂时不可用，请稍后再试");
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function buildPackageInBrowser() {
  const config = getConfig();
  const name = safeName(config.name);
  const [pngBytes, appBytes] = await Promise.all([getPetPngBytes(config), getDesktopAppBytes()]);
  const entries = [
    { name: "README.md", data: packageReadme(config) },
    { name: "PetForge.exe", data: appBytes },
    { name: "config.json", data: JSON.stringify(config, null, 2) },
    { name: "assets/pet.png", data: pngBytes }
  ];
  return { name, blob: createZip(entries) };
}

const slides = [...document.querySelectorAll("[data-slide]")];
const slideLinks = [...document.querySelectorAll(".slide-rail a")];
if (slides.length && "IntersectionObserver" in window) {
  const visibility = new Map(slides.map((slide) => [slide, 0]));
  let activeSlide = slides.find((slide) => slide.classList.contains("is-active")) || slides[0];
  let syncFrame = 0;
  const syncActiveSlide = () => {
    syncFrame = 0;
    const nextSlide = slides.reduce((best, slide) => (
      visibility.get(slide) > visibility.get(best) ? slide : best
    ), slides[0]);
    if (nextSlide === activeSlide || !visibility.get(nextSlide)) return;
    activeSlide = nextSlide;
    slides.forEach((slide) => slide.classList.toggle("is-active", slide === activeSlide));
    slideLinks.forEach((link) => {
      link.classList.toggle("is-current", link.getAttribute("href") === `#${activeSlide.id || "top"}`);
    });
  };
  const slideObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      visibility.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
    });
    if (!syncFrame) syncFrame = requestAnimationFrame(syncActiveSlide);
  }, { threshold: [0, .18, .5, .82], rootMargin: "-7% 0px -12% 0px" });
  slides.forEach((slide) => slideObserver.observe(slide));
}

petImage?.addEventListener("change", () => {
  const file = petImage.files?.[0];
  if (!file) return;

  currentImageName = file.name;
  styledPetBlob = null;
  applySelectedStyle();
});

stylePresets.forEach((preset) => {
  preset.addEventListener("click", () => {
    selectedStyle = preset.dataset.style || "original";
    stylePresets.forEach((item) => {
      const selected = item === preset;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    applySelectedStyle();
  });
});

[petLine, petSize, petOpacity, petStatus, bubbleStyle, petShadow].forEach((control) => {
  control?.addEventListener("input", updatePreview);
  control?.addEventListener("change", updatePreview);
});

previewEmpty?.addEventListener("click", () => petImage?.click());

shortcutTemplate?.addEventListener("change", () => {
  const preset = commonShortcutPresets[shortcutTemplate.value];
  if (preset) {
    if (addShortcut(preset)) {
      shortcutTemplate.value = "";
      if (manualShortcutFields) manualShortcutFields.hidden = true;
      renderShortcuts();
      setStatus(`${preset.label} 已加入桌宠右键菜单。`, "success");
    }
    return;
  }
  if (shortcutTemplate.value === "自定义") {
    if (manualShortcutFields) manualShortcutFields.hidden = false;
    customLabel.value = "";
    customTarget.value = "";
    customLabel.focus();
  } else if (manualShortcutFields) {
    manualShortcutFields.hidden = true;
  }
});

addShortcutButton?.addEventListener("click", addCustomShortcut);

exportButton?.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(getConfig(), null, 2)], {
    type: "application/json;charset=utf-8"
  });
  downloadBlob(blob, "desktop-pet-config.json");
});

buildButton?.addEventListener("click", async () => {
  buildButton.disabled = true;
  setStatus("正在组装 Windows 桌宠应用...");

  try {
    const result = await buildPackageInBrowser();
    downloadBlob(result.blob, `${result.name}-windows-pet.zip`);
    setStatus("Windows 应用包已生成。解压后直接双击 PetForge.exe。", "success");
  } catch (error) {
    setStatus(`生成失败：${error.message}`, "error");
  } finally {
    buildButton.disabled = false;
  }
});

updatePreview();
renderShortcuts();
async function loadWorkshopTemplate() {
  const templateId = new URLSearchParams(window.location.search).get("template");
  if (!templateId || !supabaseConfig) return;
  setStatus("正在载入工坊桌宠...");
  try {
    const response = await fetch(`${supabaseConfig.url}/rest/v1/workshop_pets?id=eq.${encodeURIComponent(templateId)}&is_public=eq.true&select=title,image_path,config`, {
      headers: { apikey: supabaseConfig.publishableKey, Authorization: `Bearer ${supabaseConfig.publishableKey}` }
    });
    const records = await response.json();
    if (!response.ok || !records?.[0]) throw new Error("未找到这个工坊作品");
    const template = records[0];
    const templateConfig = template.config || {};
    petName.value = templateConfig.name || template.title;
    petLine.value = templateConfig.clickLine || petLine.value;
    petSize.value = templateConfig.size || petSize.value;
    petOpacity.value = templateConfig.opacity || petOpacity.value;
    petStatus.value = templateConfig.status || petStatus.value;
    petAnimation.value = templateConfig.clickAnimation || petAnimation.value;
    bubbleStyle.value = templateConfig.bubbleStyle || bubbleStyle.value;
    petPosition.value = templateConfig.position || petPosition.value;
    alwaysOnTop.checked = templateConfig.alwaysOnTop !== false;
    desktopOnly.checked = templateConfig.desktopOnly === true;
    petShadow.checked = templateConfig.shadow !== false;
    customShortcuts = Array.isArray(templateConfig.customShortcuts) ? templateConfig.customShortcuts : [];
    selectedStyle = templateConfig.visualStyle || "original";
    stylePresets.forEach((preset) => {
      const selected = preset.dataset.style === selectedStyle;
      preset.classList.toggle("is-selected", selected);
      preset.setAttribute("aria-pressed", String(selected));
    });
    const imageResponse = await fetch(`${supabaseConfig.url}/storage/v1/object/public/${supabaseConfig.bucket}/${template.image_path}`);
    if (!imageResponse.ok) throw new Error("无法读取这个作品的图片");
    const imageBlob = await imageResponse.blob();
    const imageFile = new File([imageBlob], template.image_path.split("/").pop() || "pet.png", { type: imageBlob.type || "image/png" });
    const transfer = new DataTransfer();
    transfer.items.add(imageFile);
    petImage.files = transfer.files;
    petImage.dispatchEvent(new Event("change"));
    renderShortcuts();
    updatePreview();
  } catch (error) {
    setStatus(`工坊作品载入失败：${error.message}`, "error");
  }
}
loadWorkshopTemplate();
