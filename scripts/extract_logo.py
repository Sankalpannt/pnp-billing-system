import fitz
from PIL import Image
import os

pdf_path = r'e:\parichiya system\logo\PNP Tech Trader.pdf'
doc = fitz.open(pdf_path)
page = doc[0]

# Render page at 300 dpi
pix = page.get_pixmap(dpi=300, alpha=True)
out_render = r'e:\parichiya system\logo\rendered_page_300dpi.png'
pix.save(out_render)
print(f"Rendered page saved to {out_render} ({pix.width}x{pix.height})")

# Also check embedded images
images = page.get_images(full=True)
print(f"Embedded images: {len(images)}")
for i, img in enumerate(images):
    xref = img[0]
    img_dict = doc.extract_image(xref)
    ext = img_dict['ext']
    w = img_dict['width']
    h = img_dict['height']
    smask = img_dict.get('smask', 0)
    img_filename = f"embedded_img_{i}_{xref}.{ext}"
    img_path = os.path.join(r'e:\parichiya system\logo', img_filename)
    with open(img_path, 'wb') as f:
        f.write(img_dict['image'])
    print(f"Saved {img_path} ({w}x{h}, ext={ext}, smask={smask})")
