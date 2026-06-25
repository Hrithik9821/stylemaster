import re

path = r"C:\Users\Operations1\.gemini\antigravity\scratch\jewelry_bulk_importer\core.py"
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

old = ("    base = re.sub(r'_[a-f0-9]{4}\n"
       "            if not row_texts:\n"
       "                continue\n"
       "            first_text = row_texts[0].strip().lower()\n"
       "            if not first_text or first_text == \"-\" or first_text in SKIP_KEYWORDS:\n"
       "                continue\n"
       '            if "total" in first_text:\n'
       "                break\n"
       '            if all(t.strip() in ("-", "", ".") for t in row_texts):\n'
       "                continue\n"
       "\n"
       "            col_data_lists = {k: [] for k in header_cx.keys()}\n"
       "            for item in r:\n"
       "                closest_key = min(header_cx.keys(), key=lambda k: abs(item['cx'] - header_cx[k]))\n"
       "                col_data_lists[closest_key].append(item)\n"
       "            \n"
       "            col_data = {}\n"
       "            for k, items_list in col_data_lists.items():\n"
       "                items_list.sort(key=lambda x: x['cx'])\n"
       '                col_data[k] = " ".join([x[\'text\'] for x in items_list]).strip()\n'
       "\n"
       '            gem_type = col_data.get("GemType", "").strip()\n'
       '            shape    = col_data.get("Shape",   "").strip()\n'
       "            \n"
       "            # Skip empty, placeholder, or unrecognized gem types\n"
       '            if not gem_type or gem_type == "-":\n'
       "                continue\n"
       "            \n"
       "            # Validate this is actually a stone type before processing\n"
       "            item_code_check = map_gem_item_code(gem_type, shape)\n"
       "            if item_code_check is None:\n"
       '                logger.debug(f"Skipping OCR row with unrecognized gem_type=\'{gem_type}\' (likely noise).")\n'
       "                continue\n"
       "\n"
       "            pcs = 0\n"
       '            qty_str = col_data["Qty"]\n'
       "            if qty_str and re.match(r'^\\d+$', qty_str.strip()):\n"
       "                pcs = int(qty_str)\n"
       "\n"
       '            wt  = parse_weight(col_data["Twt"])\n'
       '            dwt = parse_weight(col_data["Dwt"])\n'
       "\n"
       "            if pcs == 0 and wt > 0 and dwt > 0:\n"
       "                pcs = int(round(wt / dwt))\n"
       "\n"
       '            sz = col_data["Size"]\n'
       "            if not sz and dwt > 0:\n"
       '                if abs(dwt - 0.003) < 0.0005: sz = "0.80MM"\n'
       '                elif abs(dwt - 0.004) < 0.0005: sz = "0.90MM"\n'
       '                elif abs(dwt - 0.005) < 0.0005: sz = "1.00MM"\n'
       '                elif abs(dwt - 0.014) < 0.002:  sz = "1.50MM"\n'
       '                elif abs(dwt - 0.022) < 0.002:  sz = "1.70MM"\n')

count = c.count(old)
print(f"Found {count} occurrences")
if count >= 1:
    c = c.replace(old, "---PLACEHOLDER---", 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Replaced 1 occurrence with placeholder")
else:
    print("Original text not found!")
