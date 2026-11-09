// Named clips keep the browser preview and exported pet in the same state.
export function createPetAnimation(meta) {
  const clips = {};
  for (const [name, clip] of Object.entries(meta.clips || {})) {
    if (Number.isInteger(clip.start) && Number.isInteger(clip.count) && clip.start >= 0 && clip.count > 0 && clip.start + clip.count <= meta.count && Number.isFinite(clip.fps) && clip.fps > 0 && clip.fps <= 60) clips[name] = clip;
  }
  let state = 'idle', started = null;
  return {
    hasActions: Boolean(clips.idle && clips.pet && clips.play && clips.sleep),
    play(name, now) {
      const next = name === 'wake' ? 'idle' : name;
      if (!clips[next]) return false;
      state = next; started = now;
      return true;
    },
    frame(now) {
      started ??= now;
      let clip = clips[state];
      if (!clip) return Math.floor(Math.max(0, now - started) * Math.min(60, meta.fps || 10) / 1000) % meta.count;
      let elapsed = Math.floor(Math.max(0, now - started) * clip.fps / 1000);
      if (elapsed >= clip.count && !clip.loop) {
        state = 'idle'; started = now; clip = clips.idle; elapsed = 0;
      }
      return clip.start + elapsed % clip.count;
    }
  };
}
