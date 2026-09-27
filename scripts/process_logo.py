import numpy as np
from PIL import Image
from collections import deque

def create_variants():
    img = Image.open(r'e:\parichiya system\logo\rendered_page_300dpi.png').convert('RGBA')
    arr = np.array(img)
    H, W = arr.shape[:2]

    # Crop to bounding box with padding
    is_non_white = (arr[:, :, 0] < 250) | (arr[:, :, 1] < 250) | (arr[:, :, 2] < 250)
    coords = np.argwhere(is_non_white)
    y0, x0 = coords.min(axis=0)
    y1, x1 = coords.max(axis=0)
    
    pad = 60
    y0 = max(0, y0 - pad)
    y1 = min(H, y1 + pad)
    x0 = max(0, x0 - pad)
    x1 = min(W, x1 + pad)
    
    cropped = arr[y0:y1, x0:x1].copy()
    h, w = cropped.shape[:2]
    
    # 1. Variant 1: Pure transparent background
    var1 = cropped.copy()
    diff = 255.0 - np.minimum(var1[:, :, 0], np.minimum(var1[:, :, 1], var1[:, :, 2]))
    alpha = np.clip((diff - 4.0) / 25.0 * 255.0, 0, 255).astype(np.uint8)
    var1[:, :, 3] = alpha
    
    alpha_norm = alpha.astype(float) / 255.0
    for c in range(3):
        col = var1[:, :, c].astype(float)
        unmatted = np.where(alpha_norm > 0.05, (col - (1.0 - alpha_norm) * 255.0) / np.maximum(alpha_norm, 0.05), col)
        var1[:, :, c] = np.clip(unmatted, 0, 255).astype(np.uint8)
        
    img_var1 = Image.fromarray(var1)
    img_var1.save(r'e:\parichiya system\logo\variant_transparent_all.png')
    
    # 2. Variant 2: Outside transparent, inside shield white
    is_white_bg = (cropped[:, :, 0] > 248) & (cropped[:, :, 1] > 248) & (cropped[:, :, 2] > 248)
    visited = np.zeros((h, w), dtype=bool)
    q = deque()
    
    for x in range(w):
        if is_white_bg[0, x]: q.append((0, x)); visited[0, x] = True
        if is_white_bg[h-1, x]: q.append((h-1, x)); visited[h-1, x] = True
    for y in range(h):
        if is_white_bg[y, 0]: q.append((y, 0)); visited[y, 0] = True
        if is_white_bg[y, w-1]: q.append((y, w-1)); visited[y, w-1] = True
        
    while q:
        cy, cx = q.popleft()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and is_white_bg[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))
                
    var2 = cropped.copy()
    # Apply soft edge to visited mask
    var2[visited, 3] = 0
    img_var2 = Image.fromarray(var2)
    img_var2.save(r'e:\parichiya system\logo\variant_white_inside_shield.png')

    # 3. Clean full logo with white background cropped
    img_white = Image.fromarray(cropped[:, :, :3])
    img_white.save(r'e:\parichiya system\logo\variant_white_bg.png')

    print("Variants created successfully!")

if __name__ == '__main__':
    create_variants()
