#!/usr/bin/env python3
# Generates the AI Pentest logo assets: editable SVGs (light + dark) for all six
# marks + the favicon tile, and PNG exports of the recommended Terminal Shield.
import os, subprocess, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
os.makedirs(HERE, exist_ok=True)

EMBER = "#F57214"
DARK_INK = "#E9EBED"   # neutral for use ON dark surfaces
LIGHT_INK = "#141210"  # neutral for use ON light surfaces

# inner SVG per mark, parameterized by {N}=neutral, {E}=ember
MARKS = {
 "terminal-shield":
   '<path d="M20 4 L34 9 V20 C34 28 28 34 20 37 C12 34 6 28 6 20 V9 Z" fill="none" stroke="{N}" stroke-width="2.3" stroke-linejoin="round"/>'
   '<path d="M14.5 16 L19.5 20.5 L14.5 25" fill="none" stroke="{E}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
   '<path d="M22 25 H27" stroke="{E}" stroke-width="2.5" stroke-linecap="round"/>',
 "hex-core":
   '<path d="M20 3.5 L33.5 11.25 V26.75 L20 34.5 L6.5 26.75 V11.25 Z" fill="none" stroke="{N}" stroke-width="2.3" stroke-linejoin="round"/>'
   '<circle cx="20" cy="19" r="8" fill="none" stroke="{E}" stroke-width="1.6" opacity=".45"/>'
   '<circle cx="20" cy="19" r="4" fill="{E}"/>',
 "target-lock":
   '<circle cx="20" cy="20" r="15" fill="none" stroke="{N}" stroke-width="2.2"/>'
   '<circle cx="20" cy="20" r="8.5" fill="none" stroke="{N}" stroke-width="2.2" opacity=".55"/>'
   '<path d="M20 2 V8 M20 32 V38 M2 20 H8 M32 20 H38" stroke="{E}" stroke-width="2.4" stroke-linecap="round"/>'
   '<circle cx="20" cy="20" r="3.2" fill="{E}"/>',
 "prompt":
   '<path d="M15 10 L7 20 L15 30" fill="none" stroke="{N}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
   '<path d="M25 10 L33 20 L25 30" fill="none" stroke="{N}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
   '<rect x="17.75" y="15.5" width="4.5" height="9" rx="1" fill="{E}"/>',
 "caret-a":
   '<path d="M8 31 L20 8 L32 31" fill="none" stroke="{N}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
   '<path d="M14.2 21 H25.8" stroke="{E}" stroke-width="2.6" stroke-linecap="round"/>'
   '<circle cx="20" cy="31" r="1.9" fill="{E}"/>',
 "sentinel":
   '<path d="M20 4 L34 9 V20 C34 28 28 34 20 37 C12 34 6 28 6 20 V9 Z" fill="none" stroke="{N}" stroke-width="2.3" stroke-linejoin="round"/>'
   '<path d="M20 18 L14 14 M20 18 L26 14 M20 18 L20 27" stroke="{N}" stroke-width="1.7" opacity=".6" stroke-linecap="round"/>'
   '<circle cx="20" cy="18" r="3.1" fill="{E}"/>'
   '<circle cx="14" cy="14" r="1.9" fill="{N}"/><circle cx="26" cy="14" r="1.9" fill="{N}"/>'
   '<circle cx="20" cy="27" r="1.9" fill="{E}"/>',
}

def svg(inner, n, e, size=512):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
            f'viewBox="0 0 40 40" fill="none">' + inner.format(N=n, E=e) + '</svg>\n')

# ---- editable SVGs: every mark, light + dark ----
written = []
for name, inner in MARKS.items():
    for theme, ink in (("dark", DARK_INK), ("light", LIGHT_INK)):
        p = os.path.join(HERE, f"{name}-{theme}.svg")
        open(p, "w").write(svg(inner, ink, EMBER))
        written.append(p)

# ---- favicon tile: ember rounded square + dark mark ----
tile = ('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 48 48">'
        '<rect width="48" height="48" rx="11" fill="#F57214"/>'
        '<g transform="translate(4,4)" fill="none" stroke="#0E0F11" stroke-linejoin="round" stroke-linecap="round">'
        '<path d="M20 4 L34 9 V20 C34 28 28 34 20 37 C12 34 6 28 6 20 V9 Z" stroke-width="2.6"/>'
        '<path d="M14.5 16 L19.5 20.5 L14.5 25" stroke-width="2.8"/>'
        '<path d="M22 25 H27" stroke-width="2.8"/></g></svg>\n')
open(os.path.join(HERE, "favicon-tile.svg"), "w").write(tile)
written.append(os.path.join(HERE, "favicon-tile.svg"))

# ---- PNG export of the recommended Terminal Shield (both themes) + the tile ----
def to_png(src_svg, out_png, size):
    # ImageMagick with a transparent background; density high for crisp edges.
    subprocess.run(["convert", "-background", "none", "-density", "600",
                    src_svg, "-resize", f"{size}x{size}", out_png], check=True)

pngdir = os.path.join(HERE, "png")
os.makedirs(pngdir, exist_ok=True)
png_written = []
for theme in ("dark", "light"):
    for size in (512, 256, 128, 64, 32, 16):
        out = os.path.join(pngdir, f"terminal-shield-{theme}-{size}.png")
        to_png(os.path.join(HERE, f"terminal-shield-{theme}.svg"), out, size)
        png_written.append(out)
for size in (512, 180, 96, 32, 16):
    out = os.path.join(pngdir, f"favicon-tile-{size}.png")
    to_png(os.path.join(HERE, "favicon-tile.svg"), out, size)
    png_written.append(out)

print("SVGs:", len(written), "| PNGs:", len(png_written))
print("sample:", os.path.basename(png_written[0]))
