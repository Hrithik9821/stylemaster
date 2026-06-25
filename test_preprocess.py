import easyocr
import numpy as np
from PIL import Image, ImageOps, ImageEnhance
import os

reader = easyocr.Reader(['en'], gpu=False)
fpath = r"C:\Users\Operations1\.gemini\antigravity\scratch\jewelry_bulk_importer\uploads\6acbb9895051.png"

# 1. Standard OCR (already failed)
# 2. Preprocessed OCR (Resize 2x + Grayscale)
with Image.open(fpath) as img:
    w, h = img.size
    # Resize 2x
    img_large = img.resize((w * 2, h * 2), Image.Resampling.LANCZOS)
    # Convert to grayscale
    img_gray = img_large.convert('L')
    # Enhance contrast
    enhancer = ImageEnhance.Contrast(img_gray)
    img_enhanced = enhancer.enhance(2.0)
    
    # Save temp
    temp_path = "temp_preprocessed.png"
    img_enhanced.save(temp_path)

print("Running OCR on preprocessed image...")
results = reader.readtext(temp_path)

# Clean up temp
if os.path.exists(temp_path):
    os.remove(temp_path)

items = []
for bbox, text, conf in results:
    # Scale coordinates back to original size (divided by 2)
    xs = [pt[0] / 2.0 for pt in bbox]
    ys = [pt[1] / 2.0 for pt in bbox]
    cx = sum(xs) / 4.0
    cy = sum(ys) / 4.0
    h_val = max(ys) - min(ys)
    w_val = max(xs) - min(xs)
    items.append({
        "text": text.strip(),
        "cx": cx,
        "cy": cy,
        "h": h_val,
        "w": w_val
    })

items.sort(key=lambda x: x['cy'])
rows = []
for item in items:
    placed = False
    for r in rows:
        avg_cy = sum(x['cy'] for x in r) / len(r)
        if abs(item['cy'] - avg_cy) < 15:
            r.append(item)
            placed = True
            break
    if not placed:
        rows.append([item])

for r in rows:
    r.sort(key=lambda x: x['cx'])

print("=== Preprocessed Grouped Rows ===")
for idx, r in enumerate(rows):
    row_text = " | ".join([f"{x['text']} (x={int(x['cx'])}, y={int(x['cy'])})" for x in r])
    print(f"Row {idx+1}: {row_text}")
