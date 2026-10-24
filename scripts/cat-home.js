import * as THREE from "three";
import { createCatMotion } from "./cat-motion.js?v=voxel-20261023-r1";
import { createKitten } from "./kitten-model.js?v=voxel-20261023-r1";
import { createTeaser } from "./teaser-cursor.js?v=teaser-20261024-r4";

const playground = document.querySelector("#cat-playground");
const container = document.querySelector("#cat-scene");
const preview = document.querySelector("#cat-preview");
const mood = document.querySelector("#cat-mood");
const loading = document.querySelector("#cat-loading");
const loadingText = document.querySelector("#cat-loading-text");
const retry = document.querySelector("#cat-retry");
const pauseButton = document.querySelector("#cat-pause");
const resetButton = document.querySelector("#cat-reset");
const pounceButton = document.querySelector("#cat-pounce");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const narrow = matchMedia("(max-width: 760px)");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
let cleanup = () => {};

function fail(error) {
  console.error("三维小猫加载失败", error);
  loading.hidden = false;
  loadingText.textContent = "三维小猫暂时没能加载，试试重新连接。";
  mood.textContent = "仍可点击「制作我的桌宠」进入创作台";
  retry.hidden = false;
  container.dataset.ready = "false";
  [pauseButton, resetButton, pounceButton].forEach((button) => { button.disabled = true; });
  container.classList.remove("is-playing");
}

async function start() {
  cleanup();
  container.replaceChildren(preview);
  container.dataset.ready = "false";
  [pauseButton, resetButton, pounceButton].forEach((button) => { button.disabled = true; });
  retry.hidden = true;
  loading.hidden = true;
  loadingText.textContent = "三维互动暂时不可用，但你仍可制作桌宠。";
  // Give the tiny poster and brand mark a real paint before starting WebGL setup.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .88;
  renderer.setClearColor(0xfbfcfb, 0);
  container.append(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5, 5, 3, -3, .1, 35);
  camera.position.set(0, 3, 10);
  camera.lookAt(0, 0, 0);
  const screenUp = new THREE.Vector3(0, 10, -3).normalize();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd7d8c5, 1.3));
  const key = new THREE.DirectionalLight(0xfff5e7, 2.5);
  key.position.set(-3, 6, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe9f2ee, .95);
  fill.position.set(4, 3, -3);
  scene.add(fill);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0x8b9489, transparent: true, opacity: .13, depthWrite: false }));
  shadow.quaternion.copy(camera.quaternion);
  shadow.renderOrder = -1;
  scene.add(shadow);

  cleanup = () => renderer.dispose();
  const kitten = createKitten();
  const model = kitten.root;
  const footprint = kitten.footprint;
  const actor = new THREE.Group();
  actor.add(model);
  scene.add(actor);

  const controller = createCatMotion();
  const timer = new THREE.Timer();
  timer.connect(document);
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const hit = new THREE.Vector3();
  const screenPlane = new THREE.Plane(camera.position.clone().normalize(), 0);
  let rect = container.getBoundingClientRect();
  let inView = true;
  let lastPhase = "";
  let paused = false;
  let elapsed = 0;
  let disposed = false;
  let dirty = true;
  let actorScale = 1;
  let firstLayout = true;
  const teaser = createTeaser(playground, container, { reducedMotion: () => reducedMotion.matches });

  function resize() {
    dirty = true;
    rect = container.getBoundingClientRect();
    const aspect = rect.width / Math.max(rect.height, 1);
    const height = 6.6;
    camera.left = -height * aspect / 2;
    camera.right = height * aspect / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(rect.width, rect.height);
    const pixels = narrow.matches ? 108 : 145;
    actorScale = Math.min(1, pixels * height / rect.height / kitten.height);
    const side = footprint * actorScale + .08;
    const bounds = [camera.left + side, camera.right - side, camera.bottom + .18, camera.top - kitten.height * actorScale - .72];
    controller.setBounds(bounds);
    const homeX = narrow.matches ? 0 : camera.right * .38;
    const homeY = narrow.matches ? -.95 : -.3;
    controller.setHome(homeX, homeY);
    controller.state.x = Math.max(bounds[0], Math.min(bounds[1], firstLayout ? homeX : controller.state.x));
    controller.state.z = Math.max(bounds[2], Math.min(bounds[3], firstLayout ? homeY : controller.state.z));
    if (firstLayout) { controller.reset(); firstLayout = false; }
  }

  function updateMood() {
    const label = paused ? "小猫休息中" : ({ idle: "小猫正在陪你", watch: "它在认真看着你", walk: "慢慢走到你身边", crouch: "准备轻轻一跳", pounce: "跳起来啦", land: "轻轻落地" }[controller.state.phase]);
    if (mood.textContent !== label) mood.textContent = label;
    container.dataset.state = paused ? "paused" : controller.state.phase;
  }

  function setPaused(value) {
    dirty = true;
    paused = value;
    controller.pause(value);
    pauseButton.textContent = value ? "继续互动" : "暂停互动";
    pauseButton.setAttribute("aria-pressed", String(value));
    document.querySelector("#cat-play-hint").textContent = value
      ? "点「继续互动」唤醒它，或直接进入桌宠创作台。"
      : (finePointer.matches ? "鼠标移到哪里，它就慢慢跟来；点击左键才会跳。" : "轻触封面空白处，让小猫跟过来、跳一下。");
    if (value) teaser.hide();
    updateMood();
  }

  function targetPointer(event) {
    if (!inView || document.querySelector("dialog[open]")) return;
    rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
    const activeArea = !event.target.closest("a, button, input, select, dialog");
    const lure = finePointer.matches && activeArea ? teaser.move(event.clientX, event.clientY) : null;
    if (!lure) teaser.hide();
    if (paused) return;
    dirty = true;
    // Pursue the actual pointer, independently of the feather's visual inertia.
    mouse.set(x / rect.width * 2 - 1, -(y / rect.height) * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
    if (!raycaster.ray.intersectPlane(screenPlane, hit)) return;
    controller.aim(hit.x, hit.dot(screenUp) - kitten.height * actorScale * .55, (.5 - y / rect.height) * .3);
  }

  function leave() { teaser.hide(); controller.stop(); }
  function onPointerMove(event) {
    rect = container.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) { leave(); return; }
    targetPointer(event);
  }
  function requestPounce(event) {
    if (event.button !== 0 || event.isPrimary === false || event.target.closest("a, button, input, select")) return;
    rect = container.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
    targetPointer(event);
    if (!paused) { controller.pounce(); updateMood(); }
  }
  function pounceDemo() {
    if (paused) setPaused(false);
    controller.pounce();
    updateMood();
  }
  function togglePause() { setPaused(!paused); }
  function reset() { if (paused) setPaused(false); controller.reset(); }
  function onMotionPreference() { dirty = true; }

  document.addEventListener("pointermove", onPointerMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", leave);
  document.addEventListener("pointerdown", requestPounce, { passive: true });
  pauseButton.addEventListener("click", togglePause);
  resetButton.addEventListener("click", reset);
  pounceButton.addEventListener("click", pounceDemo);
  reducedMotion.addEventListener("change", onMotionPreference);
  const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; dirty = true; if (!inView) leave(); }, { threshold: .05 });
  observer.observe(playground);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  resize();
  setPaused(paused);
  loading.hidden = true;
  [pauseButton, resetButton, pounceButton].forEach((button) => { button.disabled = false; });

  renderer.setAnimationLoop(() => {
    timer.update();
    if (disposed || !inView || document.hidden) return;
    if (paused && !dirty) return;
    if (reducedMotion.matches && controller.state.phase === "idle" && !dirty) return;
    dirty = false;
    const delta = Math.min(timer.getDelta(), .05);
    if (!paused) elapsed += delta;
    const pose = controller.update(delta);
    actor.position.copy(screenUp).multiplyScalar(pose.z);
    actor.position.x = pose.x;
    actor.position.y += pose.y - pose.crouch * .035 - pose.landing * .025;
    actor.rotation.set(pose.pitch, pose.yaw, 0);
    const idleTime = reducedMotion.matches ? 0 : elapsed;
    actor.scale.set(actorScale, actorScale * (1 + Math.sin(idleTime * 2.1) * .006), actorScale);
    kitten.pose(pose, idleTime, paused ? 0 : delta);
    shadow.position.copy(screenUp).multiplyScalar(pose.z);
    shadow.position.x = pose.x;
    shadow.position.addScaledVector(camera.position.clone().normalize(), -.4);
    const shadowSize = actorScale * (1 - pose.y * .22);
    shadow.scale.set(.64 * shadowSize, .17 * shadowSize, 1);
    shadow.material.opacity = .13 - pose.y * .055;
    if (lastPhase !== pose.phase) { lastPhase = pose.phase; updateMood(); }
    renderer.render(scene, camera);
    if (container.dataset.ready !== "true") {
      container.dataset.ready = "true";
      loading.hidden = true;
    }
  });

  function contextLost(event) { event.preventDefault(); setPaused(true); fail(new Error("WebGL context lost")); }
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  cleanup = () => {
    disposed = true;
    renderer.setAnimationLoop(null);
    observer.disconnect();
    resizeObserver.disconnect();
    timer.dispose();
    teaser.dispose();
    document.removeEventListener("pointermove", onPointerMove);
    document.documentElement.removeEventListener("pointerleave", leave);
    document.removeEventListener("pointerdown", requestPounce);
    pauseButton.removeEventListener("click", togglePause);
    resetButton.removeEventListener("click", reset);
    pounceButton.removeEventListener("click", pounceDemo);
    reducedMotion.removeEventListener("change", onMotionPreference);
    scene.traverse((node) => { if (node.isMesh) { node.geometry.dispose(); for (const material of (Array.isArray(node.material) ? node.material : [node.material])) { material.map?.dispose(); material.dispose(); } } });
    renderer.dispose();
  };
}

retry.addEventListener("click", () => start().catch(fail));
start().catch(fail);
window.addEventListener("pagehide", () => container.classList.remove("is-playing"));
