import pandas as pd

file_path = r"C:\Users\Operations1\Downloads\sjeplus_format.xlsx"
df = pd.read_excel(file_path, sheet_name="Sample Data")

# Keep only columns that have at least one non-null value
df_clean = df.dropna(how='all', axis=1)

print(f"Sample Data Sheet: {df_clean.shape[0]} rows, {df_clean.shape[1]} active columns.")

# Print all rows for these active columns
pd.set_option('display.max_columns', None)
pd.set_option('display.width', 1000)

for index, row in df_clean.iterrows():
    print(f"\nRow {index}:")
    for col in df_clean.columns:
        val = row[col]
        if pd.notna(val) and val != 0 and val != 0.0:
            print(f"  {col}: {val}")
