import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createCatMotion } from "./cat-motion.js?v=cat-20261023-r3";

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
  mood.textContent = "仍可向下进入创作台";
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
  renderer.toneMappingExposure = 1.15;
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
  scene.environmentIntensity = .55;
  environment.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd7d8c5, 2.2));
  const key = new THREE.DirectionalLight(0xfff5e7, 3.1);
  key.position.set(-3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 5, bottom: -5, near: .1, far: 18 });
  key.shadow.bias = -.0004;
  key.shadow.normalBias = .02;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe9f2ee, 1.4);
  fill.position.set(4, 3, -3);
  scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: .09 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.02;
  floor.receiveShadow = true;
  scene.add(floor);

  cleanup = () => { environmentMap.dispose(); renderer.dispose(); };
  const gltf = await new GLTFLoader().loadAsync(new URL("../assets/models/playful-cat.glb", import.meta.url).href);
  const model = gltf.scene;
  const mixer = new THREE.AnimationMixer(model);
  if (gltf.animations[0]) mixer.clipAction(gltf.animations[0]).play();
  mixer.update(0);
  // Juvenile proportions keep the companion compact rather than stretching a photo.
  model.traverse((node) => {
    if (!node.isBone) return;
    if (/Neck_Top/.test(node.name)) node.scale.setScalar(1.25);
    if (/FrontLeg_Knee|HindLeg_Knee2/.test(node.name)) node.scale.y *= .78;
    if (/Spine_0[234]|Spine_Top/.test(node.name)) node.position.y *= .82;
    if (/Tail_01_0[345]/.test(node.name)) node.position.y *= .75;
  });
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model, true);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const scale = 1.65 / size.y;
  const footprint = Math.max(size.x, size.z) * scale / 2;
  model.scale.multiplyScalar(scale);
  model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  const actor = new THREE.Group();
  actor.add(model);
  scene.add(actor);

  const bones = [];
  model.traverse((node) => {
    if (node.isBone) bones.push({ bone: node, rest: node.quaternion.clone() });
    if (!node.isMesh) return;
    node.castShadow = true;
    node.frustumCulled = false;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      material.roughness = Math.max(material.roughness || 0, .84);
      material.metalness = 0;
      if (material.map) material.map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    }
  });
  const find = (pattern) => bones.find(({ bone }) => pattern.test(bone.name))?.bone;
  const neck = find(/Neck_01/);
  const head = find(/Neck_Top/);
  const spine = find(/Spine_02/);
  const frontLegs = [find(/l_FrontLeg_Hip/), find(/r_FrontLeg_Hip/)];
  const frontKnees = [find(/l_FrontLeg_Knee/), find(/r_FrontLeg_Knee/)];
  const hindLegs = [find(/l_HindLeg_Hip/), find(/r_HindLeg_Hip/)];
  const tails = bones.filter(({ bone }) => /Tail_01/.test(bone.name)).map(({ bone }) => bone);

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
  let walkingClock = 0;
  let paused = reducedMotion.matches;
  let elapsed = 0;
  let disposed = false;
  let dirty = true;
  let actorScale = 1;

  function resize() {
    dirty = true;
    rect = container.getBoundingClientRect();
    const aspect = rect.width / Math.max(rect.height, 1);
    const height = narrow.matches ? 6.5 : 5.2;
    camera.left = -height * aspect / 2;
    camera.right = height * aspect / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.position.set(0, narrow.matches ? 4 : 3.6, 9);
    camera.lookAt(0, narrow.matches ? 1.9 : .8, 0);
    camera.updateProjectionMatrix();
    renderer.setSize(rect.width, rect.height);
    actorScale = narrow.matches ? Math.min(.95, camera.right * .9 / footprint) : 1;
    const rightEdge = Math.max(.05, camera.right - footprint * actorScale - .1);
    controller.setBounds(narrow.matches ? [-rightEdge, rightEdge, -.25, .5] : [-.1, rightEdge, -.8, .85]);
    controller.setHome(narrow.matches ? 0 : 1.4, 0);
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
    if (value) container.classList.remove("is-playing");
    updateMood();
  }

  function targetPointer(event) {
    if (paused || !inView || document.querySelector("dialog[open]")) return;
    rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
    mouse.set(x / rect.width * 2 - 1, -(y / rect.height) * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(floorPlane, hit);
    const time = performance.now();
    const speed = Math.hypot(x - lastPointer.x, y - lastPointer.y) / Math.max(16, time - lastPointer.time);
    const activeArea = event.target.closest(".cat-scene");
    controller.aim(hit.x, hit.z, Boolean(activeArea && lastPointer.time && speed > 1.15), (.5 - y / rect.height) * .65);
    lastPointer = { x, y, time };
    if (finePointer.matches && activeArea) {
      container.classList.add("is-playing");
    } else container.classList.remove("is-playing");
  }

  function leave() { lastPointer.time = 0; container.classList.remove("is-playing"); }
  function requestPounce(event) {
    if (event?.target?.closest("a, button, input, select")) return;
    targetPointer(event);
    if (!paused) controller.pounce();
  }
  function pounceDemo() {
    if (paused) setPaused(false);
    const direction = controller.state.x > (narrow.matches ? 0 : 1.5) ? -1 : 1;
    controller.aim(controller.state.x + direction, controller.state.z + .5);
    controller.pounce();
  }
  function togglePause() { setPaused(!paused); }
  function reset() { if (paused) setPaused(false); controller.reset(); }
  function onMotionPreference() { setPaused(reducedMotion.matches); }

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

  function bend(bone, axis, angle) { if (bone) bone.rotateOnAxis(axis, angle); }
  const xAxis = new THREE.Vector3(1, 0, 0);
  const yAxis = new THREE.Vector3(0, 1, 0);
  const zAxis = new THREE.Vector3(0, 0, 1);

  resize();
  setPaused(paused);
  loading.hidden = true;
  container.dataset.ready = "true";
  [pauseButton, resetButton, pounceButton].forEach((button) => { button.disabled = false; });

  renderer.setAnimationLoop(() => {
    timer.update();
    if (disposed || !inView || document.hidden) return;
    if (paused && !dirty) return;
    dirty = false;
    const delta = Math.min(timer.getDelta(), .05);
    if (!paused) elapsed += delta;
    const pose = controller.update(delta);
    // Start each frame from the animation pose: never accumulate bone rotations.
    for (const { bone, rest } of bones) bone.quaternion.copy(rest);
    walkingClock += paused ? 0 : delta * Math.min(pose.speed * 5, 8);
    actor.position.set(pose.x, pose.y - pose.crouch * .09 - pose.landing * .06, pose.z);
    actor.rotation.set(pose.pitch, pose.yaw, 0);
    actor.scale.set(actorScale, actorScale * (1 + Math.sin(elapsed * 2.1) * .006), actorScale);
    bend(neck, yAxis, pose.gaze * .34);
    bend(head, zAxis, -pose.gaze * .45);
    bend(neck, xAxis, Math.sin(elapsed * .8) * .025 - pose.crouch * .06 - pose.headPitch);
    bend(spine, xAxis, pose.crouch * .1);
    frontLegs.forEach((leg, index) => {
      const stride = Math.sin(walkingClock + index * Math.PI) * Math.min(.3, pose.speed * .3);
      bend(leg, xAxis, stride + pose.reach * .65 + pose.crouch * .2);
      bend(frontKnees[index], xAxis, Math.max(0, -stride) * .5 - pose.reach * .2 + pose.crouch * .6);
    });
    hindLegs.forEach((leg, index) => bend(leg, xAxis, Math.sin(walkingClock + (1 - index) * Math.PI) * Math.min(.3, pose.speed * .24) + pose.crouch * .3));
    tails.forEach((tail, index) => bend(tail, zAxis, Math.sin(elapsed * 1.8 - index * .65) * .1 + pose.crouch * .06));
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
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
    playground.removeEventListener("pointermove", targetPointer);
    playground.removeEventListener("pointerleave", leave);
    container.removeEventListener("pointerdown", requestPounce);
    pauseButton.removeEventListener("click", togglePause);
    resetButton.removeEventListener("click", reset);
    pounceButton.removeEventListener("click", pounceDemo);
    reducedMotion.removeEventListener("change", onMotionPreference);
    scene.traverse((node) => { if (node.isMesh) { node.geometry.dispose(); for (const material of (Array.isArray(node.material) ? node.material : [node.material])) material.dispose(); } });
    environmentMap.dispose();
    renderer.dispose();
  };
}

retry.addEventListener("click", () => start().catch(fail));
start().catch(fail);
window.addEventListener("pagehide", () => container.classList.remove("is-playing"));
