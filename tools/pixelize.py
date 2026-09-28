"""Turn an AI-generated sprite on a magenta background into clean,
transparent pixel art for the game.

The generated images are drawn in chunky "pixels" about 11-12 image pixels
wide, so this shrinks them back down to that grid (taking the median color of
each cell). The game then scales them up again with crisp, unsmoothed pixels.

Usage:
  python3 tools/pixelize.py SOURCE OUTPUT --width N [options]

Options:
  --width N          Width of the grid in pixels. Pick N so each cell is about
                     one "pixel" of the source (source width / pixel size).
  --cell N           Instead of --width: the size of one grid cell in source
                     pixels. Using the same cell for several sprites gives
                     them the same pixel density on screen.
  --crop X0,Y0,X1,Y1 Only use this part of the source (for sheets with several
                     sprites on one magenta background).
  --erase X0,Y0,X1,Y1  Erase dark pixels in this box (source image coordinates)
                     before shrinking. Light pixels (white, pale gray) are kept,
                     so a white tail overlapping the box survives. Repeatable.
  --rotate DEG       Rotate the result clockwise by 90, 180 or 270 degrees
                     (game sprites face right).
  --preview PATH     Also save an enlarged preview on a dark blue background.

The grid is always measured from the whole sprite (within --crop), before
erasing, so frames cut from the same source line up exactly.

Examples (these produce the game's current assets):
  python3 tools/pixelize.py art-source/loon-top.webp src/assets/loon-big.png --width 120
  python3 tools/pixelize.py art-source/eagle.webp src/assets/eagle-wings-forward.png --width 114 \\
      --erase 0,384,600,768 --erase 808,384,1408,768 --rotate 90
  python3 tools/pixelize.py art-source/eagle.webp src/assets/eagle-wings-back.png --width 114 \\
      --erase 0,0,600,384 --erase 808,0,1408,384 --rotate 90
  python3 tools/pixelize.py art-source/baby-loon-top.webp src/assets/baby-loon-big.png --width 48
  python3 tools/pixelize.py art-source/reeds-clump.webp src/assets/reeds-clump.png --cell 11
  python3 tools/pixelize.py art-source/lily-pads.webp src/assets/lily-pad-flower.png --cell 11 --crop 0,0,590,768
  python3 tools/pixelize.py art-source/lily-pads.webp src/assets/lily-pad.png --cell 11 --crop 590,0,1050,768
  python3 tools/pixelize.py art-source/lily-pads.webp src/assets/lily-pad-small.png --cell 11 --crop 1050,0,1408,768

Needs Pillow (pip install pillow).
"""
import argparse
from PIL import Image

OUTLINE = (10, 10, 14)


def is_background(c):
    r, g, b = c
    # Magenta and the pinkish generator watermark: red and blue high, green
    # well below both. The sprites are browns, grays, greens, and white.
    return r > 150 and b > 150 and g < min(r, b) - 30


def is_light(c):
    return min(c) > 170


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source')
    parser.add_argument('output')
    size = parser.add_mutually_exclusive_group(required=True)
    size.add_argument('--width', type=int)
    size.add_argument('--cell', type=float)
    parser.add_argument('--crop')
    parser.add_argument('--erase', action='append', default=[])
    parser.add_argument('--rotate', type=int, default=0, choices=[0, 90, 180, 270])
    parser.add_argument('--preview')
    args = parser.parse_args()

    im = Image.open(args.source).convert('RGB')
    W, H = im.size
    px = im.load()

    if args.crop:
        cx0, cy0, cx1, cy1 = (int(v) for v in args.crop.split(','))
        for y in range(H):
            for x in range(W):
                if not (cx0 <= x < cx1 and cy0 <= y < cy1):
                    px[x, y] = (255, 0, 255)

    xs, ys = [], []
    for y in range(0, H, 2):
        for x in range(0, W, 2):
            if not is_background(px[x, y]):
                xs.append(x)
                ys.append(y)
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)

    for box in args.erase:
        bx0, by0, bx1, by1 = (int(v) for v in box.split(','))
        for y in range(max(by0, 0), min(by1, H)):
            for x in range(max(bx0, 0), min(bx1, W)):
                if not is_light(px[x, y]):
                    px[x, y] = (255, 0, 255)

    width = args.width or round((x1 - x0 + 1) / args.cell)
    cell = (x1 - x0 + 1) / width
    target_h = round((y1 - y0 + 1) / cell)
    out = Image.new('RGBA', (width, target_h), (0, 0, 0, 0))
    for gy in range(target_h):
        for gx in range(width):
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
            if r > g + 12 and b > g + 12:
                # Purple tint where the outline blended into the magenta. (The
                # art's browns, greens, and navies all have green >= red or blue.)
                median = OUTLINE
            out.putpixel((gx, gy), median + (255,))

    if args.rotate:
        out = out.rotate(-args.rotate, expand=True)  # PIL rotates counterclockwise.
    out.save(args.output)
    print(f'wrote {args.output}: {out.width}x{out.height} (cell {cell:.1f}px)')

    if args.preview:
        scale = 5
        big = out.resize((out.width * scale, out.height * scale), Image.NEAREST)
        bg = Image.new('RGBA', big.size, (20, 40, 80, 255))
        bg.alpha_composite(big)
        bg.convert('RGB').save(args.preview)


if __name__ == '__main__':
    main()
