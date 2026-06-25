import os
import json

styles_data_path = r"C:\Users\Operations1\.gemini\antigravity\scratch\jewelry_bulk_importer\styles_data.json"
style_masters_dir = r"C:\Users\Operations1\Downloads\style_masters"

def load_data():
    if os.path.exists(styles_data_path):
        try:
            with open(styles_data_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []

def main():
    print("=== Jewelry Style Master AI Parser Helper ===")
    
    # Check directory
    if not os.path.exists(style_masters_dir):
        print(f"Error: Folder '{style_masters_dir}' does not exist.")
        return
        
    # List images
    supported_exts = ('.jpg', '.jpeg', '.png', '.pdf')
    files = [f for f in os.listdir(style_masters_dir) if f.lower().endswith(supported_exts)]
    
    print(f"Found {len(files)} files in '{style_masters_dir}':")
    for f in files:
        print(f"  - {f}")
        
    # Check current database
    data = load_data()
    existing_codes = {item.get("StyleCode").lower() for item in data if item.get("StyleCode")}
    
    print(f"\nCurrent database has {len(data)} styles:")
    for item in data:
        print(f"  - {item.get('StyleCode')} ({item.get('Category')})")
        
    print("\n--- Next Steps ---")
    print("To parse any new images:")
    print("1. Place the images/PDFs in the folder.")
    print("2. Tell your AI coding assistant: 'I've added new style masters, please parse them.'")
    print("3. The assistant will inspect them, extract all diamond details and metals, and save them.")
    print("4. You can then reload the web page to edit and generate the Excel!")

if __name__ == "__main__":
    main()
