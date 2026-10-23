import * as THREE from "three";

// A small, fully three-dimensional tabby, with separate joints and real fur geometry.
// The coat and iris are generated locally; no image or external model download is used.
export function createKitten() {
  let seed = 2718;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const root = new THREE.Group();
  root.name = "Tabby kitten";
  const cream = new THREE.Color("#e8e1d6");
  const silver = new THREE.Color("#b3a18a");
  const brown = new THREE.Color("#75624c");
  const dark = new THREE.Color("#514637");
  const furMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .96, side: THREE.DoubleSide });
  const skinMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .91 });
  const pink = new THREE.MeshStandardMaterial({ color: "#cf9591", roughness: .65 });
  const mouthMaterial = new THREE.MeshStandardMaterial({ color: "#655450", roughness: .85 });
  const whiskerMaterial = new THREE.MeshStandardMaterial({ color: "#f6eee2", roughness: .65 });

  function coat(x, y, z, area = "body") {
    const c = silver.clone();
    if (area === "white") return cream.clone();
    if (area === "head") {
      const forehead = Math.max(0, y + .05) * Math.max(0, z + .4);
      const stripe = Math.pow(Math.max(0, Math.cos(x * 20 + Math.abs(x) * y * 10)), 5);
      c.lerp(dark, Math.min(.86, forehead * 1.8 * stripe));
      const cheekStripe = Math.pow(Math.max(0, Math.cos(y * 24 + Math.abs(x) * 3)), 9);
      c.lerp(dark, Math.max(0, Math.abs(x) - .30) * cheekStripe * 1.5);
      if (y < -.32 && z > .15) c.lerp(cream, Math.min(1, (-y - .32) * 3.5));
      if (Math.abs(x) < .12 && y < .45 && z > .7) c.lerp(cream, .7);
    } else {
      const stripe = Math.pow(Math.max(0, Math.cos(y * 19 + z * 4 + Math.sin(x * 5))), 7);
      c.lerp(brown, stripe * .65);
      if (z > .65 && y < .3) c.lerp(cream, .85);
    }
    return c;
  }

  function surface(geometry, sample) {
    const points = geometry.attributes.position;
    const colors = [];
    for (let i = 0; i < points.count; i++) {
      const c = sample(points.getX(i), points.getY(i), points.getZ(i));
      colors.push(c.r, c.g, c.b);
    }
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const mesh = new THREE.Mesh(geometry, skinMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function hairs(parent, count, sampler, length = .03) {
    const positions = [], normals = [], colors = [];
    const tangent = new THREE.Vector3(), across = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < count; i++) {
      const { point, normal, color } = sampler();
      tangent.crossVectors(normal, Math.abs(normal.y) > .95 ? new THREE.Vector3(1, 0, 0) : up).normalize();
      across.crossVectors(normal, tangent).normalize();
      const angle = random() * Math.PI * 2;
      tangent.multiplyScalar(Math.cos(angle)).addScaledVector(across, Math.sin(angle));
      const len = length * (.55 + random() * .85);
      const width = .0015 + random() * .001;
      const tip = point.clone().addScaledVector(normal, len).addScaledVector(tangent, len * .35);
      const mid = point.clone().addScaledVector(normal, len * .58);
      const vertices = [point.clone().addScaledVector(tangent, -width), point.clone().addScaledVector(tangent, width), mid.clone().addScaledVector(tangent, width * .45), point.clone().addScaledVector(tangent, -width), mid.clone().addScaledVector(tangent, width * .45), tip];
      const c = color.clone().multiplyScalar(.94 + random() * .15);
      for (const v of vertices) { positions.push(v.x, v.y, v.z); normals.push(normal.x, normal.y, normal.z); colors.push(c.r, c.g, c.b); }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    parent.add(new THREE.Mesh(geometry, furMaterial));
  }

  function fluffy(parent, position, size, area, count = 3000, length = .026) {
    const group = new THREE.Group();
    group.position.set(...position);
    parent.add(group);
    const [sx, sy, sz] = size;
    const geometry = new THREE.SphereGeometry(1, 56, 40);
    geometry.scale(sx, sy, sz);
    group.add(surface(geometry, (x, y, z) => coat(x / sx, y / sy, z / sz, area)));
    hairs(group, count, () => {
      const y = random() * 2 - 1, angle = random() * Math.PI * 2;
      const r = Math.sqrt(1 - y * y), x = r * Math.cos(angle), z = r * Math.sin(angle);
      return { point: new THREE.Vector3(x * sx, y * sy, z * sz), normal: new THREE.Vector3(x / sx, y / sy, z / sz).normalize(), color: coat(x, y, z, area) };
    }, length);
    return group;
  }

  function bead(parent, position, scale, material) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), material);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  }

  function line(parent, points, radius, material) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, radius, 6, false), material);
    parent.add(mesh);
    return mesh;
  }

  const torso = new THREE.Group();
  torso.position.set(0, .78, -.09);
  root.add(torso);
  fluffy(torso, [0, 0, 0], [.43, .66, .39], "body", 15000, .035);
  fluffy(torso, [0, .28, .31], [.30, .39, .18], "white", 5000, .035);
  const hindLegs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * .32, .32, -.12);
    root.add(hip);
    fluffy(hip, [0, .02, 0], [.27, .33, .29], "body", 3200);
    fluffy(hip, [side * .04, -.22, .21], [.18, .11, .24], "white", 1600, .018);
    hindLegs.push(hip);
  }
  const frontLegs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * .22, .88, .24);
    root.add(hip);
    fluffy(hip, [0, -.26, 0], [.14, .30, .15], "body", 1800, .023);
    fluffy(hip, [0, -.58, .025], [.135, .22, .14], "white", 1800, .023);
    fluffy(hip, [0, -.77, .09], [.17, .105, .22], "white", 2200, .018);
    for (const offset of [-.055, .055]) line(hip, [[offset, -.77, .285], [offset, -.72, .27], [offset, -.71, .22]], .0025, mouthMaterial);
    // Small pads become visible when the front paws reach towards the toy.
    bead(hip, [0, -.857, .1], [.075, .008, .09], pink);
    for (const offset of [-.075, 0, .075]) bead(hip, [offset, -.85, .23], [.027, .008, .035], pink);
    frontLegs.push(hip);
  }

  const head = new THREE.Group();
  head.position.set(0, 1.62, .18);
  root.add(head);
  fluffy(head, [0, 0, 0], [.57, .51, .46], "head", 28000, .026);
  fluffy(head, [-.33, -.18, .21], [.23, .21, .25], "head", 3500, .031);
  fluffy(head, [.33, -.18, .21], [.23, .21, .25], "head", 3500, .031);

  const ears = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(side * .39, .36, -.035);
    ear.rotation.z = -side * .15;
    head.add(ear);
    const shape = new THREE.Shape();
    shape.moveTo(-.20, 0);
    shape.quadraticCurveTo(-.17, .24, -.035, .49);
    shape.quadraticCurveTo(0, .53, .035, .49);
    shape.quadraticCurveTo(.17, .24, .20, 0);
    shape.quadraticCurveTo(0, -.08, -.20, 0);
    const outer = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .065, bevelEnabled: true, bevelThickness: .035, bevelSize: .035, bevelSegments: 4, steps: 1, curveSegments: 20 }), new THREE.MeshStandardMaterial({ color: "#a49588", roughness: .95 }));
    outer.castShadow = true;
    ear.add(outer);
    const innerShape = new THREE.Shape();
    innerShape.moveTo(-.125, .065);
    innerShape.quadraticCurveTo(-.10, .23, 0, .405);
    innerShape.quadraticCurveTo(.10, .23, .125, .065);
    innerShape.quadraticCurveTo(0, .015, -.125, .065);
    const inner = new THREE.Mesh(new THREE.ShapeGeometry(innerShape, 24), pink);
    inner.position.z = .103;
    ear.add(inner);
    hairs(ear, 1600, () => {
      const y = random() * .46, sign = random() > .5 ? 1 : -1;
      const x = sign * (.21 - y * .39 + (random() - .5) * .025);
      return { point: new THREE.Vector3(x, y, .06), normal: new THREE.Vector3(sign * .8, .3, .5).normalize(), color: cream.clone().lerp(silver, random() * .6) };
    }, .022);
    for (let i = 0; i < 24; i++) {
      const sideX = (random() > .5 ? 1 : -1);
      const y = .07 + random() * .27;
      line(ear, [[sideX * (.16 - y * .22), y, .109], [sideX * .06, y + .035, .123], [sideX * .025, y + .09, .126]], .0013, whiskerMaterial);
    }
    ears.push(ear);
  }

  const irisCanvas = document.createElement("canvas");
  irisCanvas.width = irisCanvas.height = 512;
  const ctx = irisCanvas.getContext("2d");
  const irisGradient = ctx.createRadialGradient(256, 256, 30, 256, 256, 250);
  irisGradient.addColorStop(0, "#b9d4c2");
  irisGradient.addColorStop(.38, "#89b9c5");
  irisGradient.addColorStop(.8, "#507d95");
  irisGradient.addColorStop(1, "#263b48");
  ctx.fillStyle = irisGradient;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 420; i++) {
    const a = random() * Math.PI * 2, start = 75 + random() * 55, end = 190 + random() * 60;
    ctx.strokeStyle = random() > .5 ? "rgba(211,236,223,.25)" : "rgba(20,53,70,.22)";
    ctx.lineWidth = .8 + random() * 2;
    ctx.beginPath(); ctx.moveTo(256 + Math.cos(a) * start, 256 + Math.sin(a) * start);
    ctx.lineTo(256 + Math.cos(a + .025) * end, 256 + Math.sin(a + .025) * end); ctx.stroke();
  }
  const irisTexture = new THREE.CanvasTexture(irisCanvas);
  irisTexture.colorSpace = THREE.SRGBColorSpace;
  const irisMaterial = new THREE.MeshStandardMaterial({ map: irisTexture, roughness: .28 });
  const eyeDark = new THREE.MeshStandardMaterial({ color: "#243238", roughness: .25 });
  const pupilMaterial = new THREE.MeshPhysicalMaterial({ color: "#080e14", roughness: .06, clearcoat: 1 });
  const highlightMaterial = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: .9 });
  const eyes = [], pupils = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(side * .235, .025, .394);
    eye.rotation.y = side * .12;
    eye.rotation.z = side * -.045;
    head.add(eye);
    bead(eye, [0, 0, 0], [.19, .19, .09], eyeDark);
    const iris = new THREE.Mesh(new THREE.CircleGeometry(.165, 80), irisMaterial);
    iris.position.z = .089;
    eye.add(iris);
    const pupil = bead(eye, [0, 0, .098], [.077, .127, .025], pupilMaterial);
    pupils.push(pupil);
    bead(eye, [-.046, .064, .128], [.028, .036, .012], highlightMaterial);
    bead(eye, [.061, -.06, .113], [.011, .014, .008], highlightMaterial);
    line(eye, [[-.183, .015, .03], [-.14, .151, .055], [0, .191, .025], [.14, .137, .05], [.182, .01, .026]], .012, mouthMaterial);
    eyes.push(eye);
    fluffy(head, [side * .14, -.205, .405], [.175, .13, .12], "white", 2200, .017);
    for (let i = 0; i < 4; i++) bead(head, [side * (.16 + (i % 2) * .045), -.18 - Math.floor(i / 2) * .035, .52], [.005, .005, .003], mouthMaterial);
    for (let i = 0; i < 5; i++) {
      const y = -.18 - i * .025, rise = (.5 - i / 4) * .15;
      line(head, [[side * .18, y, .515], [side * .42, y + rise * .4, .55], [side * .7, y + rise, .52], [side * .85, y + rise + .03, .44]], .0017, whiskerMaterial);
    }
    line(head, [[side * .21, .25, .4], [side * .36, .36, .4], [side * .48, .40, .3]], .0015, whiskerMaterial);
  }
  fluffy(head, [0, -.32, .33], [.20, .105, .14], "white", 1500, .017);
  const noseShape = new THREE.Shape();
  noseShape.moveTo(-.08, .012);
  noseShape.bezierCurveTo(-.075, .055, .075, .055, .08, .012);
  noseShape.quadraticCurveTo(.055, -.015, 0, -.047);
  noseShape.quadraticCurveTo(-.055, -.015, -.08, .012);
  const nose = new THREE.Mesh(new THREE.ExtrudeGeometry(noseShape, { depth: .018, bevelEnabled: true, bevelSize: .009, bevelThickness: .008, bevelSegments: 3, curveSegments: 20 }), pink);
  nose.position.set(0, -.16, .535);
  head.add(nose);
  line(head, [[0, -.202, .548], [0, -.248, .55], [-.055, -.271, .532], [-.11, -.255, .519]], .004, mouthMaterial);
  line(head, [[0, -.248, .55], [.055, -.271, .532], [.11, -.255, .519]], .004, mouthMaterial);

  const tail = new THREE.Group();
  tail.position.set(0, .35, -.29);
  root.add(tail);
  const tailCurve = new THREE.CatmullRomCurve3([[0, 0, 0], [.33, -.13, -.24], [.68, -.21, -.12], [.85, -.23, .20], [.72, -.24, .43]].map(p => new THREE.Vector3(...p)));
  const tailGeometry = new THREE.TubeGeometry(tailCurve, 64, .11, 16, false);
  tail.add(surface(tailGeometry, (x, y, z) => coat(x, Math.atan2(z, x) * 2, y, "body")));
  hairs(tail, 6000, () => {
    const t = random(), angle = random() * Math.PI * 2;
    const tangent = tailCurve.getTangentAt(t);
    const a = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
    const b = new THREE.Vector3().crossVectors(tangent, a).normalize();
    const normal = a.multiplyScalar(Math.cos(angle)).addScaledVector(b, Math.sin(angle));
    return { point: tailCurve.getPointAt(t).addScaledVector(normal, .11), normal, color: coat(0, t * 3, 0) };
  }, .034);
  fluffy(tail, [.72, -.24, .43], [.11, .11, .11], "body", 900, .03);

  let strideTime = 0, locomotion = 0;
  return {
    root,
    footprint: 1.05,
    height: 2.57,
    pose(pose, time, delta) {
      strideTime += delta * Math.min(pose.speed * 6, 11);
      const walk = Math.min(1, pose.speed / 1.4);
      locomotion += (Math.max(walk, pose.reach, pose.crouch) - locomotion) * (1 - Math.exp(-delta * 10));
      const blinkTime = time % 5.3;
      const blink = blinkTime > 4.65 && blinkTime < 4.92 ? Math.sin((blinkTime - 4.65) / .27 * Math.PI) : 0;
      torso.scale.set(1 + Math.sin(time * 2.2) * .007, 1 - pose.crouch * .11, 1);
      torso.rotation.x = locomotion * .95;
      torso.position.y = .78 - locomotion * .12;
      head.position.y = 1.62 - locomotion * .40 - pose.crouch * .15 - pose.landing * .08;
      head.position.z = .18 + locomotion * .46;
      head.rotation.set(-pose.headPitch * .8 + pose.crouch * .05, pose.gaze * .7, Math.sin(time * .7) * .014);
      eyes.forEach(eye => { eye.scale.y = Math.max(.055, 1 - blink); });
      pupils.forEach(pupil => { pupil.position.x = pose.gaze * .022; pupil.position.y = -pose.headPitch * .045; });
      frontLegs.forEach((leg, i) => {
        leg.rotation.x = Math.sin(strideTime + i * Math.PI) * walk * .35 - pose.reach * .95 - pose.crouch * .20;
        leg.position.y = .88 - pose.crouch * .13 - pose.landing * .05;
        leg.position.z = .24 + locomotion * .32;
        leg.rotation.z = (i === 0 ? -1 : 1) * pose.reach * .12;
      });
      hindLegs.forEach((leg, i) => { leg.rotation.x = Math.sin(strideTime + (1 - i) * Math.PI) * walk * .25 + pose.reach * .26; });
      ears.forEach((ear, i) => { ear.rotation.z = (i === 0 ? 1 : -1) * (.15 + Math.sin(time * 1.3 + i) * .025 + pose.crouch * .10); });
      tail.rotation.y = Math.sin(time * 1.55) * .11 + pose.gaze * .15;
      tail.rotation.z = Math.sin(time * 1.1) * .025;
    }
  };
}
