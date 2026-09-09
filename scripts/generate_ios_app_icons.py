from PIL import Image
from pathlib import Path
import json

out_dir = Path('ios/JapaSiddhi/Images.xcassets/AppIcon.appiconset')
out_dir.mkdir(parents=True, exist_ok=True)

logo = Image.open('src/assets/images/login_logo.webp').convert('RGBA')


def make_icon(size: int) -> Image.Image:
    # App Store 1024 must be opaque (no transparency)
    bg = Image.new('RGBA', (size, size), (255, 248, 234, 255))
    pad = int(size * 0.10)
    target = size - pad * 2
    scaled = logo.copy()
    scaled.thumbnail((target, target), Image.Resampling.LANCZOS)
    x = (size - scaled.width) // 2
    y = (size - scaled.height) // 2
    bg.paste(scaled, (x, y), scaled)
    return bg.convert('RGB')


sizes = {
    'Icon-20@2x.png': 40,
    'Icon-20@3x.png': 60,
    'Icon-29@2x.png': 58,
    'Icon-29@3x.png': 87,
    'Icon-40@2x.png': 80,
    'Icon-40@3x.png': 120,
    'Icon-60@2x.png': 120,
    'Icon-60@3x.png': 180,
    'Icon-1024.png': 1024,
}

for name, px in sizes.items():
    make_icon(px).save(out_dir / name, format='PNG', optimize=True)
    print(f'wrote {name} {px}x{px}')

contents = {
    'images': [
        {'filename': 'Icon-20@2x.png', 'idiom': 'iphone', 'scale': '2x', 'size': '20x20'},
        {'filename': 'Icon-20@3x.png', 'idiom': 'iphone', 'scale': '3x', 'size': '20x20'},
        {'filename': 'Icon-29@2x.png', 'idiom': 'iphone', 'scale': '2x', 'size': '29x29'},
        {'filename': 'Icon-29@3x.png', 'idiom': 'iphone', 'scale': '3x', 'size': '29x29'},
        {'filename': 'Icon-40@2x.png', 'idiom': 'iphone', 'scale': '2x', 'size': '40x40'},
        {'filename': 'Icon-40@3x.png', 'idiom': 'iphone', 'scale': '3x', 'size': '40x40'},
        {'filename': 'Icon-60@2x.png', 'idiom': 'iphone', 'scale': '2x', 'size': '60x60'},
        {'filename': 'Icon-60@3x.png', 'idiom': 'iphone', 'scale': '3x', 'size': '60x60'},
        {'filename': 'Icon-1024.png', 'idiom': 'ios-marketing', 'scale': '1x', 'size': '1024x1024'},
    ],
    'info': {'author': 'xcode', 'version': 1},
}
(out_dir / 'Contents.json').write_text(json.dumps(contents, indent=2) + '\n', encoding='utf-8')
print('Contents.json updated')
print('files:', sorted(p.name for p in out_dir.iterdir()))
