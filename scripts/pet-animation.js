// Named clips keep the browser preview and exported pet in the same state.
export function createPetAnimation(meta) {
  const clips = {};
  for (const [name, clip] of Object.entries(meta.clips || {})) {
    if (Number.isInteger(clip.start) && Number.isInteger(clip.count) && clip.start >= 0 && clip.count > 0 && clip.start + clip.count <= meta.count && Number.isFinite(clip.fps) && clip.fps > 0 && clip.fps <= 60) clips[name] = clip;
  }
  let state = 'idle', started = null;
  const clickClip = meta.interaction?.type === 'click-clip' && ['idle','pet'].every(key=>clips[key]);
  const poses = Array.isArray(meta.interaction?.poses) ? meta.interaction.poses : ['idle','pose2','pose3'];
  const cycleSleep = meta.interaction?.type === 'click-cycle-sleep' && poses.length >= 2 && poses.length <= 239 && poses[0] === 'idle' && !poses.includes('sleep') && new Set(poses).size === poses.length && [...poses,'sleep'].every(key=>typeof key==='string' && clips[key]);
  const anger = meta.interaction?.anger;
  const burst = cycleSleep && clips.angry && Number.isInteger(anger?.afterCycles) && anger.afterCycles > 0 && Number.isInteger(anger?.clicks) && anger.clicks > 1 && Number.isFinite(anger?.windowSeconds) && anger.windowSeconds > 0 && Number.isFinite(anger?.durationSeconds) && anger.durationSeconds > 0 ? anger : null;
  const seconds = meta.interaction?.idleSeconds;
  const idleTimeout = (Number.isFinite(seconds) && seconds >= 1 && seconds <= 86400 ? seconds : 60) * 1000;
  const fourStateDog = meta.interaction?.type === 'four-state-dog' && ['idle','pet','angry','calm'].every(key=>clips[key]);
  const interactive = cycleSleep || clickClip || fourStateDog;
  let clicks=[], until=0, resumeAt=0, poseClicks=0, rapidClicks=[];
  return {
    interactive,
    fourStateDog,
    clickClip,
    cycleSleep,
    get state() { return state; },
    click(now) {
      if (!interactive) return false;
      this.frame(now);
      if (cycleSleep) {
        if (state === 'angry') { if(!burst)return false;until=now+burst.durationSeconds*1000;started=now;resumeAt=until+700;return true; }
        if (state === 'sleep') { state='idle';poseClicks=0;rapidClicks=[]; }
        else {
          state=poses[(poses.indexOf(state)+1)%poses.length];poseClicks++;
          if (burst && poseClicks > poses.length*burst.afterCycles) {
            rapidClicks=rapidClicks.filter(at=>now-at<=burst.windowSeconds*1000);rapidClicks.push(now);
            if (rapidClicks.length>=burst.clicks) { state='angry';until=now+burst.durationSeconds*1000;poseClicks=0;rapidClicks=[]; }
          }
        }
        started=now;resumeAt=state==='angry'?until+700:now+700;return true;
      }
      if (clickClip) {
        if (state!=='idle') return false;
        state='pet';started=now;until=now+clips.pet.count/clips.pet.fps*1000;resumeAt=until+700;return true;
      }
      if (state==='calm') return true;
      let duration;
      if (state==='angry') { state='calm';duration=2200;clicks=[]; }
      else {
        clicks=clicks.filter(at=>now-at<=2000);clicks.push(now);
        state=clicks.length>=4?'angry':'pet';duration=state==='angry'?8000:1600;
      }
      started=now;until=now+duration;resumeAt=until+700;return true;
    },
    paused(now) { if(!interactive)return false;this.frame(now);return (cycleSleep && (state==='sleep'||state==='angry')) || now<resumeAt; },
    hasActions: Boolean(clips.idle && clips.pet && clips.play && clips.sleep),
    play(name, now) {
      if (interactive && ['pet','play'].includes(name)) return this.click(now);
      const next = name === 'wake' ? 'idle' : name;
      if (!clips[next]) return false;
      state = next; started = now;
      return true;
    },
    frame(now) {
      if (cycleSleep) {
        started ??= now;
        if (state==='angry' && now>=until) { state='idle';started=until; }
        if (state!=='angry' && now-started >= idleTimeout) { state='sleep';poseClicks=0;rapidClicks=[]; }
        return clips[state].start;
      }
      if (interactive && state!=='idle' && now>=until) { state='idle';started=now;if(now>=resumeAt)clicks=[]; }
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
