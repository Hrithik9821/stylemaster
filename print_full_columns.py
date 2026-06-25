import openpyxl
import pandas as pd
import sys

file_path = r"C:\Users\Operations1\Downloads\sjeplus_format.xlsx"
report_path = r"C:\Users\Operations1\.gemini\antigravity\scratch\excel_report.txt"

with open(report_path, "w", encoding="utf-8") as f:
    xl = pd.ExcelFile(file_path)
    f.write(f"Workbook sheets: {xl.sheet_names}\n\n")
    for name in xl.sheet_names:
        df = xl.parse(name)
        f.write(f"=== Sheet: {name} ===\n")
        f.write(f"Dimensions: {df.shape[0]} rows, {df.shape[1]} columns\n")
        f.write("Columns list:\n")
        for i, col in enumerate(df.columns):
            f.write(f"  {i}: {col}\n")
        f.write("\nSample Data (First 2 rows):\n")
        f.write(df.head(2).to_string())
        f.write("\n\n" + "="*40 + "\n\n")

print("Report written to excel_report.txt")
