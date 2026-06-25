import os
import json
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_file(fname):
    print(f"\n--- Testing Extraction on: {fname} ---")
    response = client.post("/api/extract-local", data={"filenames": json.dumps([fname])})
    print("Status:", response.status_code)
    data = response.json()
    if response.status_code == 200:
        extracted = data.get("extracted", [])
        if extracted:
            style = extracted[0]
            print("Style Code:", style.get("StyleCode"))
            print("Metal Code:", style.get("MItemCode"))
            print("Net Weight:", style.get("NetWt"))
            print("Diamonds:")
            for d in style.get("Diamonds", []):
                print(f"  - {d.get('ItemCode')} | {d.get('Size')} | Qty: {d.get('Pcs')} | Wt: {d.get('Weight')} | Setting: {d.get('SettingType')}")
        else:
            print("No data extracted. Errors:", data.get("errors"))
    else:
        print("Failed:", data)

def main():
    test_file("6acbb9895051.png")
    test_file("9617416fca2d.jpg")
    test_file("bc057411c6ab.jpeg")

if __name__ == "__main__":
    main()
