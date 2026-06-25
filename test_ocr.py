import easyocr
import json
import numpy as np

reader = easyocr.Reader(['en'], gpu=False)
fpath = r"C:\Users\Operations1\.gemini\antigravity\scratch\jewelry_bulk_importer\uploads\9617416fca2d.jpg"
results = reader.readtext(fpath)

# Print raw OCR items sorted by y center
items = []
for bbox, text, conf in results:
    # Get center coordinates
    xs = [pt[0] for pt in bbox]
    ys = [pt[1] for pt in bbox]
    cx = sum(xs) / 4.0
    cy = sum(ys) / 4.0
    h = max(ys) - min(ys)
    w = max(xs) - min(xs)
    items.append({
        "text": text.strip(),
        "cx": cx,
        "cy": cy,
        "h": h,
        "w": w,
        "bbox": bbox
    })

# Group items into rows if their cy difference is small
items.sort(key=lambda x: x['cy'])
rows = []
for item in items:
    # Find if there is an existing row with similar cy
    placed = False
    for r in rows:
        # If cy is within 12 pixels (or half of the height)
        avg_cy = sum(x['cy'] for x in r) / len(r)
        if abs(item['cy'] - avg_cy) < 15:
            r.append(item)
            placed = True
            break
    if not placed:
        rows.append([item])

# Sort items within each row from left to right (x coordinate)
for r in rows:
    r.sort(key=lambda x: x['cx'])

print("=== Grouped Rows ===")
for idx, r in enumerate(rows):
    row_text = " | ".join([f"{x['text']} (x={int(x['cx'])}, y={int(x['cy'])})" for x in r])
    print(f"Row {idx+1}: {row_text}")
