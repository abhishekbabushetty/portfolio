"""Turn a portrait photo into the small cut-out the site's dot portrait is sampled from.

    python tools/build_face.py path/to/photo.jpg

Output: assets/face.png  (greyscale in RGB, person mask in alpha, ~168 px wide)
Only this processed cut-out ships with the site, never the original photo.
Works best with a plain, light, evenly lit wall behind you.
"""
import sys, os
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

SRC = sys.argv[1] if len(sys.argv) > 1 else "photo.jpg"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "face.png")
OUT_W = 168

im = Image.open(SRC).convert("RGB")
a = np.asarray(im).astype(np.float32)
H, W, _ = a.shape

# --- 1. wall = bright, low-saturation pixels connected to the photo's border
b = np.asarray(im.filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32)
lum_b = (0.299 * b[..., 0] + 0.587 * b[..., 1] + 0.114 * b[..., 2]) / 255.0
ref = np.median(np.concatenate([b[:6, :6].reshape(-1, 3), b[:6, -6:].reshape(-1, 3)]), axis=0)   # wall colour
ref_lum = (0.299 * ref[0] + 0.587 * ref[1] + 0.114 * ref[2]) / 255.0
ref_br = ref[2] / max(ref[0], 1)
wallish = (lum_b > ref_lum - 0.24) & (b[..., 2] / np.maximum(b[..., 0], 1) > ref_br - 0.13)
wall = np.zeros((H, W), bool)
q = deque()
for x in range(W): q.append((0, x))
for y in range(int(H * 0.8)): q.append((y, 0)); q.append((y, W - 1))
while q:
    y, x = q.popleft()
    if wall[y, x] or not wallish[y, x]: continue
    wall[y, x] = True
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < H and 0 <= nx < W and not wall[ny, nx]: q.append((ny, nx))
person = ~wall

# --- 2. clean the mask (drop specks, close pinholes) and soften the edge
mask = Image.fromarray((person * 255).astype(np.uint8))
mask = mask.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.2))

# --- 3. luminance with a contrast curve (hair/beard stay dim but present, eyes dark)
lum = (0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]) / 255.0
m = np.asarray(mask) / 255.0
inside = lum[m > 0.5]
lo, hi = np.percentile(inside, 2), np.percentile(inside, 99)
lum = np.clip((lum - lo) / (hi - lo), 0, 1) ** 0.85
g = Image.fromarray((lum * 255).astype(np.uint8)).filter(ImageFilter.UnsharpMask(radius=2, percent=120, threshold=2))

# --- 4. crop to the person, resize, save
ys, xs = np.where(m > 0.5)
y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
rgba = Image.merge("RGBA", (g, g, g, mask)).crop((x0, y0, x1, y1))
OUT_H = round(OUT_W * rgba.height / rgba.width)
rgba = rgba.resize((OUT_W, OUT_H), Image.LANCZOS)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
rgba.save(OUT, optimize=True)
print(f"saved {os.path.normpath(OUT)}  {OUT_W}x{OUT_H}  person covers {(m > 0.5).mean() * 100:.0f}% of the photo")
