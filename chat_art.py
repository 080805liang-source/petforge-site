"""Render the same illustrated chat frame used by the browser with nine-slice scaling."""
from PIL import Image


def frame_image(source,width,height,background):
    result=Image.new('RGBA',(width,height),background)
    # Source 600x300. Keep illustrated corners intact and stretch only clean edges.
    sx=(0,150,450,600);sy=(0,100,200,300)
    edge_x=min(64,width//3);edge_y=min(42,height//3)
    dx=(0,edge_x,width-edge_x,width);dy=(0,edge_y,height-edge_y,height)
    overlay=Image.new('RGBA',(width,height))
    for row in range(3):
        for col in range(3):
            patch=source.crop((sx[col],sy[row],sx[col+1],sy[row+1]))
            patch=patch.resize((dx[col+1]-dx[col],dy[row+1]-dy[row]),Image.Resampling.LANCZOS)
            overlay.alpha_composite(patch,(dx[col],dy[row]))
    result.alpha_composite(overlay)
    return result.convert('RGB')
