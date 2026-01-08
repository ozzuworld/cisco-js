#!/usr/bin/env python3
"""
Script to split Cisco icon sprite sheet into individual icons.
Requires: pip install Pillow
Usage: python scripts/split-icons.py
"""

from PIL import Image
import os

# Icon names mapped by row and column
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
    ["video-gateway", "multipoint-meeting", "video-call-server", "recording-server", "meeting-scheduler", "decoders", "encoders"],
    # Row 6
    ["cube", "mediasense", "telepresence-kiosk"],
]

def split_sprite_sheet(input_path, output_dir, icon_width=100, icon_height=100, padding=0):
    """Split sprite sheet into individual icons."""

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    # Open the sprite sheet
    img = Image.open(input_path)
    img_width, img_height = img.size

    print(f"Sprite sheet size: {img_width}x{img_height}")

    # Calculate grid
    cols = img_width // icon_width
    rows = img_height // icon_height

    print(f"Detected grid: {cols} columns x {rows} rows")

    count = 0
    for row_idx, row_names in enumerate(ICON_NAMES):
        for col_idx, name in enumerate(row_names):
            # Calculate crop box
            left = col_idx * icon_width + padding
            top = row_idx * icon_height + padding
            right = left + icon_width - padding * 2
            bottom = top + icon_height - padding * 2

            # Crop and save
            icon = img.crop((left, top, right, bottom))
            output_path = os.path.join(output_dir, f"{name}.png")
            icon.save(output_path, "PNG")
            print(f"Saved: {name}.png")
            count += 1

    print(f"\nDone! Saved {count} icons to {output_dir}")

if __name__ == "__main__":
    # Paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)

    input_path = os.path.join(project_dir, "src", "assets", "cisco-icons.png")
    output_dir = os.path.join(project_dir, "src", "assets", "icons")

    # Adjust these values based on your sprite sheet
    # You may need to tweak icon_width and icon_height
    split_sprite_sheet(
        input_path=input_path,
        output_dir=output_dir,
        icon_width=100,  # Adjust if needed
        icon_height=100,  # Adjust if needed
        padding=0
    )
