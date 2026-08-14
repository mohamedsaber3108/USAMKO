#!/usr/bin/env python3
"""Generate Chrome extension icons using PIL"""

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Installing Pillow...")
    import subprocess
    subprocess.check_call(['pip', 'install', 'pillow'])
    from PIL import Image, ImageDraw, ImageFont

import os

# Create icons directory
icons_dir = 'chrome-extension/icons'
os.makedirs(icons_dir, exist_ok=True)

def create_icon(size):
    """Create icon at specified size"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Gradient background (simplified to solid color)
    draw.rectangle([0, 0, size, size], fill=(102, 126, 234, 255))

    # White circle (map pin base)
    pin_radius = size // 3
    center = size // 2
    draw.ellipse([
        center - pin_radius,
        center - pin_radius,
        center + pin_radius,
        center + pin_radius
    ], fill=(255, 255, 255, 240))

    # Inner circle (map pin dot)
    dot_radius = size // 8
    draw.ellipse([
        center - dot_radius,
        center - dot_radius,
        center + dot_radius,
        center + dot_radius
    ], fill=(102, 126, 234, 255))

    # "U" text at bottom
    try:
        font = ImageFont.truetype("arial.ttf", size // 4)
    except:
        font = ImageFont.load_default()

    text = "U"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    draw.text(
        (center - text_width // 2, size - text_height - size // 8),
        text,
        fill=(255, 255, 255, 255),
        font=font
    )

    return img

# Generate icons
for size in [16, 48, 128]:
    print(f"Creating icon{size}.png...")
    icon = create_icon(size)
    icon.save(f'{icons_dir}/icon{size}.png')

print(f"\n[OK] Icons created in {icons_dir}/")
print("   - icon16.png")
print("   - icon48.png")
print("   - icon128.png")
