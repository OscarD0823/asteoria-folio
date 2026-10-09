from pathlib import Path
import pypdfium2 as pdfium
from pypdf import PdfReader

root = Path(__file__).resolve().parent.parent
qa = root / 'qa'
reader = PdfReader(qa / 'browser-export.pdf')
assert len(reader.pages) == 3
assert reader.pages[0].get('/Rotate') == 90
assert 'Revisado en Prisma PDF' in reader.pages[0].extract_text()
doc = pdfium.PdfDocument(qa / 'rotations.pdf')
for i in range(len(doc)):
    base_angle = (i // 4) * 90
    delta = (i % 4) * 90
    width, height = (340, 430) if base_angle % 180 == 0 else (430, 340)
    x, y = 75, 52.5
    if delta == 90: x, y = height - y, x
    elif delta == 180: x, y = width - x, height - y
    elif delta == 270: x, y = y, width - x
    image = doc[i].render(scale=1).to_pil().convert('RGB')
    red, green, blue = image.getpixel((round(x), round(y)))
    assert red > 240 and 160 < green < 210 and 160 < blue < 210, (i, x, y, red, green, blue)
print('PASS: 16 rotations/crop-box combinations render at the expected coordinates.')
print('PASS: browser export retains page count, rotation and added Spanish text.')
