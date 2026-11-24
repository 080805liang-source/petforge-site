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
        self.click_clip = meta.get('interaction', {}).get('type') == 'click-clip' and all(key in self.clips for key in ('idle', 'pet'))
        self.poses = meta.get('interaction', {}).get('poses', ['idle', 'pose2', 'pose3'])
        self.cycle_sleep = (meta.get('interaction', {}).get('type') == 'click-cycle-sleep'
                            and isinstance(self.poses, list) and 2 <= len(self.poses) <= 239
                            and self.poses[0] == 'idle' and 'sleep' not in self.poses
                            and all(isinstance(key, str) and key in self.clips for key in self.poses)
                            and len(set(self.poses)) == len(self.poses) and 'sleep' in self.clips)
        seconds = meta.get('interaction', {}).get('idleSeconds', 60)
        self.idle_timeout = seconds if isinstance(seconds, (int, float)) and 1 <= seconds <= 86400 else 60
        self.interactive = self.cycle_sleep or self.click_clip or (meta.get('interaction', {}).get('type') == 'four-state-dog' and all(key in self.clips for key in ('idle', 'pet', 'angry', 'calm')))
        self.clicks = []
        self.until = 0
        self.resume_at = 0

    def click(self, now):
        if not self.interactive:
            return False
        self.frame(now)
        if self.cycle_sleep:
            self.state = 'idle' if self.state == 'sleep' else self.poses[(self.poses.index(self.state) + 1) % len(self.poses)]
            self.started, self.resume_at = now, now + .7
            return True
        if self.click_clip:
            if self.state != 'idle':
                return False
            self.state, self.started = 'pet', now
            self.until = now + self.clips['pet']['count'] / self.clips['pet']['fps']
            self.resume_at = self.until + .7
            return True
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
        return (self.cycle_sleep and self.state == 'sleep') or now < self.resume_at

    def play(self, name, now):
        if self.interactive and name in ('pet', 'play'):
            return self.click(now)
        state = 'idle' if name == 'wake' else name
        if state not in self.clips:
            return False
        self.state, self.started = state, now
        return True

    def frame(self, now):
        if self.cycle_sleep:
            if self.started is None:
                self.started = now
            if now - self.started >= self.idle_timeout:
                self.state = 'sleep'
            return self.clips[self.state]['start']
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
