import openpyxl
import pandas as pd
import os

file_path = r"C:\Users\Operations1\Downloads\sjeplus_format.xlsx"

if os.path.exists(file_path):
    print(f"File exists. Size: {os.path.getsize(file_path)} bytes")
    try:
        # Load workbook to see sheet names
        wb = openpyxl.load_workbook(file_path, read_only=True)
        print("Sheets in workbook:", wb.sheetnames)
        wb.close()
        
        # Load sheets with pandas to inspect column headers
        xl = pd.ExcelFile(file_path)
        for sheet_name in xl.sheet_names:
            print(f"\n--- Sheet: {sheet_name} ---")
            df = xl.parse(sheet_name)
            print("Columns:")
            print(df.columns.tolist())
            print("\nFirst 3 rows:")
            print(df.head(3).to_string())
    except Exception as e:
        print("Error reading excel:", e)
else:
    print("Excel file not found at", file_path)
