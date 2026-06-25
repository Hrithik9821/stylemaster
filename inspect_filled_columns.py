import pandas as pd

file_path = r"C:\Users\Operations1\Downloads\sjeplus_format.xlsx"
df = pd.read_excel(file_path, sheet_name="Sample Data")

# Drop completely empty columns
df_clean = df.dropna(how='all', axis=1)

print("Active columns (not all empty):")
for col in df_clean.columns:
    print(f"- {col}")

print("\n--- Detailed data for the first few rows ---")
for index, row in df_clean.head(5).iterrows():
    print(f"\nRow {index}:")
    for col in df_clean.columns:
        val = row[col]
        if pd.notna(val):
            print(f"  {col}: {val}")
