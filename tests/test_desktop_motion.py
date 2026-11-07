import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from desktop_app import DesktopPet, motion_offset


class Canvas:
    def __init__(self):
        self.items = {}
        self.draws = 0

    def coords(self, item, *values):
        if values:
            self.items[item] = values
            self.draws += 1
        return self.items.get(item, (0, 0))

    def create_oval(self, *values, **options):
        item = len(self.items) + 1
        self.items[item] = options
        return item

    def tag_lower(self, *_args):
        pass

    def delete(self, item):
        self.items.pop(item, None)


class Root:
    def __init__(self):
        self.now = 0
        self.tasks = {}
        self.sequence = 0
        self.position = (0, 0)

    def after(self, milliseconds, callback):
        self.sequence += 1
        self.tasks[self.sequence] = (self.now + milliseconds / 1000, callback)
        return self.sequence

    def after_cancel(self, timer):
        self.tasks.pop(timer, None)

    def winfo_x(self):
        return self.position[0]

    def winfo_y(self):
        return self.position[1]

    def geometry(self, value):
        self.position = tuple(map(int, value.lstrip('+').split('+')))


def pet():
    instance = DesktopPet.__new__(DesktopPet)
    instance.config = {}
    instance.root = Root()
    instance.canvas = Canvas()
    instance.photo = SimpleNamespace(height=lambda: 220)
    instance.width = 300
    instance.pet_id = 'pet'
    instance.pet_base_x, instance.pet_base_y = 150, 138
    instance.shadow_ids = []
    instance.typing_ids = []
    instance.particles = []
    instance.aura_id = None
    instance.motion_enabled = False
    instance.motion_active = False
    instance.typing_active = False
    instance.dragged = False
    instance.timer_precision = False
    instance.frame_timer = None
    instance.keyboard_timer = None
    instance.wander_timer = None
    instance.cursor_offset = (0, 0)
    instance.track_cursor = lambda _delta: None
    return instance


class DesktopMotionTests(unittest.TestCase):
    def test_shadow_is_optional_and_never_uses_solid_black(self):
        instance = pet()
        instance.set_shadow_enabled(False)
        self.assertFalse(instance.canvas.items)
        instance.set_shadow_enabled(True)
        self.assertEqual(len(instance.shadow_ids), 4)
        self.assertTrue(all(instance.canvas.items[item]['fill'] not in ('#000000', '#222222') for item in instance.shadow_ids))
        instance.set_shadow_enabled(False)
        self.assertFalse(instance.canvas.items)

    def test_static_mode_does_not_schedule_or_start_animation(self):
        instance = pet()
        instance.animate()
        instance.spawn_particles()
        instance.start_typing_effect()
        instance.frame()
        self.assertFalse(instance.motion_active)
        self.assertFalse(instance.typing_active)
        self.assertFalse(instance.particles)
        self.assertFalse(instance.root.tasks)

    def test_timed_animation_interpolates_and_returns_home(self):
        points = [(0, 0), (0, -24), (0, 0)]
        self.assertEqual(motion_offset(points, 0, .28), (0, 0))
        self.assertEqual(motion_offset(points, .07, .28), (0, -12))
        for rate in (30, 60, 120):
            positions = [motion_offset(points, index / rate, .28) for index in range(rate + 1)]
            self.assertEqual(positions[-1], (0, 0))
            self.assertTrue(all(-24 <= value[1] <= 0 for value in positions))

    def test_dynamic_scheduler_targets_60_fps_and_stops_when_disabled(self):
        instance = pet()
        with patch('desktop_app.sys.platform', 'test'), patch('desktop_app.time.perf_counter', lambda: instance.root.now):
            instance.set_motion_enabled(True)
            start = instance.canvas.draws
            while instance.root.tasks:
                timer, (at, callback) = min(instance.root.tasks.items(), key=lambda item: item[1][0])
                if at > 1:
                    break
                instance.root.now = at
                del instance.root.tasks[timer]
                callback()
            self.assertGreaterEqual(instance.canvas.draws - start, 59)
            self.assertLessEqual(instance.canvas.draws - start, 61)
            instance.set_motion_enabled(False)
            self.assertFalse(instance.root.tasks)
            self.assertEqual(instance.canvas.coords('pet'), (150, 138))

    def test_cursor_follow_speed_is_independent_of_frame_rate(self):
        positions = []
        for rate in (60, 120):
            instance = pet()
            for _ in range(rate):
                instance.move_toward(300, 200, 1 / rate, 1.7)
            positions.append(instance.window_position)
        self.assertAlmostEqual(positions[0][0], positions[1][0], places=6)
        self.assertAlmostEqual(positions[0][1], positions[1][1], places=6)

    def test_static_pet_keeps_url_shortcuts(self):
        instance = pet()
        instance.show_bubble = lambda *_args: None
        with patch('desktop_app.webbrowser.open') as open_url:
            instance.open_target('url', 'https://example.com/')
            open_url.assert_called_once_with('https://example.com/')


if __name__ == '__main__':
    unittest.main()
