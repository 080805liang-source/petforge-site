class PetAnimation:
    """Choose bounded atlas frames for independent interactive clips."""

    def __init__(self, meta):
        self.count = int(meta['count'])
        self.fps = max(1, min(60, float(meta.get('fps', 10))))
        self.clips = {}
        for name, clip in meta.get('clips', {}).items():
            if not isinstance(clip, dict):
                continue
            start, count, fps = clip.get('start'), clip.get('count'), clip.get('fps')
            if isinstance(start, int) and isinstance(count, int) and isinstance(fps, (int, float)) and start >= 0 and count > 0 and start + count <= self.count and 0 < fps <= 60:
                self.clips[name] = clip
        self.has_actions = all(key in self.clips for key in ('idle', 'pet', 'play', 'sleep'))
        self.state = 'idle'
        self.started = None
        self.interactive = meta.get('interaction', {}).get('type') == 'four-state-dog' and all(key in self.clips for key in ('idle', 'pet', 'angry', 'calm'))
        self.clicks = []
        self.until = 0
        self.resume_at = 0

    def click(self, now):
        if not self.interactive:
            return False
        self.frame(now)
        if self.state == 'calm':
            return True
        if self.state == 'angry':
            self.state, duration = 'calm', 2.2
            self.clicks = []
        else:
            self.clicks = [at for at in self.clicks if now - at <= 2]
            self.clicks.append(now)
            self.state, duration = ('angry', 8) if len(self.clicks) >= 4 else ('pet', 1.6)
        self.started = now
        self.until = now + duration
        self.resume_at = self.until + .7
        return True

    def paused(self, now):
        if not self.interactive:
            return False
        self.frame(now)
        return now < self.resume_at

    def play(self, name, now):
        if self.interactive and name in ('pet', 'play'):
            return self.click(now)
        state = 'idle' if name == 'wake' else name
        if state not in self.clips:
            return False
        self.state, self.started = state, now
        return True

    def frame(self, now):
        if self.interactive and self.state != 'idle' and now >= self.until:
            self.state, self.started = 'idle', now
            if now >= self.resume_at:
                self.clicks = []
        if self.started is None:
            self.started = now
        clip = self.clips.get(self.state)
        if not clip:
            return int(max(0, now - self.started) * self.fps) % self.count
        elapsed = int(max(0, now - self.started) * clip['fps'])
        if elapsed >= clip['count'] and not clip.get('loop'):
            self.state, self.started, elapsed = 'idle', now, 0
            clip = self.clips.get('idle', clip)
        return clip['start'] + elapsed % clip['count']
