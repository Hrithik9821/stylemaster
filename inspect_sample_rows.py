import pandas as pd

file_path = r"C:\Users\Operations1\Downloads\sjeplus_format.xlsx"
df = pd.read_excel(file_path, sheet_name="Sample Data")

# Select columns that are filled in the first few rows
non_empty_cols = [col for col in df.columns if df[col].notna().any()]
print("Non-empty columns in Sample Data:")
print(non_empty_cols)

print("\nDetailed view of rows 0 to 4 for these non-empty columns:")
print(df[non_empty_cols].head(5).to_string())
