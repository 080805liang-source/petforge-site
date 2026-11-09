import json
import sys
import unittest
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))
from pet_animation import PetAnimation

class PetAnimationTests(unittest.TestCase):
    def test_exported_clips_switch_and_return_to_idle(self):
        for key in ('animal-900000101', 'animal-900000102'):
            meta = json.loads((root / f'assets/workshop/animals/{key}-animation.json').read_text())
            p = PetAnimation(meta)
            self.assertTrue(p.has_actions)
            self.assertEqual(p.frame(1), 0)
            for action in ('pet', 'play'):
                self.assertTrue(p.play(action, 2))
                self.assertEqual(p.frame(2), meta['clips'][action]['start'])
                self.assertEqual(p.frame(4), 0)
            p.play('sleep', 5)
            self.assertGreaterEqual(p.frame(25), 90)
            p.play('wake', 25)
            self.assertEqual(p.frame(25), 0)
            self.assertFalse(p.play('unknown', 25))

    def test_legacy_and_malformed_ranges(self):
        p = PetAnimation({'count': 12, 'fps': 12, 'clips': {'idle': {'start': 99, 'count': 2, 'fps': 12}}})
        self.assertFalse(p.has_actions)
        self.assertEqual(p.frame(0), 0)
        self.assertEqual(p.frame(1.25), 3)
