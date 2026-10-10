# Noto Sans SC regular: instancia TTF estática

Origen oficial: [bd8f81ddb5c74d5c8897b36ad88b440266245103](https://raw.githubusercontent.com/google/fonts/bd8f81ddb5c74d5c8897b36ad88b440266245103/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf).

Se usa FontTools 4.61.1 (`python -m pip install fonttools==4.61.1`) sólo para regenerar este activo durante el desarrollo. La aplicación distribuye el TTF estático y no necesita Python, FontTools ni acceso al origen remoto.

La licencia OFL reserva el nombre «Source». Esta instancia mantiene «Noto Sans SC», sin emplear ese nombre reservado. Se conserva el copyright original. La única transformación es fijar el eje de peso en 400, quitar las tablas de variación y normalizar los metadatos de familia/estilo. Se conservan los 30.890 puntos de código y los contornos de la instancia oficial.

El OTF estático se descartó porque Fontkit 1.1.1 genera un subconjunto CFF que no muestra correctamente caracteres CJK. Esta instancia TrueType evita el contenedor CFF incompatible y se incrusta completa, porque el subconjunto de esta familia también pierde glifos con Fontkit 1.1.1. Añade aproximadamente 6 MiB al PDF sólo si se usa una fuente CJK. Las otras 97 variantes de fuentes se incrustan por subconjuntos.

Descarga el archivo enlazado como `NotoSansSC-original-variable.ttf` y ejecuta:

```python
from pathlib import Path
import hashlib
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

source = Path("NotoSansSC-original-variable.ttf")
assert hashlib.sha256(source.read_bytes()).hexdigest() == "a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da"
font = TTFont(source, recalcTimestamp=False)
regular = instantiateVariableFont(font, {"wght": 400}, inplace=False, optimize=True)
regular.recalcTimestamp = False
names = {1: "Noto Sans SC", 2: "Regular", 3: "PrismaPDF NotoSansSC 400",
         4: "Noto Sans SC Regular", 6: "NotoSansSC-Regular",
         16: "Noto Sans SC", 17: "Regular"}
for record in list(regular["name"].names):
    if record.nameID in names:
        regular["name"].setName(names[record.nameID], record.nameID,
                                record.platformID, record.platEncID, record.langID)
regular["OS/2"].usWeightClass = 400
regular["OS/2"].fsSelection = (regular["OS/2"].fsSelection & ~0x21) | 0x40
regular["head"].macStyle &= ~0x3
assert "fvar" not in regular and "glyf" in regular and "CFF " not in regular
assert set(regular.getBestCmap()) == set(font.getBestCmap())
regular.save("NotoSansSC-Regular.ttf")
```

El SHA-256 resultante está registrado en `SOURCE.json`. Los timestamps de cabecera se conservan para repetir el resultado.
