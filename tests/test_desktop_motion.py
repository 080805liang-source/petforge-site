import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from desktop_app import DesktopPet, motion_offset, transparent_color


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
    instance.height = 316
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
    instance.pointer_down = False
    instance.drag_target = None
    instance.timer_precision = False
    instance.frame_timer = None
    instance.static_timer = None
    instance.keyboard_timer = None
    instance.wander_timer = None
    instance.cursor_offset = (0, 0)
    instance.track_cursor = lambda _delta: None
    return instance


class DesktopMotionTests(unittest.TestCase):
    def test_transparency_key_never_erases_a_color_present_in_the_pet(self):
        colors = [(0, 0, 0), (1, 0, 0), (2, 0, 0), (255, 255, 255)]
        photo = SimpleNamespace(width=lambda: len(colors), height=lambda: 1, get=lambda x, _y: colors[x])
        key = transparent_color(photo)
        rgb = tuple(int(key[i:i+2], 16) for i in (1, 3, 5))
        self.assertNotIn(rgb, colors)
        self.assertLess(max(rgb), 16, 'unused dark key avoids a bright fringe')

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

    def test_static_mode_preserves_low_frequency_cursor_follow(self):
        instance = pet()
        ticks = []
        instance.track_cursor = ticks.append
        with patch('desktop_app.sys.platform', 'test'), patch('desktop_app.time.perf_counter', lambda: instance.root.now):
            instance.set_motion_enabled(False)
            instance.root.now = .1
            instance.static_tick()
        self.assertEqual(ticks, [.1])
        self.assertIn(instance.static_timer, instance.root.tasks)

    def test_timed_animation_interpolates_and_returns_home(self):
        points = [(0, 0), (0, -24), (0, 0)]
        self.assertEqual(motion_offset(points, 0, .28), (0, 0))
        self.assertEqual(motion_offset(points, .07, .28), (0, -12))
        for rate in (30, 60, 120):
            positions = [motion_offset(points, index / rate, .28) for index in range(rate + 1)]
            self.assertEqual(positions[-1], (0, 0))
            self.assertTrue(all(-24 <= value[1] <= 0 for value in positions))

    def test_dynamic_scheduler_targets_120_fps_and_stops_when_disabled(self):
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
            self.assertGreaterEqual(instance.canvas.draws - start, 119)
            self.assertLessEqual(instance.canvas.draws - start, 121)
            instance.set_motion_enabled(False)
            self.assertEqual(len(instance.root.tasks), 1)
            self.assertEqual(instance.canvas.coords('pet'), (150, 138))
            instance.root.tasks.clear()
            instance.static_tick()
            self.assertEqual(len(instance.root.tasks), 1)
            self.assertIn(instance.static_timer, instance.root.tasks)

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

    def test_hover_never_adds_the_old_halo_even_for_a_saved_template(self):
        for config in ({}, {'hoverEffect': 'halo'}, {'hoverEffect': 'none'}):
            instance = pet()
            instance.config = config
            instance.motion_enabled = True
            instance.on_hover(None)
            self.assertFalse(instance.canvas.items)

    def test_drag_uses_screen_coordinates_and_commits_the_latest_pointer(self):
        instance = pet()
        instance.motion_enabled = True
        instance.pending_click = None
        instance.root.position = (100, 100)
        instance.start_drag(SimpleNamespace(x_root=150, y_root=150))
        instance.drag(SimpleNamespace(x_root=250, y_root=190))
        instance.drag(SimpleNamespace(x_root=300, y_root=210))
        self.assertEqual(instance.root.position, (100, 100), 'events coalesce until the next frame')
        instance.release_left(None)
        self.assertEqual(instance.root.position, (250, 160))
        self.assertFalse(instance.pointer_down)
        self.assertFalse(instance.root.tasks, 'dragging must not trigger a click animation')

    def test_follow_does_not_stop_when_the_cursor_is_far_away(self):
        instance = pet()
        del instance.track_cursor
        instance.config = {'cursorFollowMode': 'follow', 'proactiveFrequency': 'quiet'}
        instance.root.winfo_screenwidth = lambda: 2560
        instance.root.winfo_screenheight = lambda: 1440
        instance.cursor_position = lambda: (1800, 600)
        instance.last_cursor_near = False
        instance.last_proactive_at = 0
        instance.motion_active = True
        instance.track_cursor(1 / 120)
        x, y = instance.window_position
        self.assertGreater(x, 0)
        self.assertLessEqual((x*x+y*y)**.5, 900 / 120 + 1e-6)

    def test_holding_the_pet_suspends_autonomous_follow(self):
        instance = pet()
        ticks = []
        instance.track_cursor = ticks.append
        instance.pointer_down = True
        with patch('desktop_app.time.perf_counter', lambda: instance.root.now):
            instance.set_motion_enabled(False)
            instance.root.now = .1
            instance.static_tick()
        self.assertFalse(ticks)


if __name__ == '__main__':
    unittest.main()
