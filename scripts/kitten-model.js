import * as THREE from "three";

// An original voxel kitten: matte blocks, small eyes and a soft peach-and-cream coat.
export function createKitten() {
  const root = new THREE.Group();
  root.name = "Little peach voxel cat";
  const colors = { peach: "#dfb68e", light: "#efd1ad", cream: "#fff2dd", stripe: "#bd8e68", pink: "#dfa6a0", eye: "#514941", shine: "#fffaf0" };
  const materials = Object.fromEntries(Object.entries(colors).map(([name, color]) => [name, new THREE.MeshStandardMaterial({ color, roughness: .93 })]));
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function block(parent, xyz, size, color = "peach") {
    const mesh = new THREE.Mesh(cube, materials[color]);
    mesh.position.set(...xyz);
    mesh.scale.set(...size);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function joint(parent, xyz) {
    const group = new THREE.Group();
    group.position.set(...xyz);
    parent.add(group);
    return group;
  }

  const body = joint(root, [0, .62, -.12]);
  block(body, [0, 0, 0], [.53, .47, .87]);
  block(body, [0, -.15, .025], [.44, .20, .76], "cream");
  block(body, [0, .241, -.10], [.34, .015, .56], "light");
  for (const side of [-1, 1]) {
    for (const z of [-.34, -.09, .16]) {
      block(body, [side * .271, .075, z], [.015, .21, .075], "stripe");
      block(body, [side * .20, .241, z], [.14, .015, .075], "stripe");
    }
  }

  const legs = [];
  for (const z of [.23, -.43]) {
    for (const side of [-1, 1]) {
      const leg = joint(root, [side * .18, .48, z]);
      block(leg, [0, -.14, 0], [.16, .32, .18]);
      block(leg, [0, -.35, .035], [.18, .22, .23], "cream");
      block(leg, [side * .085, -.12, .01], [.012, .065, .14], "stripe");
      legs.push(leg);
    }
  }

  const head = joint(root, [0, 1.04, .36]);
  block(head, [0, 0, 0], [.69, .55, .53], "light");
  block(head, [0, -.155, .027], [.64, .22, .51], "cream");
  block(head, [-.345, -.085, .18], [.045, .18, .18], "cream");
  block(head, [.345, -.085, .18], [.045, .18, .18], "cream");
  // A few quiet, deliberately placed pixels keep the face friendly at small sizes.
  for (const side of [-1, 1]) {
    block(head, [side * .16, .19, .27], [.055, .16, .012], "peach");
    block(head, [side * .352, .06, .10], [.012, .055, .21], "peach");
    block(head, [side * .352, -.035, .03], [.012, .045, .18], "peach");
  }
  block(head, [0, .255, .23], [.07, .045, .08], "peach");
  const ears = [-1, 1].map(side => {
    const ear = joint(head, [side * .235, .30, -.055]);
    block(ear, [0, .055, 0], [.20, .245, .16]);
    block(ear, [0, .055, .084], [.105, .13, .012], "pink");
    block(ear, [0, .18, -.012], [.13, .04, .13], "light");
    return ear;
  });
  const eyes = [-1, 1].map(side => {
    const eye = joint(head, [side * .18, .015, .274]);
    block(eye, [0, 0, 0], [.073, .088, .014], "eye");
    block(eye, [-.016, .02, .01], [.023, .024, .008], "shine");
    return eye;
  });
  block(head, [0, -.10, .291], [.075, .045, .025], "pink");
  block(head, [0, -.145, .284], [.018, .035, .012], "stripe");
  for (const side of [-1, 1]) {
    block(head, [side * .028, -.163, .284], [.044, .014, .012], "stripe");
    block(head, [side * .265, -.105, .278], [.085, .028, .012], "pink");
    block(head, [side * .345, -.12, .285], [.15, .012, .012], "cream");
  }

  const tail = joint(root, [0, .72, -.53]);
  tail.rotation.x = -.25;
  block(tail, [0, .04, -.15], [.115, .115, .33]);
  const tailTip = joint(tail, [0, .04, -.29]);
  tailTip.rotation.x = -.35;
  block(tailTip, [0, .18, -.055], [.105, .39, .105], "light");
  block(tailTip, [0, .14, -.055], [.112, .065, .112], "stripe");
  block(tailTip, [0, .29, -.055], [.112, .055, .112], "stripe");
  block(tailTip, [0, .40, -.02], [.11, .12, .17], "cream");

  let stride = 0;
  return {
    root,
    height: 1.55,
    footprint: .88,
    pose(pose, time, delta) {
      stride += delta * Math.min(pose.speed * 9, 10);
      const walk = Math.min(1, pose.speed / .9);
      body.position.y = .62 - pose.crouch * .09 - pose.landing * .045;
      body.rotation.x = pose.reach * -.07;
      head.position.y = 1.04 - pose.crouch * .09 - pose.landing * .045;
      head.rotation.set(-pose.headPitch * .35, pose.gaze * .45, Math.sin(time * .6) * .018);
      legs.forEach((leg, i) => {
        const diagonal = i === 0 || i === 3 ? 0 : Math.PI;
        leg.rotation.x = Math.sin(stride + diagonal) * .38 * walk + (i < 2 ? -pose.reach * .65 : pose.reach * .32);
        leg.position.y = .48 - pose.crouch * .08 - pose.landing * .025;
      });
      const blinkTime = time % 5.8;
      const blink = blinkTime > 5.30 && blinkTime < 5.50 ? Math.sin((blinkTime - 5.30) / .20 * Math.PI) : 0;
      eyes.forEach(eye => { eye.scale.y = Math.max(.12, 1 - blink); });
      ears.forEach((ear, i) => { ear.rotation.z = (i ? -1 : 1) * (Math.sin(time * 1.2) * .035 + pose.crouch * .08); });
      tail.rotation.y = Math.sin(time * 1.4) * .15 + pose.gaze * .12;
      tailTip.rotation.x = -.35 + Math.sin(time * 1.7) * .06;
    }
  };
}
