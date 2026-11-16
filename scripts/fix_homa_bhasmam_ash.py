"""Recolor Homa Bhasmam forehead lines to natural warm ash (no blue)."""
from __future__ import annotations

from PIL import Image, ImageFilter

SRC = r"e:\japa_siddhi\japa_siddhi\src\assets\images\homa_bhasmam_icon.jpg"
DST = SRC

# Natural vibhuti / bhasmam ash (warm taupe / light brownish ash)
ASH = (182, 168, 148)


def is_ash_like(r: int, g: int, b: int, skin_ref: tuple[int, int, int]) -> bool:
  brightness = (r + g + b) / 3.0
  if brightness < 85 or brightness > 220:
    return False
  # Not saturated skin/lips/eyes
  if max(r, g, b) - min(r, g, b) > 48:
    return False
  # Distinct from surrounding skin (usually warmer / pinker)
  sr, sg, sb = skin_ref
  skin_dist = abs(r - sr) + abs(g - sg) + abs(b - sb)
  if skin_dist < 18:
    return False
  # Cool gray / chalk / ash strokes (including previous blue-leaning)
  cool = b >= r - 6
  grayish = abs(r - g) <= 28 and abs(g - b) <= 32
  return cool or grayish


def main() -> None:
  img = Image.open(SRC).convert("RGBA")
  w, h = img.size
  pix = img.load()

  y0, y1 = int(h * 0.16), int(h * 0.44)
  x0, x1 = int(w * 0.20), int(w * 0.80)

  # Sample cheek skin as reference
  cx, cy = int(w * 0.32), int(h * 0.55)
  skin_samples = []
  for yy in range(cy - 8, cy + 9):
    for xx in range(cx - 8, cx + 9):
      skin_samples.append(pix[xx, yy][:3])
  skin_ref = tuple(sum(c[i] for c in skin_samples) // len(skin_samples) for i in range(3))

  mask = Image.new("L", (w, h), 0)
  m = mask.load()
  changed = 0
  for y in range(y0, y1):
    for x in range(x0, x1):
      r, g, b, a = pix[x, y]
      if a < 200:
        continue
      if not is_ash_like(r, g, b, skin_ref):  # type: ignore[arg-type]
        continue
      m[x, y] = 255
      changed += 1

  # Soften mask edges for natural paste look
  mask = mask.filter(ImageFilter.GaussianBlur(radius=0.8))
  m = mask.load()

  for y in range(y0, y1):
    for x in range(x0, x1):
      alpha = m[x, y] / 255.0
      if alpha < 0.05:
        continue
      r, g, b, a = pix[x, y]
      local = (r + g + b) / 3.0
      factor = max(0.88, min(1.10, local / 160.0))
      nr = min(255, ASH[0] * factor)
      ng = min(255, ASH[1] * factor)
      nb = min(255, ASH[2] * factor)
      # Stronger toward ash, keep slight texture
      mix = 0.78 * alpha
      pix[x, y] = (
        int(r * (1 - mix) + nr * mix),
        int(g * (1 - mix) + ng * mix),
        int(b * (1 - mix) + nb * mix),
        a,
      )

  out = img.convert("RGB")
  out.save(DST, quality=93)
  print(f"mask pixels={changed} skin_ref={skin_ref} -> {DST}")


if __name__ == "__main__":
  main()
