"""
JewelFX – Style Master Bulk Importer
Backend: FastAPI + Gemini Vision AI + openpyxl Excel generator
Refactored by Senior Web Developer Manager: DRY, thread-safe, structured configuration and logging.
"""

import os
import json
import shutil
import uuid
import traceback
import re
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException, Body, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import uvicorn

import time
from config import get_logger, STATIC_DIR, UPLOADS_DIR, DRAFT_FILE, SEED_FILE, STONE_SIZE_PATH, STONE_SHAPE_SIZE_PATH, SIZE_MASTER_FORMAT_PATH, SIZE_MASTER_BACKUP_PATH
from core import extract_style_data_from_image, compile_styles_to_excel, reload_gati_sizes, get_all_gati_sizes
import core

logger = get_logger("app")

# Initialize app
app = FastAPI(title="JewelFX Bulk Importer")

# Serve UI static resources
@app.get("/")
async def root():
    return FileResponse(
        STATIC_DIR / "index.html",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}
    )

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

@app.get("/jewelfx_logo.png")
async def logo():
    p = STATIC_DIR / "jewelfx_logo.png"
    if p.exists():
        return FileResponse(p)
    raise HTTPException(404, "Logo not found")


# ──────────────────────────────────────────────
#  STYLES DRAFT STORE CRUD
# ──────────────────────────────────────────────

def load_styles() -> list:
    if DRAFT_FILE.exists():
        try:
            return json.loads(DRAFT_FILE.read_text(encoding="utf-8"))
        except Exception as e:
            logger.error(f"Failed to read draft styles file: {e}")
            
    if SEED_FILE.exists():
        try:
            return json.loads(SEED_FILE.read_text(encoding="utf-8"))
        except Exception as e:
            logger.error(f"Failed to read seed styles file: {e}")
            
    return []


def save_styles(data: list):
    try:
        content = json.dumps(data, indent=2, default=str)
        DRAFT_FILE.write_text(content, encoding="utf-8")
    except Exception as e:
        logger.error(f"Failed to save styles to draft file: {e}")


@app.get("/api/styles")
async def get_styles():
    return JSONResponse(load_styles())


@app.post("/api/styles")
async def post_styles(styles: list = Body(...)):
    save_styles(styles)
    return {"status": "ok", "count": len(styles)}


# ──────────────────────────────────────────────
#  IMAGE UPLOAD
# ──────────────────────────────────────────────

@app.post("/api/upload-images")
async def upload_images(files: list[UploadFile] = File(...)):
    saved = []
    for f in files:
        orig_name = f.filename
        stem = Path(orig_name).stem
        ext = Path(orig_name).suffix or ".png"
        
        # Sanitize filename (alphanumeric, dot, hyphen, underscore, @ only)
        sanitized_stem = re.sub(r'[^a-zA-Z0-9_\-.@]', '_', stem)
        # Append unique 4-character hex suffix to prevent collisions
        name = f"{sanitized_stem}_{uuid.uuid4().hex[:4]}{ext}"
        
        dest = UPLOADS_DIR / name
        try:
            with open(dest, "wb") as out:
                shutil.copyfileobj(f.file, out)
            saved.append({"filename": orig_name, "saved_as": name, "path": str(dest)})
            logger.info(f"Uploaded and saved image: {name}")
        except Exception as e:
            logger.error(f"Failed to save uploaded image {orig_name}: {e}")
            raise HTTPException(500, f"Error saving image: {str(e)}")
            
    return {"uploaded": len(saved), "files": saved}


# ──────────────────────────────────────────────
#  OCR EXTRACTION
# ──────────────────────────────────────────────

@app.post("/api/extract-local")
async def extract_local_ocr(filenames: str = Form(...)):
    """Extracts style data from uploaded spec images using core OCR module."""
    try:
        fnames = json.loads(filenames)
    except Exception:
        raise HTTPException(400, "Invalid JSON input for filenames parameter")
        
    if not fnames:
        raise HTTPException(400, "No files specified")
        
    results = []
    errors = []
        
    for fname in fnames:
        fpath = UPLOADS_DIR / fname
        if not fpath.exists():
            errors.append({"file": fname, "error": "File not found on server"})
            logger.warning(f"File not found on server: {fname}")
            continue
            
        try:
            data = extract_style_data_from_image(fpath)
            results.append(data)
        except Exception as e:
            err_msg = str(e)
            logger.error(f"Failed extracting OCR data for {fname}: {traceback.format_exc()}")
            errors.append({"file": fname, "error": err_msg})
            
    return {"extracted": results, "errors": errors, "total": len(fnames), "success": len(results)}


@app.post("/api/generate-excel")
async def generate_excel(styles: list = Body(...)):
    """Generates bulk-upload Excel spreadsheet for Gati and returns it for download."""
    # Save the generated excel file in the local server directory, rather than the server's Downloads folder directly,
    # so that we do not generate a duplicate copy if the browser is also running on the server PC.
    local_output_path = Path(__file__).parent / "sjeplus_import_ready_web.xlsx"
    res = compile_styles_to_excel(styles, output_path=local_output_path)
    if res.get("status") == "error":
        raise HTTPException(500, res.get("message"))
    
    path_str = res.get("path")
    if not path_str or not os.path.exists(path_str):
        raise HTTPException(404, "Generated Excel file not found on server")
        
    return FileResponse(
        path=path_str,
        filename="sjeplus_import_ready.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


# ──────────────────────────────────────────────
#  MASTER DATABASE SERVICES
# ──────────────────────────────────────────────

@app.post("/api/reload-sizes")
async def api_reload_sizes():
    """Triggers hot-reloading of Gati master size lists."""
    res = reload_gati_sizes()
    if res.get("status") == "error":
        raise HTTPException(500, res.get("message"))
    return res


@app.get("/api/gati-sizes")
async def api_get_gati_sizes():
    """Returns all loaded valid Gati sizes (sorted)."""
    return JSONResponse(get_all_gati_sizes())


@app.post("/api/upload-master-db")
async def upload_master_db(file: UploadFile = File(...)):
    """Uploads and replaces a Gati master Excel database sheet, then reloads the size DB."""
    filename = file.filename
    if not (filename.endswith(".xlsx") or filename.endswith(".xls")):
        raise HTTPException(400, "Only Excel files (.xlsx, .xls) are allowed.")
    
    file_lower = filename.lower()
    if "shape" in file_lower:
        dest_path = STONE_SHAPE_SIZE_PATH
    else:
        dest_path = STONE_SIZE_PATH
        
    try:
        # Ensure parent directory exists
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Backup existing file if it exists to allow undo/recovery
        if dest_path.exists():
            backup_path = dest_path.with_suffix(f".bak_{int(time.time())}.xlsx")
            try:
                shutil.copy2(dest_path, backup_path)
                logger.info(f"Backed up master DB file to: {backup_path.name}")
            except Exception as e:
                logger.error(f"Failed to backup master file: {e}")
                
        # Write uploaded file to destination
        with open(dest_path, "wb") as out:
            shutil.copyfileobj(file.file, out)
        logger.info(f"Successfully replaced master file at: {dest_path}")
        
    except Exception as e:
        logger.error(f"Failed writing uploaded master file: {e}")
        raise HTTPException(500, f"Error saving file: {str(e)}")
        
    # Hot-reload the Gati sizes database cache
    reload_res = reload_gati_sizes()
    if reload_res.get("status") == "error":
        raise HTTPException(500, f"File saved but reload failed: {reload_res.get('message')}")
        
    return {
        "status": "ok", 
        "file": dest_path.name, 
        "loaded": reload_res.get("loaded"),
        "message": f"Successfully updated and reloaded {dest_path.name} with {reload_res.get('loaded')} size codes."
    }


@app.post("/api/export-missing-sizes")
async def export_missing_sizes(styles: list = Body(...)):
    """Finds missing sizes from the styles list, backups & updates the network Size Master Format.xlsx, and returns status."""
    import openpyxl
    try:
        missing_sizes = set()
        for s in styles:
            for d in s.get("Diamonds", []) or []:
                sz = d.get("Size", "")
                if sz:
                    matched = core.match_gati_size(sz)
                    if matched.startswith(core.SIZE_NOT_IN_DB_PREFIX):
                        clean_sz = matched[len(core.SIZE_NOT_IN_DB_PREFIX):].strip()
                        missing_sizes.add(clean_sz)

        if not missing_sizes:
            raise HTTPException(400, "All sizes are already present in Gati Database! No missing sizes to export.")

        # Backup network format file
        if SIZE_MASTER_FORMAT_PATH.exists():
            try:
                shutil.copy2(SIZE_MASTER_FORMAT_PATH, SIZE_MASTER_BACKUP_PATH)
                logger.info(f"Backed up network format file to {SIZE_MASTER_BACKUP_PATH}")
            except Exception as e:
                logger.error(f"Failed to backup network format file: {e}")
        else:
            logger.warning(f"Network format file not found at {SIZE_MASTER_FORMAT_PATH}. Will attempt to create one.")

        # Load workbook or create a new one if not exists
        try:
            wb = openpyxl.load_workbook(SIZE_MASTER_FORMAT_PATH)
            ws = wb.active
        except Exception as e:
            logger.warning(f"Could not load workbook at {SIZE_MASTER_FORMAT_PATH}: {e}. Creating new workbook.")
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Sheet1"
            headers = ['GSizeName', 'SizeName', 'SizeCode', 'SizeMM', 'Pointer', 'MinPointer', 'MaxPointer', 'StockSize', 'SizeHexColor', 'SizeAliasName', 'DrillType', 'DrillSize']
            for col_idx, h in enumerate(headers, 1):
                ws.cell(row=1, column=col_idx, value=h)
        
        # Clear existing data rows starting from row 2
        while ws.max_row > 1:
            ws.delete_rows(2)

        # Write data rows
        row_idx = 2
        for sz in sorted(missing_sizes):
            ws.cell(row=row_idx, column=1, value="POINTER")
            ws.cell(row=row_idx, column=2, value=sz)
            ws.cell(row=row_idx, column=3, value=sz)
            ws.cell(row=row_idx, column=4, value=sz)
            ws.cell(row=row_idx, column=5, value=None)
            ws.cell(row=row_idx, column=6, value=None)
            ws.cell(row=row_idx, column=7, value=None)
            ws.cell(row=row_idx, column=8, value="As It is")
            ws.cell(row=row_idx, column=9, value=None)
            ws.cell(row=row_idx, column=10, value=None)
            ws.cell(row=row_idx, column=11, value=None)
            ws.cell(row=row_idx, column=12, value=None)
            row_idx += 1

        # Ensure directory exists and save
        SIZE_MASTER_FORMAT_PATH.parent.mkdir(parents=True, exist_ok=True)
        wb.save(SIZE_MASTER_FORMAT_PATH)
        wb.close()

        msg = f"Successfully updated network Size Master Format.xlsx with {len(missing_sizes)} missing sizes!"
        logger.info(msg)
        return FileResponse(
            path=str(SIZE_MASTER_FORMAT_PATH),
            filename="Size Master Format.xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"X-Message": msg, "X-Count": str(len(missing_sizes))}
        )
    except Exception as e:
        logger.error(f"Error in export_missing_sizes: {traceback.format_exc()}")
        raise HTTPException(500, f"Error generating size master file: {str(e)}")


if __name__ == "__main__":
    import socket
    hostname = socket.gethostname()
    try:
        local_ip = socket.gethostbyname(hostname)
    except Exception:
        local_ip = "0.0.0.0"
        
    logger.info("=" * 60)
    logger.info("  JewelFX – Style Master Bulk Importer Backend")
    logger.info(f"  Access on this server PC: http://localhost:8000")
    logger.info(f"  Access from other office PCs: http://{local_ip}:8000")
    logger.info("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
