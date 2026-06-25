import os
import shutil
import json

# Paths
style_masters_dir = r"C:\Users\Operations1\Downloads\style_masters"
sample_source = r"C:\Users\Operations1\.gemini\antigravity\brain\3d2684d2-dd7f-4b96-af3a-3a64a099cccf\media__1781342892589.jpg"
sample_dest = os.path.join(style_masters_dir, "sample_ring.jpg")
styles_data_path = r"C:\Users\Operations1\.gemini\antigravity\scratch\jewelry_bulk_importer\styles_data.json"

# 1. Create directory
if not os.path.exists(style_masters_dir):
    os.makedirs(style_masters_dir)
    print(f"Created directory: {style_masters_dir}")
else:
    print(f"Directory already exists: {style_masters_dir}")

# 2. Copy sample image
if os.path.exists(sample_source):
    shutil.copy(sample_source, sample_dest)
    print(f"Copied sample design sheet to: {sample_dest}")
else:
    print(f"Source sample not found at: {sample_source}")

# 3. Pre-seed styles_data.json with the sample ring's actual details
sample_data = [
  {
    "StyleCode": "R07976-RD0080-UKT",
    "StyleDate": "2026-06-13",
    "Category": "RINGS",
    "SubCategory": "HEAD",
    "Manufacturer": "EVERMORE JEWELLERY PRIVATE LIMITED",
    "StockType": "NATURAL DIAMOND JEWELRY",
    "MakeType": "CASTING",
    "ItemSize": "UK.T",
    "Parts": 1,
    "MItemCode": "9K WG",
    "NetWt": 4.48,
    "MRate": 3500.0,
    "MCostRate": 3300.0,
    "CPFRate": 700.0,
    "CPFCostRate": 650.0,
    "Diamonds": [
      {
        "ItemCode": "DRD55",
        "Size": "5.60MM",
        "Pcs": 1,
        "Weight": 0.800,
        "StonePosition": "Center",
        "SettingType": "Prong Set",
        "Rate": 22000.0,
        "CostRate": 16500.0
      },
      {
        "ItemCode": "DRD55",
        "Size": "1.50MM",
        "Pcs": 33,
        "Weight": 0.462,
        "StonePosition": "Halo",
        "SettingType": "Micro U-Cut Shared Setting",
        "Rate": 22000.0,
        "CostRate": 16500.0
      },
      {
        "ItemCode": "DRD55",
        "Size": "1.70MM",
        "Pcs": 16,
        "Weight": 0.352,
        "StonePosition": "Shank",
        "SettingType": "Micro U-Cut Shared Setting",
        "Rate": 22000.0,
        "CostRate": 16500.0
      }
    ]
  }
]

# Write JSON data
with open(styles_data_path, "w", encoding="utf-8") as f:
    json.dump(sample_data, f, indent=2)
print(f"Pre-seeded styles_data.json at: {styles_data_path}")
