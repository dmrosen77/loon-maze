"""Turn art-source/loon-top.webp (AI-generated, magenta background) into a
clean, transparent pixel-art PNG for the reunion cutscene.

The source is drawn in chunky "pixels" about 12 image pixels wide, so it's
shrunk back down to that grid (taking the median color of each cell) and the
game scales it up again with crisp, unsmoothed pixels.

Usage: python3 tools/prepare_big_loon.py [target_width] [preview.png]
Needs Pillow (pip install pillow).
"""
import sys
from PIL import Image

SOURCE = 'art-source/loon-top.webp'
OUTPUT = 'src/assets/loon-big.png'

OUTLINE = (10, 10, 14)

target_w = int(sys.argv[1]) if len(sys.argv) > 1 else 120
preview = sys.argv[2] if len(sys.argv) > 2 else None

im = Image.open(SOURCE).convert('RGB')
W, H = im.size
px = im.load()


def is_background(c):
    r, g, b = c
    # Magenta and the pinkish generator watermark: red and blue high, green
    # well below both. The loon itself is grays, greens, and red, never this.
    return r > 150 and b > 150 and g < min(r, b) - 30


xs, ys = [], []
for y in range(0, H, 2):
    for x in range(0, W, 2):
        if not is_background(px[x, y]):
            xs.append(x)
            ys.append(y)
x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
cell = (x1 - x0 + 1) / target_w
target_h = round((y1 - y0 + 1) / cell)

out = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
for gy in range(target_h):
    for gx in range(target_w):
        cx0 = x0 + gx * cell
        cy0 = y0 + gy * cell
        samples = []
        for sy in range(int(cy0 + cell * 0.2), int(cy0 + cell * 0.8) + 1):
            for sx in range(int(cx0 + cell * 0.2), int(cx0 + cell * 0.8) + 1):
                if sx < W and sy < H:
                    samples.append(px[sx, sy])
        opaque = [c for c in samples if not is_background(c)]
        if not samples or len(opaque) < len(samples) * 0.5:
            continue
        median = tuple(sorted(c[i] for c in opaque)[len(opaque) // 2] for i in range(3))
        r, g, b = median
        if r > g + 40 and b > g + 40:
            # Purple fringe where the outline blended into the magenta.
            median = OUTLINE
        out.putpixel((gx, gy), median + (255,))

out.save(OUTPUT)
print(f'wrote {OUTPUT}: {target_w}x{target_h} (cell {cell:.1f}px)')

if preview:
    scale = 6
    big = out.resize((target_w * scale, target_h * scale), Image.NEAREST)
    bg = Image.new('RGBA', big.size, (20, 40, 80, 255))
    bg.alpha_composite(big)
    bg.convert('RGB').save(preview)
