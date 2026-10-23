import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createCatMotion } from "./cat-motion.js?v=kitten-20261023-r7";
import { createKitten } from "./kitten-model.js?v=kitten-20261023-r7";
import { createTeaser } from "./teaser-cursor.js?v=kitten-20261023-r8";

const playground = document.querySelector("#cat-playground");
const container = document.querySelector("#cat-scene");
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
  container.replaceChildren();
  loading.hidden = false;
  container.dataset.ready = "false";
  [pauseButton, resetButton, pounceButton].forEach((button) => { button.disabled = true; });
  retry.hidden = true;
  loadingText.textContent = "小猫正在来的路上…";
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .88;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0xfbfcfb, 0);
  container.append(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5, 5, 3, -3, .1, 35);
  camera.position.set(0, 3.6, 9);
  camera.lookAt(0, .8, 0);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = new RoomEnvironment();
  const environmentMap = pmrem.fromScene(environment, .04);
  scene.environment = environmentMap.texture;
  scene.environmentIntensity = .45;
  environment.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd7d8c5, 1.3));
  const key = new THREE.DirectionalLight(0xfff5e7, 2.5);
  key.position.set(-3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 5, bottom: -5, near: .1, far: 18 });
  key.shadow.bias = -.0004;
  key.shadow.normalBias = .02;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe9f2ee, .95);
  fill.position.set(4, 3, -3);
  scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: .13 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.02;
  floor.receiveShadow = true;
  scene.add(floor);

  cleanup = () => { environmentMap.dispose(); renderer.dispose(); };
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
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let rect = container.getBoundingClientRect();
  let inView = true;
  let lastPointer = { x: 0, y: 0, time: 0 };
  let lastPhase = "";
  let paused = false;
  let elapsed = 0;
  let disposed = false;
  let dirty = true;
  let actorScale = 1;
  const teaser = createTeaser(playground, container, { reducedMotion: () => reducedMotion.matches });

  function resize() {
    dirty = true;
    rect = container.getBoundingClientRect();
    const aspect = rect.width / Math.max(rect.height, 1);
    const height = narrow.matches ? 6.1 : 5.6;
    camera.left = -height * aspect / 2;
    camera.right = height * aspect / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.position.set(0, narrow.matches ? 4 : 3.6, 9);
    camera.lookAt(0, narrow.matches ? 2.1 : 1.15, 0);
    camera.updateProjectionMatrix();
    renderer.setSize(rect.width, rect.height);
    actorScale = narrow.matches ? Math.min(.95, camera.right * .9 / footprint) : 1;
    const rightEdge = Math.max(.05, camera.right - footprint * actorScale - .1);
    controller.setBounds(narrow.matches ? [-rightEdge, rightEdge, -.2, .35] : [.35, rightEdge, -.4, .6]);
    controller.setHome(narrow.matches ? 0 : 1.55, 0);
    if (narrow.matches && Math.abs(controller.state.x) > rightEdge) { controller.state.x = 0; controller.state.z = 0; }
  }

  function updateMood() {
    const label = paused ? "小猫休息中" : ({ idle: "小猫正在陪你", watch: "它在认真盯着逗猫棒", walk: "跟上你的小脚步", crouch: "压低身体，准备扑啦", pounce: "扑到了吗？再逗逗它", land: "稳稳落地，再来一次" }[controller.state.phase]);
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
      : (finePointer.matches ? "移动逗猫棒引它追逐，点击空白处让它扑过来。" : "轻触小猫旁边的空白处，引它追过来。");
    if (value) teaser.hide();
    updateMood();
  }

  function targetPointer(event) {
    if (!inView || document.querySelector("dialog[open]")) return;
    rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
    const activeArea = event.target.closest(".cat-scene");
    const lure = finePointer.matches && activeArea ? teaser.move(event.clientX, event.clientY) : null;
    if (!lure) teaser.hide();
    if (paused) return;
    dirty = true;
    const aimX = lure ? lure.toyX - rect.left : x;
    const aimY = lure ? lure.toyY - rect.top : y;
    mouse.set(aimX / rect.width * 2 - 1, -(aimY / rect.height) * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
    if (!raycaster.ray.intersectPlane(floorPlane, hit)) return;
    const time = performance.now();
    const speed = Math.hypot(x - lastPointer.x, y - lastPointer.y) / Math.max(16, time - lastPointer.time);
    controller.aim(hit.x, hit.z, Boolean(activeArea && lastPointer.time && speed > .65), (.5 - y / rect.height) * .8);
    lastPointer = { x, y, time };
  }

  function leave() { lastPointer.time = 0; teaser.hide(); }
  function requestPounce(event) {
    if (event?.target?.closest("a, button, input, select")) return;
    targetPointer(event);
    if (!paused) { controller.pounce(); updateMood(); }
  }
  function pounceDemo() {
    if (paused) setPaused(false);
    const direction = controller.state.x > (narrow.matches ? 0 : 1.5) ? -1 : 1;
    controller.aim(controller.state.x + direction, controller.state.z + .5);
    controller.pounce();
    updateMood();
  }
  function togglePause() { setPaused(!paused); }
  function reset() { if (paused) setPaused(false); controller.reset(); }
  function onMotionPreference() { dirty = true; }

  playground.addEventListener("pointermove", targetPointer, { passive: true });
  playground.addEventListener("pointerleave", leave);
  container.addEventListener("pointerdown", requestPounce, { passive: true });
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
  container.dataset.ready = "true";
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
    actor.position.set(pose.x, pose.y - pose.crouch * .09 - pose.landing * .06, pose.z);
    actor.rotation.set(pose.pitch, pose.yaw, 0);
    const idleTime = reducedMotion.matches ? 0 : elapsed;
    actor.scale.set(actorScale, actorScale * (1 + Math.sin(idleTime * 2.1) * .006), actorScale);
    kitten.pose(pose, idleTime, paused ? 0 : delta);
    if (lastPhase !== pose.phase) { lastPhase = pose.phase; updateMood(); }
    renderer.render(scene, camera);
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
    playground.removeEventListener("pointermove", targetPointer);
    playground.removeEventListener("pointerleave", leave);
    container.removeEventListener("pointerdown", requestPounce);
    pauseButton.removeEventListener("click", togglePause);
    resetButton.removeEventListener("click", reset);
    pounceButton.removeEventListener("click", pounceDemo);
    reducedMotion.removeEventListener("change", onMotionPreference);
    scene.traverse((node) => { if (node.isMesh) { node.geometry.dispose(); for (const material of (Array.isArray(node.material) ? node.material : [node.material])) { material.map?.dispose(); material.dispose(); } } });
    environmentMap.dispose();
    renderer.dispose();
  };
}

retry.addEventListener("click", () => start().catch(fail));
start().catch(fail);
window.addEventListener("pagehide", () => container.classList.remove("is-playing"));
