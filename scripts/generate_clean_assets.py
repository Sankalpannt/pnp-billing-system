import cv2
import numpy as np
from PIL import Image
import os

pdf_render = r'e:\parichiya system\logo\rendered_page_300dpi.png'
img_bgr = cv2.imread(pdf_render)
h, w = img_bgr.shape[:2]

# 1. Bounding box detection
gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
# Non-white mask (anything darker than 250)
mask_nonwhite = gray < 250

coords = np.column_stack(np.where(mask_nonwhite))
y0, x0 = coords.min(axis=0)
y1, x1 = coords.max(axis=0)

# Padding
pad = 40
y0_crop = max(0, y0 - pad)
y1_crop = min(h, y1 + pad)
x0_crop = max(0, x0 - pad)
x1_crop = min(w, x1 + pad)

cropped_bgr = img_bgr[y0_crop:y1_crop, x0_crop:x1_crop]
ch, cw = cropped_bgr.shape[:2]

# Let's find the split between the shield emblem and the "PNP TECH" text
# Let's project non-white pixels horizontally
row_density = np.sum(mask_nonwhite[y0_crop:y1_crop, x0_crop:x1_crop], axis=1)

# Find the valley between shield (top) and text (bottom)
# Shield is roughly top 55-65%, text is bottom 35-45%
mid_start = int(ch * 0.50)
mid_end = int(ch * 0.70)
valley_y = mid_start + np.argmin(row_density[mid_start:mid_end])
print(f"Valley between shield and text found at y={valley_y} (total height {ch})")

# Emblem bounding box:
emblem_bgr = cropped_bgr[0:valley_y, :]
# Trim emblem
emblem_gray = cv2.cvtColor(emblem_bgr, cv2.COLOR_BGR2GRAY)
emblem_mask = emblem_gray < 250
ey_coords = np.column_stack(np.where(emblem_mask))
ey0, ex0 = ey_coords.min(axis=0)
ey1, ex1 = ey_coords.max(axis=0)
epad = 30
ey0 = max(0, ey0 - epad)
ey1 = min(emblem_bgr.shape[0], ey1 + epad)
ex0 = max(0, ex0 - epad)
ex1 = min(emblem_bgr.shape[1], ex1 + epad)
emblem_bgr = emblem_bgr[ey0:ey1, ex0:ex1]

# Function to create clean transparent RGBA from BGR on white
def make_transparent(bgr_img, threshold=252):
    # Convert BGR to RGB
    rgb = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2RGB).astype(np.float32)
    # Calculate distance from white (255, 255, 255)
    # Max component distance
    dist = 255.0 - np.min(rgb, axis=2)
    
    # Smooth alpha ramp
    alpha = np.clip((dist - 3.0) / 22.0 * 255.0, 0, 255)
    
    # Unmultiply white background to avoid dark/white halos
    a_norm = (alpha / 255.0)[:, :, np.newaxis]
    unmatted_rgb = np.where(a_norm > 0.05, (rgb - (1.0 - a_norm) * 255.0) / np.maximum(a_norm, 0.05), rgb)
    unmatted_rgb = np.clip(unmatted_rgb, 0, 255).astype(np.uint8)
    
    rgba = np.dstack([unmatted_rgb, alpha.astype(np.uint8)])
    return rgba

# Generate full logo transparent
full_transparent = make_transparent(cropped_bgr)
Image.fromarray(full_transparent).save(r'e:\parichiya system\logo\full_logo_transparent.png')

# Generate full logo white background
Image.fromarray(cv2.cvtColor(cropped_bgr, cv2.COLOR_BGR2RGB)).save(r'e:\parichiya system\logo\full_logo_white_bg.jpg', quality=98)

# Generate emblem transparent
emblem_transparent = make_transparent(emblem_bgr)
# Make emblem square with padding
eh, ew = emblem_transparent.shape[:2]
max_dim = max(eh, ew) + 40
square_emblem = np.zeros((max_dim, max_dim, 4), dtype=np.uint8)
oy = (max_dim - eh) // 2
ox = (max_dim - ew) // 2
square_emblem[oy:oy+eh, ox:ox+ew] = emblem_transparent
Image.fromarray(square_emblem).save(r'e:\parichiya system\logo\emblem_transparent.png')

print("Assets generated successfully!")
