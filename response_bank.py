"""Offline topic matching with a shuffle bag; no network or account access."""
import json
import random
from pathlib import Path


class ResponseBank:
    def __init__(self, path: Path):
        try:
            data = json.loads(path.read_text(encoding='utf-8'))
            self.topics = data['topics']
            if not isinstance(self.topics, dict):
                raise ValueError('Invalid response bank')
        except (OSError, ValueError, KeyError):
            self.topics = {'default': {'keywords': [], 'replies': ['我在这里，安静陪着你。']}}
        self.bags = {}
        self.last = None

    def reply(self, text='', topic='default'):
        text = str(text).lower()[:1000]
        if text:
            matches = [(sum(len(word) for word in item.get('keywords', []) if word.lower() in text), key)
                       for key, item in self.topics.items()]
            score, matched = max(matches, default=(0, 'default'))
            topic = matched if score else 'default'
        if topic not in self.topics:
            topic = 'default'
        bag = self.bags.setdefault(topic, [])
        if not bag:
            bag.extend(self.topics[topic]['replies'])
            random.shuffle(bag)
            if len(bag) > 1 and bag[-1] == self.last:
                bag[0], bag[-1] = bag[-1], bag[0]
        self.last = bag.pop()
        return self.last
