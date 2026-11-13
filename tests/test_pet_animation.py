import json
import sys
import unittest
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))
from pet_animation import PetAnimation

class PetAnimationTests(unittest.TestCase):
    def test_video_pet_neutral_idle_one_shot_and_repeat_clicks(self):
        meta = json.loads((root / 'assets/workshop/animals/animal-900000104-animation.json').read_text())
        p = PetAnimation(meta)
        duration = meta['clips']['pet']['count'] / meta['clips']['pet']['fps']
        self.assertTrue(p.click_clip)
        self.assertEqual(p.frame(60), 228)
        self.assertTrue(p.click(61))
        self.assertEqual(p.frame(61.5), 8)
        self.assertFalse(p.click(62))
        self.assertEqual(p.frame(62), 16)
        self.assertTrue(p.paused(61 + duration - .01))
        self.assertEqual(p.frame(61 + duration + .01), 228)
        self.assertTrue(p.paused(61 + duration + .01))
        self.assertFalse(p.paused(61 + duration + .71))
        self.assertTrue(p.click(80))
        self.assertEqual(p.frame(80), 1)

    def test_dog_four_states_burst_timeout_and_movement_resume(self):
        meta = json.loads((root / 'assets/workshop/animals/animal-900000103-animation.json').read_text())
        p = PetAnimation(meta)
        self.assertTrue(p.interactive)
        self.assertEqual(p.frame(0), 0)
        p.click(1)
        self.assertEqual(p.frame(1.1), 1)
        self.assertTrue(p.paused(2.7))
        self.assertEqual(p.frame(2.7), 0)
        self.assertFalse(p.paused(3.4))
        for at in (5, 5.2, 5.4, 5.6):
            p.click(at)
        self.assertEqual(p.frame(5.7), 2)
        self.assertTrue(p.paused(5.7))
        p.click(5.8)
        self.assertEqual(p.frame(5.9), 3)
        p.click(6)
        self.assertEqual(p.state, 'calm')
        self.assertEqual(p.frame(8.1), 0)
        self.assertFalse(p.paused(8.8))
        for at in (10, 10.2, 10.4, 10.6):
            p.click(at)
        self.assertEqual(p.state, 'angry')
        self.assertEqual(p.frame(19), 0)
        self.assertFalse(p.paused(19.5))
        p.click(30); p.click(33); p.click(36); p.click(39)
        self.assertEqual(p.state, 'pet', 'Separated clicks must not trigger the burst')

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
