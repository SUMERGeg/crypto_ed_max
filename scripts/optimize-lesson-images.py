"""Prepare web lesson images and intrinsic dimensions (requires Pillow)."""
import json
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parents[1]
assets = root / "apps/web/public/assets/lessons"
before = after = 0
for source in sorted((assets / "financial-basics").glob("*.png")):
    target = source.with_suffix(".webp")
    with Image.open(source) as image:
        image.thumbnail((1280, 1280), Image.Resampling.LANCZOS)
        image.save(target, "WEBP", quality=86, method=6)
    before += source.stat().st_size
    after += target.stat().st_size

dimensions = {}
for source in sorted(assets.rglob("*.webp")):
    with Image.open(source) as image:
        dimensions["/assets/lessons/" + source.relative_to(assets).as_posix()] = list(image.size)
(root / "apps/web/src/lesson-image-dimensions.json").write_text(
    json.dumps(dimensions, indent=2) + "\n", encoding="utf-8"
)
print(f"Finance illustrations: {before:,} -> {after:,} bytes ({(1-after/before)*100:.1f}% smaller)")
