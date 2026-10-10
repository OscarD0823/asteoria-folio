from pathlib import Path
from PIL import Image, ImageDraw
root = Path(__file__).resolve().parents[1] / 'public' / 'writer-icons'
root.mkdir(exist_ok=True)
def icon(size):
    im = Image.new('RGBA', (1024,1024), '#edf8f5'); d = ImageDraw.Draw(im)
    d.rounded_rectangle((0,0,1023,1023),radius=280,fill='#edf8f5')
    d.polygon([(256,256),(592,256),(784,448),(784,816),(256,816)],fill='#29695e')
    d.polygon([(592,256),(592,464),(784,464)],fill='#a4e2d4')
    d.polygon([(352,656),(432,448),(592,608),(384,688)],fill='white')
    d.polygon([(432,448),(480,400),(640,560),(592,608)],fill='#e2faf3')
    d.polygon([(352,656),(416,640),(368,592)],fill='#143f36')
    d.line((496,736,672,736),fill='#a4e2d4',width=32)
    return im.resize((size,size),Image.Resampling.LANCZOS)
for size in (192,512): icon(size).save(root / f'prisma-{size}.png')
icon(256).save(root / 'prisma.ico', sizes=[(s,s) for s in (16,24,32,48,64,128,256)])
