"""Reproduce Prisma PDF's licensed, local font extension (not a build prerequisite).

Run with Python 3 and fonttools==4.61.1. Download inputs are pinned to an
upstream commit; derived static font names use a Prisma prefix to respect OFL
reserved font names. No system/Microsoft font is copied or redistributed.
"""
from __future__ import annotations

import concurrent.futures
import hashlib
import io
import json
import pathlib
import re
import urllib.parse
import urllib.request
import zipfile

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "fonts"
CACHE = ROOT.parent.parent / ".prisma-toolchain" / "fonts-extension-cache"
REVISION = "bd8f81ddb5c74d5c8897b36ad88b440266245103"
UPSTREAM = f"https://raw.githubusercontent.com/google/fonts/{REVISION}"
FONTTOOLS_VERSION = "4.61.1"
# These families reserve their displayed names. Keep their official, unmodified
# static releases instead of distributing a subset under a reserved name.
ORIGINAL_STATIC_REVISIONS = {
    "LibreBaskerville": "93b0f9ed116d44348bae0e12537e00f9502cc47e",
    "IBMPlexSans": "b5829bab95a0d159d14bc4abc8a88ad578d324f3",
    "Merriweather": "e9263a54d43d89ddcf351c5ae8ab2179f1aebc89",
    "Raleway": "799331018b4fe67a33f1d001d09304b612864568",
    "Bitter": "4bd3c05add902033e8d9e7f0c6258bf67e9a4814",
    "Domine": "b8611166432c039f7019a007d6c67600ea4b27be",
    "Lora": "5d3408b6aca8b7367e232c4900c7b27b2c320466",
    "PlayfairDisplay": "d08233f9c581786e8c834a1f0695a4f27869c119",
    "Quicksand": "d1613dfaf6eeee176319bca34ea2d51307659a1f",
}
FAMILIES = [
    ("Arimo", "Arimo", "sans-serif"),
    ("Gelasio", "Gelasio", "serif"),
    ("STIXTwoText", "STIX Two Text", "serif"),
    ("EBGaramond", "EB Garamond", "serif"),
    ("CormorantGaramond", "Cormorant Garamond", "serif"),
    ("LibreBaskerville", "Libre Baskerville", "serif"),
    ("LibreCaslonText", "Libre Caslon Text", "serif"),
    ("LibreCaslonDisplay", "Libre Caslon Display", "serif"),
    ("IBMPlexSans", "IBM Plex Sans", "sans-serif"),
    ("IBMPlexSerif", "IBM Plex Serif", "serif"),
    ("IBMPlexMono", "IBM Plex Mono", "monospace"),
    ("Merriweather", "Merriweather", "serif"),
    ("RobotoSlab", "Roboto Slab", "serif"),
    ("Raleway", "Raleway", "sans-serif"),
    ("Nunito", "Nunito", "sans-serif"),
    ("WorkSans", "Work Sans", "sans-serif"),
    ("Figtree", "Figtree", "sans-serif"),
    ("Barlow", "Barlow", "sans-serif"),
    ("Inter", "Inter", "sans-serif"),
    ("Oswald", "Oswald", "sans-serif"),
    ("Alegreya", "Alegreya", "serif"),
    ("AlegreyaSans", "Alegreya Sans", "sans-serif"),
    ("CrimsonPro", "Crimson Pro", "serif"),
    ("CrimsonText", "Crimson Text", "serif"),
    ("Bitter", "Bitter", "serif"),
    ("Domine", "Domine", "serif"),
    ("Lora", "Lora", "serif"),
    ("PlayfairDisplay", "Playfair Display", "serif"),
    ("Spectral", "Spectral", "serif"),
    ("Vollkorn", "Vollkorn", "serif"),
    ("GentiumPlus", "Gentium Plus", "serif"),
    ("Cardo", "Cardo", "serif"),
    ("Abel", "Abel", "sans-serif"),
    ("Assistant", "Assistant", "sans-serif"),
    ("Asap", "Asap", "sans-serif"),
    ("Cabin", "Cabin", "sans-serif"),
    ("DMSerifText", "DM Serif Text", "serif"),
    ("DMSans", "DM Sans", "sans-serif"),
    ("Dosis", "Dosis", "sans-serif"),
    ("Exo2", "Exo 2", "sans-serif"),
    ("Inconsolata", "Inconsolata", "monospace"),
    ("RobotoCondensed", "Roboto Condensed", "sans-serif"),
    ("Quicksand", "Quicksand", "sans-serif"),
    ("Rubik", "Rubik", "sans-serif"),
    ("SpaceGrotesk", "Space Grotesk", "sans-serif"),
    ("Sora", "Sora", "sans-serif"),
    ("PublicSans", "Public Sans", "sans-serif"),
    ("RedHatDisplay", "Red Hat Display", "sans-serif"),
]

# Latin, IPA, Greek, Cyrillic, punctuation, scientific symbols and diacritics.
# Other scripts continue to use Prisma PDF's existing Noto fallbacks.
UNICODES = subset.parse_unicodes(
    "U+0000-052F,U+1D00-1FFF,U+2000-27FF,U+2C60-2C7F,U+2DE0-2DFF,"
    "U+A640-A69F,U+A720-A7FF,U+FB00-FB06,U+FEFF"
)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def download(url: str) -> bytes:
    path = CACHE / digest(url.encode())
    if path.exists():
        return path.read_bytes()
    request = urllib.request.Request(url, headers={"User-Agent": "Prisma-PDF-local-font-catalog"})
    with urllib.request.urlopen(request, timeout=90) as response:
        result = response.read()
    path.write_bytes(result)
    return result


def text_field(block: str, name: str, default: str = "") -> str:
    match = re.search(rf'\b{name}:\s*"([^"]+)"', block)
    return match[1] if match else default


def fetch_google(family: tuple[str, str, str]) -> dict:
    key, label, category = family
    folder = key.lower()
    license_kind = "apache" if key == "RobotoSlab" else "ofl"
    revision = ORIGINAL_STATIC_REVISIONS.get(key, REVISION)
    upstream = f"https://raw.githubusercontent.com/google/fonts/{revision}"
    base = f"{upstream}/{license_kind}/{folder}/"
    metadata_url = base + "METADATA.pb"
    metadata_bytes = download(metadata_url)
    metadata = metadata_bytes.decode("utf-8")
    blocks = re.findall(r"fonts\s*\{([^{}]*)\}", metadata, flags=re.S)
    sources = []
    for block in blocks:
        filename = text_field(block, "filename")
        if not filename:
            continue
        weight = re.search(r"\bweight:\s*(\d+)", block)
        url = base + urllib.parse.quote(filename)
        data = download(url)
        sources.append({"filename": filename, "weight": int(weight[1]) if weight else 400,
                        "style": text_field(block, "style", "normal"), "url": url,
                        "sha256": digest(data), "data": data})
    license_url = base + ("LICENSE.txt" if license_kind == "apache" else "OFL.txt")
    license_bytes = download(license_url)
    expected = b"APACHE LICENSE" if license_kind == "apache" else b"SIL OPEN FONT LICENSE"
    if expected not in license_bytes.upper():
        raise ValueError(f"Unexpected license for {key}")
    if not sources:
        raise ValueError(f"No fonts for {key}")
    return {"key": key, "label": label, "category": category, "sources": sources,
            "metadata_url": metadata_url, "metadata_sha256": digest(metadata_bytes),
            "license_url": license_url, "license_bytes": license_bytes,
            "revision": revision,
            "license": "Apache-2.0" if license_kind == "apache" else "OFL-1.1"}


def rename(font: TTFont, key: str, label: str, style: str) -> None:
    # Avoid using any reserved upstream family or PostScript name in a derivative.
    names = {1: "Prisma " + label, 2: style, 3: f"Prisma-{key}-{style}-4.1",
             4: f"Prisma {label} {style}", 6: f"Prisma{key}-{style}",
             16: "Prisma " + label, 17: style}
    table = font["name"]
    for record in table.names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding(), errors="replace")
    for name_id, value in names.items():
        table.setName(value, name_id, 3, 1, 0x409)


def synchronize_style(font: TTFont, style: str) -> None:
    bold, italic = "Bold" in style, "Italic" in style
    if "OS/2" in font:
        metrics = font["OS/2"]
        metrics.usWeightClass = 700 if bold else 400
        metrics.fsSelection &= ~((1 << 0) | (1 << 5) | (1 << 6))
        metrics.fsSelection |= (1 if italic else 0) | (32 if bold else 0) | (64 if not (bold or italic) else 0)
    font["head"].macStyle &= ~3
    font["head"].macStyle |= (1 if bold else 0) | (2 if italic else 0)


def derive(source: dict, key: str, label: str, style: str) -> tuple[bytes, dict]:
    font = TTFont(io.BytesIO(source["data"]), recalcTimestamp=False)
    pins = {}
    if "fvar" in font:
        for axis in font["fvar"].axes:
            value = axis.defaultValue
            if axis.axisTag == "wght":
                value = 700 if "Bold" in style else 400
            elif axis.axisTag == "opsz":
                value = 12  # body text optical size
            elif axis.axisTag == "ital":
                value = 1 if "Italic" in style else 0
            pins[axis.axisTag] = min(axis.maxValue, max(axis.minValue, value))
        font = instantiateVariableFont(font, pins, inplace=True)
    rename(font, key, label, style)
    synchronize_style(font, style)
    options = subset.Options()
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.notdef_glyph = True
    options.notdef_outline = True
    options.recommended_glyphs = True
    options.recalc_timestamp = False
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=UNICODES)
    sub.subset(font)
    # Normalize timestamps; source licenses/copyright metadata are retained.
    font["head"].modified = font["head"].created
    destination = io.BytesIO()
    font.save(destination, reorderTables=True)
    data = destination.getvalue()
    cmap = font.getBestCmap()
    missing = sorted(set(ord(c) for c in "Español áéíóúüñ ¿¡ 0123456789") - set(cmap))
    if missing:
        raise ValueError(f"Essential glyphs missing in {key}/{style}: {missing}")
    return data, {"axisInstances": pins, "glyphCount": len(font.getGlyphOrder()),
                  "unicodeCount": len(cmap), "sha256": digest(data), "bytes": len(data)}


def process_google(item: dict) -> dict:
    key, label, category = item["key"], item["label"], item["category"]
    destination = OUT / key
    destination.mkdir(exist_ok=True)
    previous = None
    if (destination / "SOURCE.json").exists():
        previous = json.loads((destination / "SOURCE.json").read_text(encoding="utf-8"))
    (destination / "LICENSE.txt").write_bytes(item["license_bytes"])
    styles, outputs = {}, []
    for style in ("Regular", "Bold", "Italic", "BoldItalic"):
        italic = "Italic" in style
        target_weight = 700 if "Bold" in style else 400
        candidates = [source for source in item["sources"]
                      if (source["style"] == "italic") == italic]
        if not candidates:
            continue
        chosen = None
        for source in candidates:
            font = TTFont(io.BytesIO(source["data"]), lazy=True)
            axis = next((a for a in font["fvar"].axes if a.axisTag == "wght"), None) if "fvar" in font else None
            if axis and axis.minValue <= target_weight <= axis.maxValue:
                chosen = source
                break
            if source["weight"] == target_weight:
                chosen = source
                break
        if chosen is None:
            continue  # Don't invent a weight/style that the upstream does not supply.
        original = TTFont(io.BytesIO(chosen["data"]), lazy=True)
        if "fvar" not in original:
            data = chosen["data"]
            info = {"axisInstances": {}, "glyphCount": len(original.getGlyphOrder()),
                    "unicodeCount": len(original.getBestCmap()), "sha256": digest(data),
                    "bytes": len(data), "derivation": "None: unmodified official static font."}
        else:
            old_output = next((entry for entry in (previous or {}).get("outputs", []) if entry["style"] == style), None)
            old_input = next((entry for entry in (previous or {}).get("inputs", []) if entry["filename"] == chosen["filename"]), None)
            cached_path = destination / f"{key}-{style}.ttf"
            if (old_output and old_input and old_input["sha256"] == chosen["sha256"]
                    and cached_path.exists() and digest(cached_path.read_bytes()) == old_output["sha256"]):
                cached_font = TTFont(cached_path, recalcTimestamp=False)
                synchronize_style(cached_font, style)
                buffer = io.BytesIO()
                cached_font.save(buffer, reorderTables=True)
                data = buffer.getvalue()
                info = {"axisInstances": old_output["axisInstances"],
                        "glyphCount": len(cached_font.getGlyphOrder()), "unicodeCount": len(cached_font.getBestCmap()),
                        "sha256": digest(data), "bytes": len(data)}
            else:
                data, info = derive(chosen, key, label, style)
            info["derivation"] = "Static instance and Unicode subset; Prisma internal names."
        filename = f"{key}-{style}.ttf"
        (destination / filename).write_bytes(data)
        styles[style] = f"{key}/{filename}"
        outputs.append({"file": filename, "style": style, "sourceFile": chosen["filename"], **info})
    provenance = {"family": label, "license": item["license"], "upstream": "https://github.com/google/fonts",
                  "revision": item["revision"], "metadataUrl": item["metadata_url"],
                  "metadataSha256": item["metadata_sha256"], "licenseUrl": item["license_url"],
                  "licenseSha256": digest(item["license_bytes"]), "fonttoolsVersion": FONTTOOLS_VERSION,
                  "derivation": "Unmodified official static faces where supplied; other faces are static 400/700 instances, optical size 12 where available, Unicode subset and Prisma internal names. All fonts retaining their reserved displayed names use unmodified static releases. Original copyright and license retained.",
                  "unicodeRanges": "0000-052F,1D00-1FFF,2000-27FF,2C60-2C7F,2DE0-2DFF,A640-A69F,A720-A7FF,FB00-FB06,FEFF",
                  "inputs": [{k: v for k, v in source.items() if k != "data"} for source in item["sources"]],
                  "outputs": outputs}
    expected_files = {output["file"] for output in outputs}
    for stale in destination.glob(f"{key}-*.ttf"):
        if stale.name not in expected_files:
            stale.unlink()  # Only stale files created by this script, never a directory.
    (destination / "SOURCE.json").write_text(json.dumps(provenance, indent=2) + "\n", encoding="utf-8")
    return {"value": key, "label": label, "category": category, "css": f"{key}, {category}",
            "styles": styles, "fallback": False}


def latin_modern() -> list[dict]:
    url = "https://mirrors.ctan.org/fonts/lm.zip"
    archive = download(url)
    if digest(archive) != "71c48809cb50fbfe09c8eddaa251398957c7b243acdf69f7f807268f0d42c939":
        raise ValueError("CTAN Latin Modern archive differs from the reviewed 2.005 archive")
    bundle = zipfile.ZipFile(io.BytesIO(archive))
    license_path = next(name for name in bundle.namelist() if name.upper().endswith("GUST-FONT-LICENSE.TXT"))
    license_bytes = bundle.read(license_path)
    families = [
        ("LatinModernRoman", "Latin Modern Roman", "serif", {
            "Regular": "lmroman10-regular.otf", "Bold": "lmroman10-bold.otf",
            "Italic": "lmroman10-italic.otf", "BoldItalic": "lmroman10-bolditalic.otf"}),
        ("LatinModernSans", "Latin Modern Sans", "sans-serif", {
            "Regular": "lmsans10-regular.otf", "Bold": "lmsans10-bold.otf",
            "Italic": "lmsans10-oblique.otf", "BoldItalic": "lmsans10-boldoblique.otf"}),
    ]
    result = []
    for key, label, category, filenames in families:
        destination = OUT / key
        destination.mkdir(exist_ok=True)
        (destination / "LICENSE.txt").write_bytes(license_bytes)
        styles, outputs = {}, []
        for style, filename in filenames.items():
            path = next(name for name in bundle.namelist() if name.endswith("/" + filename))
            data = bundle.read(path)  # Keep GUST files unmodified and named as upstream.
            (destination / filename).write_bytes(data)
            styles[style] = f"{key}/{filename}"
            outputs.append({"file": filename, "style": style, "archivePath": path,
                            "sha256": digest(data), "bytes": len(data)})
        source = {"family": label, "license": "GUST Font License", "version": "2.005",
                  "upstream": "https://www.gust.org.pl/projects/e-foundry/latin-modern",
                  "packageUrl": "https://ctan.org/pkg/lm", "archiveUrl": url,
                  "archiveSha256": digest(archive), "licenseSha256": digest(license_bytes),
                  "derivation": "None: original OpenType files from Latin Modern 2.005.",
                  "outputs": outputs}
        (destination / "SOURCE.json").write_text(json.dumps(source, indent=2) + "\n", encoding="utf-8")
        result.append({"value": key, "label": label, "category": category, "css": f"{key}, {category}",
                       "styles": styles, "fallback": False})
    return result


def write_catalog(catalog: list[dict]) -> None:
    (OUT / "EXTRA-catalog.json").write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    ts = 'import type { FontFamily } from "./fonts";\n\n'
    ts += '// Licensed local additions. SOURCE.json in each family records derivation and hashes.\n'
    ts += 'export const extraFontFamilies: FontFamily[] = ' + json.dumps(catalog, indent=2) + ';\n'
    (ROOT / "src" / "extra-fonts.ts").write_text(ts, encoding="utf-8")
    css = ["/* Licensed local fonts. See EXTRA-CATALOG.md and family SOURCE.json. */"]
    for family in catalog:
        for style, path in family["styles"].items():
            css.append('@font-face {\n  font-family: "' + family["value"] + '";\n  src: url("./' + path
                       + '") format("' + ("opentype" if path.endswith(".otf") else "truetype") + '");\n'
                       + '  font-weight: ' + ("700" if "Bold" in style else "400") + ';\n'
                       + '  font-style: ' + ("italic" if "Italic" in style else "normal") + ';\n'
                       + '  font-display: swap;\n}')
    (OUT / "EXTRA.css").write_text("\n\n".join(css) + "\n", encoding="utf-8")
    total = sum((OUT / path).stat().st_size for family in catalog for path in family["styles"].values())
    counts = sum(len(family["styles"]) for family in catalog)
    notes = f"""# Additional local fonts

{len(catalog)} real families, {counts} font files, {total / 1024 / 1024:.2f} MiB of font bytes.

Google Fonts default source revision: `{REVISION}`. Official static releases
with reserved names retain their original bytes and use the family-specific
revision recorded in `SOURCE.json`. Every family includes its complete
upstream license and `SOURCE.json` with source/output SHA-256, URLs, variable
axis coordinates and glyph counts. Latin Modern comes unmodified from the
official CTAN Latin Modern 2.005 archive under the GUST Font License.

Official static faces are kept unmodified. Remaining variable TTF files are
static 400/700 instances where the upstream supplies these weights, with real
italic styles where available. Body optical size is 12 for fonts with `opsz`;
other axes use their default. Their Latin/Greek/Cyrillic and symbol repertoire
is documented in the source records. Existing Noto families retain wider-script
fallbacks. Derived internal family/PostScript names have a Prisma prefix and
do not use a reserved name; copyright and license metadata remain. Every
family retaining its original reserved displayed name uses original static
files. No commercial Microsoft font is redistributed.

Arimo is a metric-compatible Arial alternative; Gelasio is a metric-compatible
Georgia alternative. Latin Modern Roman is based on Computer Modern. These
families remain labelled by their actual names, never as Microsoft originals.
An institution requiring an exact proprietary family can use a licensed
user-provided font instead. Typeface choice alone does not certify a complete
APA, IEEE or institutional paper format.

Reproduction: `scripts/extend-font-catalog.py` with Python and
`fonttools=={FONTTOOLS_VERSION}`. Network access is needed only when reproducing
the catalog, not to use Prisma PDF. `EXTRA.css` and `EXTRA-catalog.json` are
separate from the existing catalog so the additions can be reviewed independently.

## Families

"""
    notes += "\n".join(f"- {family['label']}: {', '.join(family['styles'])}" for family in catalog) + "\n"
    (OUT / "EXTRA-CATALOG.md").write_text(notes, encoding="utf-8")
    print(json.dumps({"families": len(catalog), "files": counts, "bytes": total, "MiB": total / 1024 / 1024}), flush=True)


def main() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        fetched = list(pool.map(fetch_google, FAMILIES))
    print(f"Downloaded {len(fetched)} Google Fonts families", flush=True)
    catalog = []
    with concurrent.futures.ProcessPoolExecutor(max_workers=2) as pool:
        for family in pool.map(process_google, fetched):
            catalog.append(family)
            print(f"Prepared {family['label']} ({len(family['styles'])} real styles)", flush=True)
    catalog.extend(latin_modern())
    write_catalog(catalog)


if __name__ == "__main__":
    main()
