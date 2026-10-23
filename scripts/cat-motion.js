// Small deterministic movement controller. Coordinates are metres on the floor.
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const ease = (t) => t * t * (3 - 2 * t);
const angleDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

export function createCatMotion({ x = 1.4, z = 0, bounds = [-.25, 3.2, -1.2, 1.1] } = {}) {
  const home = { x, z };
  const state = { x, z, y: 0, yaw: -.25, speed: 0, phase: "idle", crouch: 0, reach: 0, landing: 0, gaze: 0, headPitch: 0, pitch: 0, paused: false };
  let target = { x, z };
  let start = { x, z };
  let end = { x, z };
  let phaseTime = 0;
  let sinceInput = 10;
  let cooldown = 0;
  let returning = false;
  let following = false;
  let lookHeight = 0;

  function setPhase(phase) { state.phase = phase; phaseTime = 0; }
  function point(x, z) { return { x: clamp(x, bounds[0], bounds[1]), z: clamp(z, bounds[2], bounds[3]) }; }

  return {
    state,
    setBounds(next) {
      bounds = next;
      target = point(target.x, target.z);
    },
    setHome(x, z) { home.x = x; home.z = z; },
    aim(x, z, elevation = 0) {
      if (state.paused) return;
      target = point(x, z);
      sinceInput = 0;
      returning = false;
      following = true;
      lookHeight = clamp(elevation, -.25, .25);
    },
    pounce() {
      if (state.paused || cooldown > 0 || ["crouch", "pounce", "land"].includes(state.phase)) return false;
      start = { x: state.x, z: state.z };
      const dx = target.x - state.x;
      const dz = target.z - state.z;
      const distance = Math.hypot(dx, dz);
      const ratio = Math.min(1, .8 / Math.max(distance, .001));
      end = point(state.x + dx * ratio, state.z + dz * ratio);
      if (distance < .25) end = point(state.x, state.z);
      setPhase("crouch");
      cooldown = 1.45;
      return true;
    },
    pause(paused) { state.paused = paused; },
    stop() { following = false; target = { x: state.x, z: state.z }; },
    reset() { target = point(home.x, home.z); returning = true; sinceInput = 0; if (!["pounce", "crouch", "land"].includes(state.phase)) setPhase("walk"); },
    update(delta) {
      if (state.paused) return state;
      const dt = clamp(delta, 0, .05);
      sinceInput += dt;
      phaseTime += dt;
      cooldown -= dt;
      const dx = target.x - state.x;
      const dz = target.z - state.z;
      const distance = Math.hypot(dx, dz);
      const moving = following || returning;
      // Screen-height travel keeps its face in view rather than turning its back.
      const desiredYaw = distance > .1 && moving ? clamp(Math.atan2(dx, Math.abs(dz) + .3), -1.15, 1.15) : -.25;
      state.yaw += angleDelta(state.yaw, desiredYaw) * (1 - Math.exp(-dt * (state.phase === "pounce" ? 7 : 11)));
      state.gaze = clamp(angleDelta(state.yaw, Math.atan2(dx, dz)), -.6, .6) * (moving ? 1 : 0);
      state.headPitch += ((moving ? lookHeight : 0) - state.headPitch) * (1 - Math.exp(-dt * 8));
      state.crouch = 0;
      state.reach = 0;
      state.landing = 0;
      state.pitch = 0;

      if (state.phase === "crouch") {
        state.crouch = ease(clamp(phaseTime / .18, 0, 1));
        state.speed *= Math.exp(-dt * 15);
        if (phaseTime >= .23) setPhase("pounce");
      } else if (state.phase === "pounce") {
        const t = clamp(phaseTime / .58, 0, 1);
        state.x = start.x + (end.x - start.x) * ease(t);
        state.z = start.z + (end.z - start.z) * ease(t);
        state.y = Math.sin(Math.PI * t) * .65;
        state.reach = Math.sin(Math.PI * t);
        state.pitch = Math.sin(Math.PI * (t - .18)) * .16;
        state.speed = 0;
        if (t === 1) { state.y = 0; setPhase("land"); }
      } else if (state.phase === "land") {
        const t = clamp(phaseTime / .32, 0, 1);
        state.landing = Math.sin(Math.PI * t) * Math.exp(-2 * t);
        state.speed = 0;
        if (t === 1) setPhase("watch");
      } else {
        if (moving && distance > .12) {
          const desiredSpeed = Math.min(1.05, distance * 1.8);
          state.speed += (desiredSpeed - state.speed) * (1 - Math.exp(-dt * 6));
          const step = Math.min(state.speed * dt, distance - .10);
          state.x += dx / distance * step;
          state.z += dz / distance * step;
          if (state.phase !== "crouch") setPhase("walk");
        } else {
          state.speed *= Math.exp(-dt * 9);
          if (returning && distance < .13) returning = false;
          if (state.phase !== (sinceInput < 3 ? "watch" : "idle")) setPhase(sinceInput < 3 ? "watch" : "idle");
        }
        state.y = 0;
      }
      state.x = clamp(state.x, bounds[0], bounds[1]);
      state.z = clamp(state.z, bounds[2], bounds[3]);
      return state;
    }
  };
}
