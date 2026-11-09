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

    def play(self, name, now):
        state = 'idle' if name == 'wake' else name
        if state not in self.clips:
            return False
        self.state, self.started = state, now
        return True

    def frame(self, now):
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
