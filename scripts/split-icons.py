#!/usr/bin/env python3
"""
Script to split Cisco icon sprite sheet into individual icons.
Requires: pip install Pillow
Usage: python scripts/split-icons.py
"""

from PIL import Image
import os

# Icon names mapped by row and column (8 columns per row)
ICON_NAMES = [
    # Row 1
    ["meetingplace-express", "presence-server", "contact-center-enterprise", "contact-center-express", "unity", "primary-codec", "secondary-codec", "surveillance-camera"],
    # Row 2
    ["communications-manager", "operations-manager", "media-server", "h323", "video-analytics", "ip-phone", "ip-gateway", "transcoder"],
    # Row 3
    ["hdtv", "set-top", "polycom-phone", "clock", "joystick", "camera", "virtual-desktop", "shield"],
    # Row 4
    ["telepresence-endpoint", "telepresence-twin", "immersive-telepresence", "telepresence-exchange", "touchscreen", "webex", "laptop-video", "upc-communicator"],
    # Row 5
    ["video-gateway", "multipoint-meeting", "video-call-server", "recording-server", "meeting-scheduler", "decoders", "encoders", None],
    # Row 6
    ["cube", "mediasense", "telepresence-kiosk", None, None, None, None, None],
]

# Based on debug analysis:
# y=0-50: empty, y=50-100: row1 icon, y=100-200: row1 text
# y=200-250: row2 icon starts
# Each row is ~165px spacing
ROW_Y_POSITIONS = [
    (50, 100),     # Row 1: icon at y=50-100
    (215, 265),    # Row 2: y=215-265
    (380, 430),    # Row 3
    (545, 595),    # Row 4
    (710, 760),    # Row 5
    (875, 925),    # Row 6
]

def split_sprite_sheet(input_path, output_dir):
    """Split sprite sheet into individual icons."""

    os.makedirs(output_dir, exist_ok=True)

    img = Image.open(input_path)
    img_width, img_height = img.size

    print(f"Sprite sheet size: {img_width}x{img_height}")

    cell_width = 128  # 1024 / 8
    icon_left_padding = 8
    icon_right_padding = 8

    count = 0
    for row_idx, row_names in enumerate(ICON_NAMES):
        if row_idx >= len(ROW_Y_POSITIONS):
            break

        y_start, y_end = ROW_Y_POSITIONS[row_idx]

        for col_idx, name in enumerate(row_names):
            if name is None:
                continue

            left = col_idx * cell_width + icon_left_padding
            top = y_start
            right = (col_idx + 1) * cell_width - icon_right_padding
            bottom = y_end

            icon = img.crop((left, top, right, bottom))
            output_path = os.path.join(output_dir, f"{name}.png")
            icon.save(output_path, "PNG")
            print(f"Saved: {name}.png (y={y_start}-{y_end})")
            count += 1

    print(f"\nDone! Saved {count} icons to {output_dir}")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)

    input_path = os.path.join(project_dir, "src", "assets", "cisco-icons.png")
    output_dir = os.path.join(project_dir, "src", "assets", "icons")

    # Clear existing icons
    if os.path.exists(output_dir):
        for f in os.listdir(output_dir):
            if f.endswith('.png'):
                os.remove(os.path.join(output_dir, f))

    split_sprite_sheet(input_path, output_dir)
