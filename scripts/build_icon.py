from pathlib import Path
from PIL import Image, ImageDraw


SIZE = 512
root = Path(__file__).resolve().parent.parent
assets = root / "assets"
assets.mkdir(parents=True, exist_ok=True)

image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)

draw.rounded_rectangle((20, 20, 492, 492), radius=128, fill="#0B1512", outline="#29453B", width=4)
draw.arc((106, 106, 406, 406), start=38, end=342, fill="#29493E", width=44)
draw.arc((106, 106, 406, 406), start=92, end=310, fill="#55E6AD", width=44)
draw.ellipse((190, 190, 322, 322), fill="#10221C", outline="#55E6AD", width=12)
draw.line((301, 301, 381, 381), fill="#FFCA70", width=28)
draw.ellipse((286, 286, 316, 316), fill="#FFCA70")
draw.ellipse((366, 366, 396, 396), fill="#FFCA70")

png_path = assets / "icon.png"
ico_path = assets / "icon.ico"
image.save(png_path, "PNG")
image.save(ico_path, "ICO", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

print(png_path)
print(ico_path)
