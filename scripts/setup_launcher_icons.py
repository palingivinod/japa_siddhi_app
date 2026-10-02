import os
from PIL import Image, ImageDraw

def setup_icons():
    src_path = 'src/assets/images/login_logo.webp'
    src = Image.open(src_path).convert('RGBA')

    densities = {
        'mipmap-mdpi': 48,
        'mipmap-hdpi': 72,
        'mipmap-xhdpi': 96,
        'mipmap-xxhdpi': 144,
        'mipmap-xxxhdpi': 192,
    }

    fg_densities = {
        'mipmap-mdpi': (108, 72),
        'mipmap-hdpi': (162, 108),
        'mipmap-xhdpi': (216, 144),
        'mipmap-xxhdpi': (324, 216),
        'mipmap-xxxhdpi': (432, 288),
    }

    base_res = 'android/app/src/main/res'

    for folder, size in densities.items():
        out_dir = os.path.join(base_res, folder)
        os.makedirs(out_dir, exist_ok=True)
        
        # 1. Standard square/rounded ic_launcher.png
        resized = src.resize((size, size), Image.Resampling.LANCZOS)
        
        mask_square = Image.new('L', (size * 4, size * 4), 0)
        draw_sq = ImageDraw.Draw(mask_square)
        radius = int(size * 4 * 0.18)
        draw_sq.rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=radius, fill=255)
        mask_square = mask_square.resize((size, size), Image.Resampling.LANCZOS)
        
        launcher_sq = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        launcher_sq.paste(resized, (0, 0), mask_square)
        launcher_sq.save(os.path.join(out_dir, 'ic_launcher.png'), 'PNG')
        
        # 2. Circular ic_launcher_round.png
        mask_circle = Image.new('L', (size * 4, size * 4), 0)
        draw_circ = ImageDraw.Draw(mask_circle)
        draw_circ.ellipse([0, 0, size * 4 - 1, size * 4 - 1], fill=255)
        mask_circle = mask_circle.resize((size, size), Image.Resampling.LANCZOS)
        
        launcher_round = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        launcher_round.paste(resized, (0, 0), mask_circle)
        launcher_round.save(os.path.join(out_dir, 'ic_launcher_round.png'), 'PNG')

        # 3. Adaptive Foreground ic_launcher_foreground.png
        canvas_size, logo_size = fg_densities[folder]
        resized_logo = src.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
        fg_canvas = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
        offset = (canvas_size - logo_size) // 2
        fg_canvas.paste(resized_logo, (offset, offset), resized_logo)
        fg_canvas.save(os.path.join(out_dir, 'ic_launcher_foreground.png'), 'PNG')

    # Create mipmap-anydpi-v26 for Android 8+ Adaptive Icons
    anydpi_dir = os.path.join(base_res, 'mipmap-anydpi-v26')
    os.makedirs(anydpi_dir, exist_ok=True)

    adaptive_xml = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background" />\n    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n</adaptive-icon>\n'

    with open(os.path.join(anydpi_dir, 'ic_launcher.xml'), 'w', encoding='utf-8') as f:
        f.write(adaptive_xml)

    with open(os.path.join(anydpi_dir, 'ic_launcher_round.xml'), 'w', encoding='utf-8') as f:
        f.write(adaptive_xml)

    # Create background color in values
    values_dir = os.path.join(base_res, 'values')
    os.makedirs(values_dir, exist_ok=True)

    colors_xml = '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FCFBFC</color>\n</resources>\n'

    with open(os.path.join(values_dir, 'ic_launcher_background.xml'), 'w', encoding='utf-8') as f:
        f.write(colors_xml)

    print('All Android launcher icons and adaptive icon resources generated successfully!')

if __name__ == '__main__':
    setup_icons()
