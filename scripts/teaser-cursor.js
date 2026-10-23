// The handle follows pointer events directly. Only the dangling toy has inertia.
export function createLureMotion({ reduced = false } = {}) {
  const state = { x: 0, y: 0, toyX: 62, toyY: 25, vx: 0, vy: 0 };
  const spring = reduced ? 320 : 160, damping = reduced ? 34 : 22;
  let started = false;
  return {
    state,
    move(x, y) {
      state.x = x; state.y = y;
      if (!started) { state.toyX = x + 62; state.toyY = y + 25; started = true; }
    },
    update(delta) {
      const dt = Math.min(.05, Math.max(0, delta));
      const steps = Math.max(1, Math.ceil(dt * 120));
      for (let i = 0; i < steps; i++) {
        const h = dt / steps;
        state.vx += ((state.x + 62 - state.toyX) * spring - state.vx * damping) * h;
        state.vy += ((state.y + 25 - state.toyY) * spring - state.vy * damping) * h;
        state.toyX += state.vx * h; state.toyY += state.vy * h;
      }
      const dx = state.toyX - state.x - 26, dy = state.toyY - state.y + 38;
      const distance = Math.hypot(dx, dy);
      if (distance > 105) {
        state.toyX = state.x + 26 + dx / distance * 105;
        state.toyY = state.y - 38 + dy / distance * 105;
      }
      return state;
    }
  };
}

export function createTeaser(playground, scene, { reducedMotion }) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("teaser-cursor");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `<g class="teaser-handle"><path d="M0 0 26-38" stroke="#577b65" stroke-width="3.5" stroke-linecap="round"/><path d="m2-3 6-8" stroke="#9ab69a" stroke-width="4" stroke-linecap="round"/><circle r="3.5" fill="#577b65"/></g><path class="teaser-string" fill="none" stroke="#9dafa3" stroke-width="1.15"/><g class="teaser-feathers"><path d="M0 0C-19-10-22 9-5 27 1 16 6 7 0 0" fill="#c692a2"/><path d="M2 0C16-10 22 6 8 25 0 17-3 7 2 0" fill="#8fae9d"/><path d="M0 0C-7-6-9 13 2 31 10 18 10 6 0 0" fill="#eee3cd"/><path d="m0 0 1 24m1-23 7 19M0 0l-6 19" fill="none" stroke="#fff9ed" stroke-width=".8"/><circle cy="-1" r="3" fill="#ae9273"/></g>`;
  svg.setAttribute("hidden", "");
  document.body.append(svg);
  const handle = svg.querySelector(".teaser-handle");
  const string = svg.querySelector(".teaser-string");
  const feathers = svg.querySelector(".teaser-feathers");
  let motion = createLureMotion(), frame = 0, lastTime = 0;

  function draw() {
    const s = motion.state;
    const tipX = s.x + 26, tipY = s.y - 38;
    const rotation = Math.max(-65, Math.min(65, s.vx * -.08));
    string.setAttribute("d", `M${tipX} ${tipY}Q${(tipX + s.toyX) / 2} ${Math.max(tipY, s.toyY) + 18} ${s.toyX} ${s.toyY}`);
    feathers.setAttribute("transform", `translate(${s.toyX} ${s.toyY}) rotate(${rotation})`);
  }
  function tick(time) {
    if (svg.hasAttribute("hidden")) return;
    motion.update(lastTime ? (time - lastTime) / 1000 : 0);
    lastTime = time;
    draw();
    const s = motion.state;
    if (Math.hypot(s.vx, s.vy) < .05 && Math.hypot(s.toyX - s.x - 62, s.toyY - s.y - 25) < .05) { frame = 0; lastTime = 0; }
    else frame = requestAnimationFrame(tick);
  }
  function hide() {
    svg.setAttribute("hidden", "");
    scene.classList.remove("is-playing");
    cancelAnimationFrame(frame);
    frame = 0; lastTime = 0;
  }
  function move(x, y) {
    if (svg.hasAttribute("hidden")) motion = createLureMotion({ reduced: reducedMotion() });
    motion.move(x, y);
    handle.setAttribute("transform", `translate(${x} ${y})`);
    svg.removeAttribute("hidden");
    scene.classList.add("is-playing");
    if (!frame) frame = requestAnimationFrame(tick);
    return motion.state;
  }
  window.addEventListener("blur", hide);
  window.addEventListener("pagehide", hide);
  document.addEventListener("visibilitychange", hide);
  // A pointer over a link or a control uses its ordinary cursor.
  function onControl(event) { if (event.target.closest("a, button, input, select, dialog")) hide(); }
  playground.addEventListener("pointerover", onControl);
  return { move, hide, dispose() { hide(); svg.remove(); window.removeEventListener("blur", hide); window.removeEventListener("pagehide", hide); document.removeEventListener("visibilitychange", hide); playground.removeEventListener("pointerover", onControl); } };
}
