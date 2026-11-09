"use strict";

const body = document.body;
const previewPet = document.querySelector("#preview-pet");
const previewAnimal = document.querySelector("#preview-animal");
const heroUserPet = document.querySelector("#hero-user-pet");
const heroAssetStatus = document.querySelector("#hero-asset-status");
const previewBubble = document.querySelector("#preview-bubble");
const previewEmpty = document.querySelector("#preview-empty");
const previewStatus = document.querySelector("#preview-status");
const petImage = document.querySelector("#pet-image");
const petBackground = document.querySelector("#pet-background");
const cutoutStatus = document.querySelector("#cutout-status");
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
const petMotion = document.querySelector("#pet-motion");
const hoverEffect = document.querySelector("#hover-effect");
const leaveEffect = document.querySelector("#leave-effect");
const idleBehavior = document.querySelector("#idle-behavior");
const doubleClickEffect = document.querySelector("#double-click-effect");
const cursorFollowMode = document.querySelector("#cursor-follow-mode");
const proactiveFrequency = document.querySelector("#proactive-frequency");
const keyboardReaction = document.querySelector("#keyboard-reaction");
const wanderEnabled = document.querySelector("#wander-enabled");
const hoverBubble = document.querySelector("#hover-bubble");
const clickParticles = document.querySelector("#click-particles");
const soundHint = document.querySelector("#sound-hint");
const keyboardSync = document.querySelector("#keyboard-sync");
const interactionNote = document.querySelector("#interaction-note");
const publishButton = document.querySelector("#publish-workshop");
const publishStatus = document.querySelector("#publish-workshop-status");
const buildButton = document.querySelector("#build-package");
const buildStatus = document.querySelector("#build-status");
const encoder = new TextEncoder();
const workshopApi = window.PETFORGE_MEMBERSHIP?.apiUrl;

let currentImageName = "";
let customShortcuts = [];
let selectedStyle = "original";
let styledPetBlob = null;
let previewImageUrl = "";
let styleRequestId = 0;
let imageRequestId = 0;
let cutoutPetBlob = null;
let imageBusy = false;
let backgroundModule;
let publishing = false;
let workshopTemplateId = "";
let animationPreset = "";
let assetAttribution = "";
let pendingWorkshopDownload = false;
let sharedImageSize = 0;
let interactivePreview;
let animalPreview = null;

async function loadAnimalPreview(key) {
  animalPreview?.bitmap.close(); animalPreview = null;
  if (!key || !previewAnimal) return;
  try {
    const prefix = `assets/workshop/animals/${key}`;
    const [metadata, atlas] = await Promise.all([fetch(`${prefix}-animation.json`), fetch(`${prefix}-atlas.webp`)]);
    if (!metadata.ok || !atlas.ok) return;
    const meta = await metadata.json(), bitmap = await createImageBitmap(await atlas.blob());
    if (key !== animationPreset) { bitmap.close(); return; }
    animalPreview = { meta, bitmap, started: performance.now() };
    previewAnimal.width = meta.width; previewAnimal.height = meta.height;
    updatePreview();
  } catch (_) { /* The still preview and package retry remain available. */ }
}

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
    safeRendering: false,
    desktopOnly: Boolean(desktopOnly.checked),
    shadow: Boolean(petShadow.checked),
    motionEnabled: Boolean(petMotion.checked),
    targetFps: 120,
    animationPreset,
    assetAttribution,
    hoverEffect: hoverEffect.value,
    leaveEffect: leaveEffect.value,
    idleBehavior: idleBehavior.value,
    doubleClickEffect: doubleClickEffect.value,
    cursorFollowMode: animationPreset ? 'none' : cursorFollowMode.value,
    proactiveFrequency: proactiveFrequency.value,
    keyboardReaction: keyboardReaction.value,
    wanderEnabled: Boolean(wanderEnabled.checked),
    hoverBubble: Boolean(hoverBubble.checked),
    clickParticles: Boolean(clickParticles.checked),
    soundHint: Boolean(soundHint.checked),
    keyboardSync: Boolean(keyboardSync.checked),
    interactionNote: interactionNote.value.trim(),
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
  cursorFollowMode.closest('label').hidden = Boolean(animationPreset);
  cursorFollowMode.disabled = Boolean(animationPreset);
  if (animationPreset) cursorFollowMode.value = 'none';
  const size = Number(petSize.value);
  const opacity = Number(petOpacity.value);
  previewPet.style.opacity = String(opacity / 100);
  previewPet.style.filter = petShadow.checked
    ? "drop-shadow(0 26px 28px rgba(23, 32, 31, 0.2))"
    : "none";
  if (!interactivePreview) previewBubble.hidden = true;
  previewEmpty.hidden = Boolean(petImage.files?.[0]);
  previewPet.hidden = !petImage.files?.[0];
  const showAnimal = Boolean(animalPreview && animationPreset && petMotion.checked && selectedStyle === 'original' && petImage.files?.[0]);
  if (previewAnimal) {
    previewAnimal.hidden = !showAnimal;
    previewAnimal.style.opacity = previewPet.style.opacity;
    previewAnimal.style.filter = previewPet.style.filter;
    if (showAnimal) previewPet.hidden = true;
  }
  if (previewStatus) {
    previewStatus.textContent = petStatus.selectedOptions[0]?.text || '陪伴中';
  }
  previewBubble.classList.toggle("style-glass", bubbleStyle.value === "glass");
  previewBubble.classList.toggle("style-dark", bubbleStyle.value === "dark");
  sizeOutput.textContent = `${size}%`;
  opacityOutput.textContent = `${opacity}%`;
  const motion = petMotion.checked;
  [petAnimation, hoverEffect, leaveEffect, idleBehavior, doubleClickEffect, proactiveFrequency, keyboardReaction, wanderEnabled, clickParticles, keyboardSync].forEach((control) => { control.disabled = !motion; });
  interactivePreview?.sync();
}

function renderAnimalFrame(timestamp) {
  if (animalPreview && !previewAnimal.hidden) {
    const {meta,bitmap,started} = animalPreview;
    const i = Math.floor((timestamp - started) * meta.fps / 1000) % meta.count;
    const context = previewAnimal.getContext('2d');
    context.clearRect(0,0,meta.width,meta.height);
    context.drawImage(bitmap,i%meta.columns*meta.width,Math.floor(i/meta.columns)*meta.height,meta.width,meta.height,0,0,meta.width,meta.height);
  }
}
document.addEventListener("visibilitychange", updatePreview);

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
    let targetHeight = Math.max(96, Math.min(420, Math.round(220 * sizePercent / 100)));
    let ratio = targetHeight / img.naturalHeight;
    const maxWidth = 360;
    if (img.naturalWidth * ratio > maxWidth) {
      ratio = maxWidth / img.naturalWidth;
      targetHeight = Math.max(64, Math.round(img.naturalHeight * ratio));
    }
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
  const source = cutoutPetBlob || petImage.files?.[0];
  if (!source) return;
  const requestId = ++styleRequestId;
  styledPetBlob = null;
  setImageBusy(true);
  setStatus(selectedStyle === "original" ? "图片已载入。" : "正在生成风格化桌宠...");
  try {
    const result = await renderStyle(source, selectedStyle);
    if (requestId !== styleRequestId) return;
    styledPetBlob = result;
    showStyledPet(result);
    heroAssetStatus.textContent = selectedStyle === "original" ? "角色已进入创作舱" : "风格已应用到角色";
    setStatus(selectedStyle === "original" ? "图片已载入。现在可以继续调试外观与功能。" : "风格已应用，生成包会使用当前效果。", "success");
    updatePreview();
  } catch (error) {
    if (requestId !== styleRequestId) return;
    setStatus(`风格处理失败：${error.message}`, "error");
  } finally {
    if (requestId === styleRequestId) setImageBusy(false);
  }
}

function setImageBusy(busy) {
  imageBusy = busy;
  buildButton.disabled = busy || !styledPetBlob;
  publishButton.disabled = busy || publishing || !styledPetBlob;
  stylePresets.forEach((preset) => { preset.disabled = busy; });
  cutoutStatus.setAttribute("aria-busy", String(busy));
}

async function preparePetImage() {
  const source = petImage.files?.[0];
  if (!source) return;
  const requestId = ++imageRequestId;
  ++styleRequestId;
  cutoutPetBlob = null;
  styledPetBlob = null;
  setImageBusy(true);
  const messages = {
    preparing: "正在抠出主体…",
    model: "首次使用正在准备智能抠图，请稍候…",
    segment: "正在识别人物、宠物或插画主体…"
  };
  cutoutStatus.textContent = messages.preparing;
  try {
    backgroundModule?.cancelCutout();
    if (!/^image\/(png|jpeg|webp)$/.test(source.type) || source.size > 20 * 1024 * 1024) throw new Error("invalid-image");
    const mode = petBackground.value;
    if (mode !== "original") {
      backgroundModule ||= await import("./background-removal.js?v=outline-20261107-r1");
      if (requestId !== imageRequestId) return;
    }
    const result = mode === "original" ? { blob: source, kind: "original" } : await backgroundModule.cutoutImage(source, mode, (phase) => {
      if (requestId === imageRequestId) cutoutStatus.textContent = messages[phase];
    });
    if (requestId !== imageRequestId) return;
    cutoutPetBlob = result.blob;
    cutoutStatus.textContent = result.kind === "original" ? "已保留原图背景。" : result.kind === "transparent" ? "图片已有透明背景，已保留原有细节。" : "主体已抠出，预览与生成的桌宠均使用透明背景。";
    await applySelectedStyle();
  } catch (error) {
    if (requestId !== imageRequestId) return;
    cutoutStatus.textContent = error.message === "invalid-image" ? "请上传不超过 20 MB 的 PNG、JPG 或 WEBP 图片。" : "未能完成抠图，请重试智能识别，或选择保留原图背景。";
    setStatus(cutoutStatus.textContent, "error");
    setImageBusy(false);
  }
}

async function getPetPngBytes(config) {
  if (imageBusy) throw new Error("浏览器正在处理图片，请稍候。");
  if (workshopTemplateId && styledPetBlob === cutoutPetBlob && config.size === sharedImageSize) return new Uint8Array(await styledPetBlob.arrayBuffer());
  if (styledPetBlob) return blobToPngBytes(styledPetBlob, config.size);
  throw new Error("请先上传你的桌宠图片");
}

function packageReadme(config) {
  return `# ${config.name}

这是由 PET FORGE 生成的 Windows 桌宠应用包。

运行方式：

1. 解压整个 zip 到一个不要移动的位置。
2. 双击 PetForge.exe 启动桌宠。
3. 请保持 PetForge.exe、config.json 和 assets 文件夹在一起。

说明：

- PetForge.exe 已包含运行环境，不需要安装 Python。
- 右键桌宠可以打开快捷菜单。
- 左键拖拽可以移动桌宠。
- 默认静态、无阴影。可在右键菜单随时切换“显示柔和阴影”和“动态模式”。
- 动态模式以 120 帧/秒为目标；开启后，点击、鼠标互动和键盘同步会使用你选择的效果。
`;
}

const PETFORGE_BUILD_VERSION = "2026.11.09-interactive-r2";

async function getDesktopAppBytes() {
  const appUrl = new URL('assets/PetForge.exe', document.baseURI);
  appUrl.searchParams.set("v", PETFORGE_BUILD_VERSION);
  const { fetchDesktopRuntime } = await import('./desktop-runtime.js?v=interactive-20261109-r2');
  return fetchDesktopRuntime(appUrl, (completed, total) => setStatus(`正在准备桌宠运行核心… ${Math.round(completed / total * 100)}%`));
}

async function buildPackageInBrowser() {
  const config = getConfig();
  const name = safeName(config.name);
  const pngBytes = await getPetPngBytes(config);
  config.packageVersion = "zip-portable-v2";
  const appBytes = await getDesktopAppBytes();
  const replyResponse = await fetch(new URL('assets/responses.json', document.baseURI));
  if (!replyResponse.ok) throw new Error('互动回复库下载失败，请重试。');
  const extraFiles = [{name:'assets/responses.json',data:new Uint8Array(await replyResponse.arrayBuffer())}];
  if (config.animationPreset) {
    if (!/^animal-\d{1,12}$/.test(config.animationPreset)) throw new Error('动物动作配置无效。');
    const prefix = `assets/workshop/animals/${config.animationPreset}`;
    const [metaResponse, atlasResponse] = await Promise.all([fetch(new URL(`${prefix}-animation.json`,document.baseURI)),fetch(new URL(`${prefix}-atlas.webp`,document.baseURI))]);
    if (!metaResponse.ok || !atlasResponse.ok) throw new Error('动物动作素材下载失败，请重试。');
    const meta = await metaResponse.json();
    if (!Number.isInteger(meta.count) || meta.count < 2 || meta.count > 120) throw new Error('动物动作文件无效。');
    let atlas = await atlasResponse.blob();
    // Export the same chosen size for every frame, including after resizing.
    {
      const image = await createImageBitmap(atlas);
      const ratio = config.size === sharedImageSize ? 1 : Math.max(96,Math.min(420,Math.round(220*config.size/100))) / meta.height;
      const width=Math.round(meta.width*ratio),height=Math.round(meta.height*ratio);
      const canvas=document.createElement('canvas');canvas.width=width*meta.columns;canvas.height=height*Math.ceil(meta.count/meta.columns);
      const context=canvas.getContext('2d');
      for(let i=0;i<meta.count;i++) context.drawImage(image,(i%meta.columns)*meta.width,Math.floor(i/meta.columns)*meta.height,meta.width,meta.height,(i%meta.columns)*width,Math.floor(i/meta.columns)*height,width,height);
      atlas=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));image.close();meta.width=width;meta.height=height;
    }
    if (config.visualStyle !== 'original') {
      const original=await createImageBitmap(atlas);
      const output=document.createElement('canvas');output.width=original.width;output.height=original.height;
      const context=output.getContext('2d'),cell=document.createElement('canvas');cell.width=meta.width;cell.height=meta.height;
      const cellContext=cell.getContext('2d');
      for(let i=0;i<meta.count;i++) {
        const x=i%meta.columns*meta.width,y=Math.floor(i/meta.columns)*meta.height;
        cellContext.clearRect(0,0,meta.width,meta.height);cellContext.drawImage(original,x,y,meta.width,meta.height,0,0,meta.width,meta.height);
        const frame=await createImageBitmap(await renderStyle(await new Promise(resolve=>cell.toBlob(resolve,'image/png')),config.visualStyle));
        context.drawImage(frame,x,y,meta.width,meta.height);frame.close();
      }
      original.close();atlas=await new Promise(resolve=>output.toBlob(resolve,'image/png'));
    }
    extraFiles.push({name:'assets/animation.json',data:JSON.stringify(meta)},{name:'assets/pet-atlas.png',data:new Uint8Array(await atlas.arrayBuffer())});
  }
  if(config.assetAttribution) extraFiles.push({name:'素材来源与授权.txt',data:config.assetAttribution});
  return { name, blob: createZip([
    { name: "README.md", data: packageReadme(config) },
    { name: "PetForge.exe", data: appBytes },
    { name: "config.json", data: JSON.stringify(config, null, 2) },
    { name: "assets/pet.png", data: pngBytes }, ...extraFiles
  ]) };
}

petImage?.addEventListener("change", () => {
  const file = petImage.files?.[0];
  if (!file) return;

  currentImageName = file.name;
  workshopTemplateId = "";
  animationPreset = "";
  loadAnimalPreview('');
  assetAttribution = "";
  pendingWorkshopDownload = false;
  preparePetImage();
});

petBackground?.addEventListener("change", preparePetImage);

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

[petName, petLine, petSize, petOpacity, petStatus, petAnimation, petPosition, bubbleStyle, petShadow, petMotion, alwaysOnTop, desktopOnly,
 hoverEffect, leaveEffect, idleBehavior, doubleClickEffect, cursorFollowMode, proactiveFrequency,
 keyboardReaction, wanderEnabled, hoverBubble, clickParticles, soundHint, keyboardSync].forEach((control) => {
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

function blobDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("图片读取失败，请重试。"));
    reader.readAsDataURL(blob);
  });
}

publishButton?.addEventListener("click", async () => {
  const membership = window.PetForgeMembership;
  if (!membership?.current()) { membership?.open(); return; }
  if (imageBusy || !styledPetBlob || publishing) return;
  publishing = true;
  publishButton.disabled = true;
  publishStatus.textContent = "正在发布当前图片与全部设置…";
  try {
    const config = getConfig();
    const bytes = await getPetPngBytes(config);
    const image = new Blob([bytes], { type: "image/png" });
    const bitmap = await createImageBitmap(image);
    const ratio = Math.min(1, 160 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const preview = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const payload = JSON.stringify({ config, image: await blobDataUrl(image), preview: await blobDataUrl(preview), description: config.clickLine });
    const uploadId = crypto.randomUUID().replaceAll("-", "");
    const total = Math.ceil(payload.length / 24000);
    for (let index = 0; index < total; index++) {
      await membership.request("/workshop/upload", { method: "POST", body: JSON.stringify({ uploadId, index, total, data: payload.slice(index * 24000, (index + 1) * 24000) }) });
    }
    const result = await membership.request("/workshop", { method: "POST", body: JSON.stringify({ uploadId }) });
    publishStatus.replaceChildren(document.createTextNode("已发布，其他人可以直接使用。"));
    const link = document.createElement("a");
    link.href = `workshop.html?highlight=${encodeURIComponent(result.id)}#workshop-feed`;
    link.textContent = "查看工坊作品";
    publishStatus.append(" ", link);
  } catch (error) {
    publishStatus.textContent = `发布失败：${error.message}`;
  } finally {
    publishing = false;
    setImageBusy(imageBusy);
  }
});

buildButton?.addEventListener("click", async () => {
  buildButton.disabled = true;
  setStatus(`正在生成 Windows 桌宠 ZIP…（${PETFORGE_BUILD_VERSION}）`);

  try {
    const result = await buildPackageInBrowser();
    if (window.PetForgeMembership?.consumeUse) await window.PetForgeMembership.consumeUse(workshopTemplateId);
    downloadBlob(result.blob, `PETFORGE-${result.name}.zip`);
    const usageMessage = window.PetForgeMembership?.isUnlimited?.() ? "本次为无限使用权益，未扣次数。桌宠 ZIP 已下载；解压全部文件后即可启动。" : "本次使用已扣除 1 次。桌宠 ZIP 已下载；解压全部文件后即可启动。";
    setStatus(usageMessage, "success");
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : "生成过程异常，请刷新后重试。";
    setStatus(`生成失败：${message}`, "error");
  } finally {
    buildButton.disabled = false;
  }
});

updatePreview();
renderShortcuts();
async function loadWorkshopTemplate() {
  const templateId = new URLSearchParams(window.location.search).get("template");
  if (!templateId || !workshopApi) return;
  setImageBusy(true);
  setStatus("正在载入工坊桌宠...");
  try {
    const response = await fetch(`${workshopApi}/workshop/${encodeURIComponent(templateId)}`);
    const result = await response.json();
    if (!response.ok || !result.post) throw new Error(result.error || "未找到这个工坊作品");
    const template = result.post;
    const templateConfig = template.config || {};
    animationPreset = /^animal-\d{1,12}$/.test(templateConfig.animationPreset || '') ? templateConfig.animationPreset : '';
    assetAttribution = String(templateConfig.assetAttribution || '').slice(0,8000);
    petName.value = templateConfig.name || template.title;
    petLine.value = templateConfig.clickLine || petLine.value;
    petSize.value = templateConfig.size || petSize.value;
    petOpacity.value = templateConfig.opacity || petOpacity.value;
    petStatus.value = [...petStatus.options].some(option => option.value === templateConfig.status) ? templateConfig.status : 'companion';
    petAnimation.value = templateConfig.clickAnimation || petAnimation.value;
    bubbleStyle.value = [...bubbleStyle.options].some(option => option.value === templateConfig.bubbleStyle) ? templateConfig.bubbleStyle : 'soft';
    petPosition.value = templateConfig.position || petPosition.value;
    alwaysOnTop.checked = templateConfig.alwaysOnTop === true;
    desktopOnly.checked = templateConfig.desktopOnly === true;
    petShadow.checked = templateConfig.shadow === true;
    petMotion.checked = templateConfig.motionEnabled === true;
    hoverEffect.value = templateConfig.hoverEffect === "halo" ? "none" : (templateConfig.hoverEffect || "none");
    leaveEffect.value = templateConfig.leaveEffect === "dim" ? "stay" : (templateConfig.leaveEffect || "stay");
    idleBehavior.value = templateConfig.idleBehavior || idleBehavior.value;
    doubleClickEffect.value = templateConfig.doubleClickEffect || doubleClickEffect.value;
    cursorFollowMode.value = templateConfig.cursorFollowMode || cursorFollowMode.value;
    proactiveFrequency.value = templateConfig.proactiveFrequency || proactiveFrequency.value;
    keyboardReaction.value = [...keyboardReaction.options].some(option => option.value === templateConfig.keyboardReaction) ? templateConfig.keyboardReaction : 'quiet';
    wanderEnabled.checked = templateConfig.wanderEnabled === true;
    hoverBubble.checked = templateConfig.hoverBubble !== false;
    clickParticles.checked = templateConfig.clickParticles !== false;
    soundHint.checked = templateConfig.soundHint === true;
    keyboardSync.checked = templateConfig.keyboardSync === true;
    interactionNote.value = templateConfig.interactionNote || "";
    customShortcuts = Array.isArray(templateConfig.customShortcuts) ? templateConfig.customShortcuts : [];
    selectedStyle = templateConfig.visualStyle || "original";
    stylePresets.forEach((preset) => {
      const selected = preset.dataset.style === selectedStyle;
      preset.classList.toggle("is-selected", selected);
      preset.setAttribute("aria-pressed", String(selected));
    });
    const imageResponse = await fetch(template.image);
    if (!imageResponse.ok) throw new Error("无法读取这个作品的图片");
    const imageBlob = await imageResponse.blob();
    if (template.imageSha256) {
      const digest = await crypto.subtle.digest("SHA-256", await imageBlob.arrayBuffer());
      const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
      if (hash !== template.imageSha256) throw new Error("作品图片校验失败，请刷新重试。");
    }
    const imageFile = new File([imageBlob], "pet.png", { type: "image/png" });
    const transfer = new DataTransfer();
    transfer.items.add(imageFile);
    petImage.files = transfer.files;
    // The shared PNG already includes cutout and style. Reuse its exact pixels.
    currentImageName = "pet.png";
    cutoutPetBlob = imageBlob;
    styledPetBlob = imageBlob;
    showStyledPet(imageBlob);
    await loadAnimalPreview(animationPreset);
    workshopTemplateId = templateId;
    sharedImageSize = Number(templateConfig.size);
    cutoutStatus.textContent = "已使用作品原图与配置，不会重复抠图或叠加滤镜。";
    setImageBusy(false);
    renderShortcuts();
    updatePreview();
    setStatus("工坊作品已完整载入，可直接生成相同的桌宠。", "success");
    if (new URLSearchParams(location.search).get("download") === "1") {
      await window.PetForgeMembership?.refresh();
      pendingWorkshopDownload = true;
      if (window.PetForgeMembership?.isActive()) { pendingWorkshopDownload = false; buildButton.click(); }
      else window.PetForgeMembership?.open();
    }
  } catch (error) {
    setImageBusy(false);
    setStatus(`工坊作品载入失败：${error.message}`, "error");
  }
}
window.addEventListener("petforge:membership-change", (event) => {
  if (pendingWorkshopDownload && event.detail.active && !imageBusy && styledPetBlob) {
    pendingWorkshopDownload = false;
    buildButton.click();
  }
});
loadWorkshopTemplate();

if (document.querySelector('#preview-actor')) {
  import('./interactive-preview.js?v=interactive-20261109-r2').then(({createInteractivePreview}) => {
    interactivePreview = createInteractivePreview({getConfig, hasImage: () => Boolean(styledPetBlob), renderAnimalFrame});
    updatePreview();
  }).catch(() => {
    document.querySelector('#preview-feedback').textContent = '互动预览未能加载，请刷新后重试。';
  });
}
