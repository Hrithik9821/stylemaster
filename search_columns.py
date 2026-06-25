import pandas as pd

file_path = r"C:\Users\Operations1\Downloads\sjeplus_format.xlsx"
df = pd.read_excel(file_path, sheet_name="Default Format")

search_terms = ["shape", "color", "qty", "clarity", "rate", "amt", "amount", "itemcode", "mitemcode"]

found_cols = {term: [] for term in search_terms}
for col in df.columns:
    col_lower = col.lower()
    for term in search_terms:
        if term in col_lower:
            found_cols[term].append(col)

print("=== Search Results ===")
for term, cols in found_cols.items():
    print(f"\nTerm '{term}' found in {len(cols)} columns:")
    for col in cols[:15]:  # print first 15
        print(f"  - {col}")
    if len(cols) > 15:
        print(f"  ... and {len(cols) - 15} more")
