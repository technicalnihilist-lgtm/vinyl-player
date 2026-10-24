"""
Vinyl Player launcher icon — Liquid Glass, 3D.

Matches the design language the app uses: a soft glass body with a bright
specular rim, and a three-dimensional record floating on it.

Produces
  res/mipmap-*/ic_launcher.png                 legacy full icon (API < 26)
  res/mipmap-*/ic_launcher_background.png      adaptive background (glass body)
  res/drawable-nodpi/ic_launcher_foreground.png  adaptive foreground (3D record)
  res/drawable-nodpi/ic_launcher_monochrome.png  themed icon (Android 13+)
  res/mipmap-anydpi-v26/ic_launcher.xml        adaptive icon description
  icon-512.png                                 store / preview icon
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = "/scratch/work/android/res"
SS = 3  # supersample factor — edges are downscaled for smoothness
MASTER = 432  # xxxhdpi adaptive canvas (108dp)


# --------------------------------------------------------------------- helpers
def grid(size):
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    return xx, yy


def radial(size, cx, cy, rx, ry, power=1.6):
    xx, yy = grid(size)
    d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
    return np.clip(1.0 - d, 0.0, 1.0) ** power


def linear(size, x0, y0, x1, y1):
    xx, yy = grid(size)
    dx, dy = x1 - x0, y1 - y0
    t = ((xx - x0) * dx + (yy - y0) * dy) / float(dx * dx + dy * dy)
    return np.clip(t, 0.0, 1.0)


def tint(color, field):
    """Broadcast an RGB colour over a scalar field -> (n, n, 3)."""
    return np.array(color, np.float32)[None, None, :] * field[:, :, None]


def mix(a, b, t):
    """Blend two RGB float arrays with a per-pixel weight t (H, W, 1)."""
    return a * (1.0 - t) + b * t


def to_img(rgb, alpha):
    a = np.clip(alpha, 0, 255)
    if a.ndim == 2:
        a = a[:, :, None]
    rgba = np.concatenate([np.clip(rgb, 0, 255), a], axis=2)
    return Image.fromarray(rgba.astype(np.uint8), "RGBA")


# ------------------------------------------------------------ glass background
def make_background(size):
    """A sheet of liquid glass: deep colour, bright specular top, soft vignette."""
    n = size * SS
    xx, yy = grid(n)

    # base colour: violet low, blue high
    t = linear(n, 0, 0, 0, n)
    top = np.array([92.0, 74.0, 190.0])
    mid = np.array([58.0, 42.0, 140.0])
    bot = np.array([26.0, 16.0, 62.0])
    rgb = np.where(
        (t < 0.5)[:, :, None],
        mix(top[None, None, :].repeat(n, 0).repeat(n, 1), mid[None, None, :].repeat(n, 0).repeat(n, 1), (t / 0.5)[:, :, None]),
        mix(mid[None, None, :].repeat(n, 0).repeat(n, 1), bot[None, None, :].repeat(n, 0).repeat(n, 1), ((t - 0.5) / 0.5)[:, :, None]),
    )

    # a big soft specular bloom, top-left, like light on glass
    bloom = radial(n, n * 0.26, n * 0.16, n * 0.62, n * 0.5, power=1.7)
    rgb += tint([210.0, 214.0, 255.0], bloom * 0.55)

    # a second, cooler sheen bottom-right
    sheen = radial(n, n * 0.88, n * 0.92, n * 0.5, n * 0.42, power=1.8)
    rgb += tint([70.0, 190.0, 235.0], sheen * 0.34)

    # gentle corner falloff so the square does not read as flat
    edge = np.minimum(np.minimum(xx, n - 1 - xx), np.minimum(yy, n - 1 - yy)) / (n * 0.5)
    rgb *= (0.82 + 0.18 * np.clip(edge, 0, 1))[:, :, None]

    img = to_img(rgb, np.full((n, n), 255.0))
    return img.resize((size, size), Image.LANCZOS)


def make_glass_overlay(size):
    """Bright specular rim + inner highlight, drawn on the adaptive background."""
    n = size * SS
    xx, yy = grid(n)
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))

    # inner top highlight
    top_glow = radial(n, n * 0.5, -n * 0.12, n * 0.86, n * 0.42, power=1.5)
    arr = np.zeros((n, n, 4), np.float32)
    arr[:, :, 0:3] = 255.0
    arr[:, :, 3] = top_glow * 105.0
    img = Image.alpha_composite(img, Image.fromarray(arr.astype(np.uint8), "RGBA"))

    # rim: bright at the top-left, cooler at the bottom-right
    d = ImageDraw.Draw(img)
    w = max(2, int(n * 0.012))
    d.rounded_rectangle([w // 2, w // 2, n - w // 2, n - w // 2], radius=int(n * 0.22),
                        outline=(255, 255, 255, 120), width=w)
    img = img.filter(ImageFilter.GaussianBlur(n * 0.004))
    return img.resize((size, size), Image.LANCZOS)


# ------------------------------------------------------------------- the record
def make_record(size, canvas_ratio=0.66, monochrome=False):
    """A three-dimensional record, centred, sized to the adaptive safe zone."""
    n = size * SS
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    cx = cy = n / 2.0
    R = n * canvas_ratio / 2.0

    if monochrome:
        d = ImageDraw.Draw(img)
        d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=(255, 255, 255, 255))
        d.ellipse([cx - R * 0.44, cy - R * 0.44, cx + R * 0.44, cy + R * 0.44], fill=(0, 0, 0, 0))
        d.ellipse([cx - R * 0.13, cy - R * 0.13, cx + R * 0.13, cy + R * 0.13], fill=(255, 255, 255, 255))
        return img.resize((size, size), Image.LANCZOS)

    xx, yy = grid(n)
    r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    theta = np.arctan2(yy - cy, xx - cx)
    inside = (r <= R).astype(np.float32)

    # --- disc body: light comes from the top-left
    light = np.clip(1.0 - ((xx - (cx - R * 0.42)) ** 2 + (yy - (cy - R * 0.42)) ** 2) / (R * R * 1.9), 0, 1)
    body = np.array([16.0, 16.0, 21.0])[None, None, :] + (np.array([58.0, 58.0, 70.0]) * light[:, :, None])
    rgb = body

    # --- grooves
    band = (np.sin(r / (R * 0.045)) * 0.5 + 0.5)
    rgb = rgb * (1.0 + 0.13 * band[:, :, None])

    # --- conic specular sweep (the classic record highlight)
    sweep = np.clip(np.cos(theta - np.deg2rad(-42.0)), 0, 1) ** 12
    sweep2 = np.clip(np.cos(theta - np.deg2rad(150.0)), 0, 1) ** 20
    rgb += tint([190.0, 195.0, 220.0], sweep + sweep2 * 0.7)

    # --- rim light around the outer edge
    rim = np.clip((r - R * 0.93) / (R * 0.07), 0, 1) * np.clip((R - r) / (R * 0.04), 0, 1)
    rim *= np.clip(np.cos(theta - np.deg2rad(-40.0)) * 0.5 + 0.6, 0, 1)
    rgb += tint([235.0, 240.0, 255.0], rim)

    # --- label: the app's purple → blue → cyan
    LR = R * 0.44
    lr = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / LR
    lab_t = np.clip(linear(n, cx - LR, cy + LR, cx + LR, cy - LR), 0, 1)
    lab = (
        mix(np.array([168.0, 85.0, 247.0])[None, None, :].repeat(n, 0).repeat(n, 1),
            np.array([59.0, 130.0, 246.0])[None, None, :].repeat(n, 0).repeat(n, 1),
            (lab_t * 1.7)[:, :, None])
    )
    lab = np.where(lab_t[:, :, None] < 0.58, lab,
                   mix(lab, np.array([34.0, 211.0, 238.0])[None, None, :].repeat(n, 0).repeat(n, 1),
                       ((lab_t - 0.58) / 0.42)[:, :, None]))
    lab = np.clip(lab * 1.06, 0, 255)
    gloss = radial(n, cx - LR * 0.4, cy - LR * 0.45, LR * 1.1, LR * 0.95, power=1.5)
    lab += tint([255.0, 255.0, 255.0], gloss * 0.42)
    label_mask = np.clip((1.0 - lr) * 8.0, 0, 1)

    rgb = mix(rgb, lab, label_mask[:, :, None])

    # --- centre hole
    hole = np.clip((1.0 - r / (R * 0.115)) * 4.0, 0, 1)
    rgb = mix(rgb, np.array([10.0, 10.0, 14.0])[None, None, :].repeat(n, 0).repeat(n, 1), hole[:, :, None])
    hole_ring = np.clip((1.0 - np.abs(r - R * 0.115) / (R * 0.018)) * 2.0, 0, 1)
    rgb += tint([200.0, 205.0, 225.0], hole_ring * 0.6)

    # --- soft contact shadow, so the record sits on the glass
    shadow = np.clip(1.0 - ((r - R * 0.1) / (R * 0.75)), 0, 1) ** 2
    alpha = inside

    disc = to_img(rgb, alpha * 255.0)
    img = Image.alpha_composite(img, disc)
    return img.resize((size, size), Image.LANCZOS), shadow


def make_foreground(size):
    n = size * SS
    out = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    cx = cy = n / 2.0
    R = n * 0.66 / 2.0

    # contact shadow
    xx, yy = grid(n)
    r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    sh = np.clip(1.0 - (r / (R * 1.16)), 0, 1) ** 1.7
    sarr = np.zeros((n, n, 4), np.float32)
    sarr[:, :, 3] = sh * 150.0
    shadow = Image.fromarray(sarr.astype(np.uint8), "RGBA").filter(ImageFilter.GaussianBlur(n * 0.03))
    out = Image.alpha_composite(out, shadow)

    rec, _ = make_record(size, canvas_ratio=0.66)
    rec = rec.resize((n, n), Image.LANCZOS)
    out = Image.alpha_composite(out, rec)
    return out.resize((size, size), Image.LANCZOS)


def make_monochrome(size):
    rec = make_record(size, canvas_ratio=0.66, monochrome=True)
    return rec


# ------------------------------------------------------------------------ write
def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)
    return path


def main():
    master = MASTER
    bg_master = Image.alpha_composite(make_background(master), make_glass_overlay(master))
    fg_master = make_foreground(master)
    mono_master = make_monochrome(master)

    # adaptive icon layers, one PNG per density
    densities = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
    for name, px in densities.items():
        save(bg_master.resize((px, px), Image.LANCZOS), f"{OUT}/mipmap-{name}/ic_launcher_background.png")
    save(fg_master, f"{OUT}/drawable-nodpi/ic_launcher_foreground.png")
    save(mono_master, f"{OUT}/drawable-nodpi/ic_launcher_monochrome.png")

    # legacy icons (API < 26): glass body + record, masked to a squircle
    legacy = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    for name, px in legacy.items():
        n = px * SS
        body = bg_master.resize((n, n), Image.LANCZOS)
        mask = Image.new("L", (n, n), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, n - 1, n - 1], radius=int(n * 0.225), fill=255)
        flat = Image.new("RGBA", (n, n), (0, 0, 0, 0))
        flat.paste(body, (0, 0), mask)
        rec, _ = make_record(n, canvas_ratio=0.68)
        flat = Image.alpha_composite(flat, rec.resize((n, n), Image.LANCZOS))
        save(flat.resize((px, px), Image.LANCZOS), f"{OUT}/mipmap-{name}/ic_launcher.png")

    # store icon
    save(bg_master.resize((512, 512), Image.LANCZOS), "/scratch/work/android/icon-bg-512.png")
    preview = Image.alpha_composite(bg_master.resize((512, 512), Image.LANCZOS),
                                    fg_master.resize((512, 512), Image.LANCZOS))
    save(preview, "/scratch/work/android/icon-512.png")

    # previews under the two masks Android actually uses
    for label, radius_ratio in (("circle", 0.5), ("squircle", 0.235)):
        n = 512 * SS
        base = Image.alpha_composite(bg_master.resize((n, n), Image.LANCZOS),
                                     fg_master.resize((n, n), Image.LANCZOS))
        mask = Image.new("L", (n, n), 0)
        d = ImageDraw.Draw(mask)
        if label == "circle":
            d.ellipse([0, 0, n - 1, n - 1], fill=255)
        else:
            d.rounded_rectangle([0, 0, n - 1, n - 1], radius=int(n * radius_ratio), fill=255)
        out = Image.new("RGBA", (n, n), (0, 0, 0, 0))
        out.paste(base, (0, 0), mask)
        save(out.resize((512, 512), Image.LANCZOS), f"/scratch/work/android/icon-{label}.png")

    print("icons written")


if __name__ == "__main__":
    main()
