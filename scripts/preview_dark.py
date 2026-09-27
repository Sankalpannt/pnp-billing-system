from PIL import Image
import numpy as np

emblem = Image.open(r'e:\parichiya system\logo\emblem_transparent.png').convert('RGBA')

# 1. Composite emblem directly on slate-900 (#0f172a)
bg_dark = Image.new('RGBA', emblem.size, (15, 23, 42, 255))
comp1 = Image.alpha_composite(bg_dark, emblem)
comp1.resize((500, 500)).save(r'e:\parichiya system\logo\preview_on_dark_transparent.png')

# 2. Composite with shield filled with pure white (so camera pops on white shield)
# Flood fill inside shield
# In original cropped bgr emblem, inside shield is white.
# If we flood fill outside, outside is transparent, but inside shield is white!
var2 = Image.open(r'e:\parichiya system\logo\rendered_page_300dpi.png').convert('RGBA')
arr = np.array(var2)
# Let's crop emblem region
is_non_white = (arr[:, :, 0] < 250) | (arr[:, :, 1] < 250) | (arr[:, :, 2] < 250)
coords = np.argwhere(is_non_white)
y0, x0 = coords.min(axis=0)
y1, x1 = coords.max(axis=0)

cropped = arr[y0:y0+1800, x0:x1]
# Flood fill corners with alpha 0
import cv2
h, w = cropped.shape[:2]
mask = np.zeros((h+2, w+2), np.uint8)
cv_bgr = cv2.cvtColor(cropped, cv2.COLOR_RGBA2BGR)
# Flood fill from corners (0,0), (0, w-1), (h-1, 0), (h-1, w-1)
cv2.floodFill(cv_bgr, mask, (0, 0), (0, 255, 0), (5, 5, 5), (5, 5, 5))
cv2.floodFill(cv_bgr, mask, (w-1, 0), (0, 255, 0), (5, 5, 5), (5, 5, 5))
cv2.floodFill(cv_bgr, mask, (0, h-1), (0, 255, 0), (5, 5, 5), (5, 5, 5))
cv2.floodFill(cv_bgr, mask, (w-1, h-1), (0, 255, 0), (5, 5, 5), (5, 5, 5))

is_outside = mask[1:-1, 1:-1] == 1
cropped_with_white_shield = cropped.copy()
cropped_with_white_shield[is_outside, 3] = 0

img_white_shield = Image.fromarray(cropped_with_white_shield)
bg_dark2 = Image.new('RGBA', img_white_shield.size, (15, 23, 42, 255))
comp2 = Image.alpha_composite(bg_dark2, img_white_shield)
comp2.resize((500, 500)).save(r'e:\parichiya system\logo\preview_on_dark_white_shield.png')

print("Dark previews generated!")
