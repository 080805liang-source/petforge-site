import unittest
from chat_window import bubble_position


class BubblePositionTests(unittest.TestCase):
    def test_above_pet_and_horizontal_edges(self):
        for px in (0,700,1260):
            x,y,above,tip=bubble_position((px,500,200,180),380,320,(0,0,1280,720))
            self.assertGreaterEqual(x,0);self.assertLessEqual(x+380,1280)
            self.assertEqual(y,172);self.assertTrue(above)
            self.assertGreaterEqual(tip,28);self.assertLessEqual(tip,352)

    def test_top_edge_places_bubble_below_and_negative_monitor_is_supported(self):
        x,y,above,_=bubble_position((-1400,10,200,180),380,320,(-1920,0,0,1040))
        self.assertFalse(above);self.assertEqual(y,198)
        self.assertGreaterEqual(x,-1920);self.assertLessEqual(x+380,0)

    def test_small_work_area_keeps_bubble_inside(self):
        x,y,_,_=bubble_position((300,240,200,180),380,320,(0,0,640,480))
        self.assertGreaterEqual(x,0);self.assertGreaterEqual(y,0)
        self.assertLessEqual(x+380,640);self.assertLessEqual(y+320,480)
