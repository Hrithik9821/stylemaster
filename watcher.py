"""
JewelFX – Automatic Folder Watcher & Excel Compiler
Monitors downloads/style_masters folder and compiles design sheets to Excel in real-time.
Refactored by Senior Web Developer Manager: DRY, clean, and centralized core module integration.
"""

import os
import time
import json
import shutil
import traceback
from pathlib import Path

from config import get_logger, WATCH_DIR, PROCESSED_DIR, FAILED_DIR, DRAFT_FILE, SEED_FILE
from core import extract_style_data_from_image, compile_styles_to_excel

logger = get_logger("watcher")


def load_styles() -> list:
    if DRAFT_FILE.exists():
        try:
            return json.loads(DRAFT_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
            
    if SEED_FILE.exists():
        try:
            return json.loads(SEED_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
            
    return []


def save_styles(styles_list: list):
    for path in [DRAFT_FILE, SEED_FILE]:
        try:
            path.write_text(json.dumps(styles_list, indent=2, default=str), encoding="utf-8")
        except Exception as e:
            logger.error(f"Error writing styles draft to {path.name}: {e}")


def main():
    logger.info("=" * 60)
    logger.info("  JewelFX – Automatic Folder Watcher (Refactored)")
    logger.info(f"  Watching Folder: {WATCH_DIR}")
    logger.info("=" * 60)
    
    logger.info("Folder watcher is active. Place design spec sheet images in the folder to process.")
    supported_exts = ('.jpg', '.jpeg', '.png')
    
    while True:
        try:
            # Check for files to process
            files = [WATCH_DIR / f for f in os.listdir(WATCH_DIR) 
                     if (WATCH_DIR / f).is_file() and f.lower().endswith(supported_exts)]
            
            if files:
                styles = load_styles()
                
                for fpath in files:
                    logger.info(f"New file detected: {fpath.name}")
                    try:
                        # Extract data using the core module
                        data = extract_style_data_from_image(fpath)
                        
                        # Save state
                        styles.append(data)
                        save_styles(styles)
                        logger.info(f"Data saved for Style: {data.get('StyleCode')}")
                        
                        # Generate Excel using the core module
                        compile_styles_to_excel(styles)
                        
                        # Move file to processed folder
                        dest = PROCESSED_DIR / fpath.name
                        if dest.exists():
                            base, ext = os.path.splitext(fpath.name)
                            dest = PROCESSED_DIR / f"{base}_{int(time.time())}{ext}"
                            
                        shutil.move(str(fpath), str(dest))
                        logger.info(f"Moved file to: processed/{dest.name}")
                        
                    except Exception as e:
                        err_str = str(e)
                        if "quota" in err_str.lower() or "429" in err_str.lower() or "resource_exhausted" in err_str.lower():
                            logger.warning("Quota limit hit. Pausing watcher for 30 seconds...")
                            time.sleep(30)
                            continue
                            
                        logger.error(f"Error processing {fpath.name}: {e}\n{traceback.format_exc()}")
                        
                        # Move file to failed folder
                        dest = FAILED_DIR / fpath.name
                        if dest.exists():
                            base, ext = os.path.splitext(fpath.name)
                            dest = FAILED_DIR / f"{base}_{int(time.time())}{ext}"
                            
                        shutil.move(str(fpath), str(dest))
                        logger.info(f"Moved file to: failed/{dest.name}")
                        
            time.sleep(2)
            
        except KeyboardInterrupt:
            logger.info("Watcher stopped by user request.")
            break
        except Exception as e:
            logger.error(f"Unexpected watcher loop error: {e}")
            time.sleep(5)


if __name__ == "__main__":
    main()
