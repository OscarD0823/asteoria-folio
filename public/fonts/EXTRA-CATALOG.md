# Additional local fonts

50 real families, 171 font files, 28.38 MiB of font bytes.

Google Fonts default source revision: `bd8f81ddb5c74d5c8897b36ad88b440266245103`. Official static releases
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
`fonttools==4.61.1`. Network access is needed only when reproducing
the catalog, not to use Prisma PDF. `EXTRA.css` and `EXTRA-catalog.json` are
separate from the existing catalog so the additions can be reviewed independently.

## Families

- Arimo: Regular, Bold, Italic, BoldItalic
- Gelasio: Regular, Bold, Italic, BoldItalic
- STIX Two Text: Regular, Bold, Italic, BoldItalic
- EB Garamond: Regular, Bold, Italic, BoldItalic
- Cormorant Garamond: Regular, Bold, Italic, BoldItalic
- Libre Baskerville: Regular, Bold, Italic
- Libre Caslon Text: Regular, Bold, Italic, BoldItalic
- Libre Caslon Display: Regular
- IBM Plex Sans: Regular, Bold, Italic, BoldItalic
- IBM Plex Serif: Regular, Bold, Italic, BoldItalic
- IBM Plex Mono: Regular, Bold, Italic, BoldItalic
- Merriweather: Regular, Bold, Italic, BoldItalic
- Roboto Slab: Regular, Bold
- Raleway: Regular, Bold, Italic, BoldItalic
- Nunito: Regular, Bold, Italic, BoldItalic
- Work Sans: Regular, Bold, Italic, BoldItalic
- Figtree: Regular, Bold, Italic, BoldItalic
- Barlow: Regular, Bold, Italic, BoldItalic
- Inter: Regular, Bold, Italic, BoldItalic
- Oswald: Regular, Bold
- Alegreya: Regular, Bold, Italic, BoldItalic
- Alegreya Sans: Regular, Bold, Italic, BoldItalic
- Crimson Pro: Regular, Bold, Italic, BoldItalic
- Crimson Text: Regular, Bold, Italic, BoldItalic
- Bitter: Regular, Bold, Italic
- Domine: Regular, Bold
- Lora: Regular, Bold, Italic, BoldItalic
- Playfair Display: Regular, Bold, Italic, BoldItalic
- Spectral: Regular, Bold, Italic, BoldItalic
- Vollkorn: Regular, Bold, Italic, BoldItalic
- Gentium Plus: Regular, Bold, Italic, BoldItalic
- Cardo: Regular, Bold, Italic
- Abel: Regular
- Assistant: Regular, Bold
- Asap: Regular, Bold, Italic, BoldItalic
- Cabin: Regular, Bold, Italic, BoldItalic
- DM Serif Text: Regular, Italic
- DM Sans: Regular, Bold, Italic, BoldItalic
- Dosis: Regular, Bold
- Exo 2: Regular, Bold, Italic, BoldItalic
- Inconsolata: Regular, Bold
- Roboto Condensed: Regular, Bold, Italic, BoldItalic
- Quicksand: Regular, Bold
- Rubik: Regular, Bold, Italic, BoldItalic
- Space Grotesk: Regular, Bold
- Sora: Regular, Bold
- Public Sans: Regular, Bold, Italic, BoldItalic
- Red Hat Display: Regular, Bold, Italic, BoldItalic
- Latin Modern Roman: Regular, Bold, Italic, BoldItalic
- Latin Modern Sans: Regular, Bold, Italic, BoldItalic
