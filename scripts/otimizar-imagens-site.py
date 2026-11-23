#!/usr/bin/env python3
"""Generate responsive WebP thumbnails without changing the original JPG photographs.

Run from the repository root using: python scripts/otimizar-imagens-site.py
Site is deployed from site-vereador/ only. Original JPGs remain linked for photo zoom.
"""
from __future__ import annotations
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
import re
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site-vereador"
NAMES = (
    "ubs-xavier-tomaszewski.jpg",
    "equipamento-carreta-prancha.jpg",
    "equipamento-trator-solis-90.jpg",
    "equipamento-trator-john-deere-5070e.jpg",
)
PAGES = (SITE / "index.html", SITE / "projetos" / "index.html")
VARIANTS: dict[str, list[tuple[int, str]]] = {}
OLD_BYTES = 0
NEW_BYTES = 0
for name in NAMES:
    source = SITE / "assets" / name
    if not source.is_file():
        raise FileNotFoundError(f"Original not found: {source}")
    with Image.open(source) as loaded:
        image = ImageOps.exif_transpose(loaded)
        image.load()
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGB")
        original_width, original_height = image.size
        assert original_width >= 480, f"Image too small: {name}"
        widths = sorted(set(min(original_width, width) for width in (480, 960, 1440)))
        variants: list[tuple[int, str]] = []
        for width in widths:
            resized = image if width == original_width else image.resize(
                (width, round(original_height * width / original_width)),
                Image.Resampling.LANCZOS,
            )
            data = None
            # WebP benefit varies with JPEG source compression; avoid larger assets.
            for quality in (82, 79, 76, 73, 70):
                output = BytesIO()
                resized.save(output, "WEBP", quality=quality, method=6)
                data = output.getvalue()
                if len(data) < source.stat().st_size * 0.97:
                    break
            assert data is not None
            stem = source.stem
            filename = f"{stem}-{width}w.webp"
            (source.parent / filename).write_bytes(data)
            with Image.open(source.parent / filename) as proof:
                assert proof.format == "WEBP"
                assert proof.size[0] == width
            variants.append((width, filename))
            NEW_BYTES += len(data)
        VARIANTS[name] = variants
        OLD_BYTES += source.stat().st_size
        print(f"{name}: original {source.stat().st_size} bytes, variants " +
              ", ".join(f"{w}w={ (source.parent / new).stat().st_size }B" for w, new in variants))

TAG = re.compile(r'<img\b[^>]*\bsrc="(?P<src>[^"]+\.jpg)"[^>]*>', re.IGNORECASE)
for page in PAGES:
    text = page.read_text(encoding="utf-8")
    count = 0

    def replace_tag(match: re.Match[str]) -> str:
        nonlocal_count = None
        src = match.group("src")
        name = Path(src).name
        if name not in VARIANTS:
            return match.group(0)
        prefix = src[:src.rfind("/") + 1]
        srcset = ", ".join(f"{prefix}{file} {w}w" for w, file in VARIANTS[name])
        sizes = "(max-width: 760px) 92vw, 760px" if page.parent.name == "projetos" else "(max-width: 760px) 92vw, (max-width: 1150px) 46vw, 540px"
        return (
            '<picture class="photo-picture">'
            f'<source type="image/webp" srcset="{srcset}" sizes="{sizes}">'
            f'{match.group(0)}'
            '</picture>'
        )

    new_text, count = TAG.subn(replace_tag, text)
    matched = [name for name in NAMES if name in text]
    if count != 4:
        raise AssertionError(f"{page}: expected exactly 4 JPG image tags, found {count}")
    for name in matched:
        if name not in new_text:
            raise AssertionError(f"Missing original JPG fallback {name}")
    if new_text.count('<picture class="photo-picture">') != 4:
        raise AssertionError(f"Expected 4 picture tags in {page}")
    page.write_text(new_text, encoding="utf-8")
    print(f"Updated responsive images in {page.relative_to(ROOT)}: {count}")

marker = "/* V17: imagens responsivas WebP com JPG original como fallback e zoom */"
for style_path in (SITE / "styles.css", SITE / "paginas.css"):
    css = style_path.read_text(encoding="utf-8")
    if marker not in css:
        css += "\n" + marker + "\n.photo-picture{display:block;width:100%}\n.photo-picture>img{display:block;max-width:100%}\n"
        style_path.write_text(css, encoding="utf-8")

sitemap = SITE / "sitemap.xml"
xml = sitemap.read_text(encoding="utf-8")
today = datetime.now(timezone.utc).date().isoformat()
for url in ("https://www.vereadorwagner.com.br/", "https://www.vereadorwagner.com.br/projetos/"):
    rx = re.compile(r"(<url><loc>" + re.escape(url) + r"</loc><lastmod>)(\d{4}-\d{2}-\d{2})(</lastmod></url>)")
    xml, substitutions = rx.subn(lambda m: m.group(1) + today + m.group(3), xml)
    if substitutions != 1:
        raise AssertionError(f"Missing lastmod for {url}")
sitemap.write_text(xml, encoding="utf-8")

assert all((SITE / "assets" / file).is_file() for variants in VARIANTS.values() for _, file in variants)
print(f"Generated {sum(map(len, VARIANTS.values()))} responsive WebP files. {OLD_BYTES} source JPG bytes kept unchanged.")
