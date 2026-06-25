import logging
from pathlib import Path

# Paths configuration
BASE_DIR = Path(__file__).parent.resolve()
STATIC_DIR = BASE_DIR / "static"
UPLOADS_DIR = BASE_DIR / "uploads"
DRAFT_FILE = BASE_DIR / "draft_styles.json"
SEED_FILE = BASE_DIR / "styles_data.json"

# Downloads and Watcher Paths
DOWNLOADS_DIR = Path(r"C:\Users\Operations1\Downloads")
WATCH_DIR = DOWNLOADS_DIR / "style_masters"
PROCESSED_DIR = WATCH_DIR / "processed"
FAILED_DIR = WATCH_DIR / "failed"

TEMPLATE_PATH = DOWNLOADS_DIR / "sjeplus_format.xlsx"
OUTPUT_PATH = DOWNLOADS_DIR / "sjeplus_import_ready.xlsx"

# Gati Master Database Paths
GATI_DB_DIR = Path(r"C:\Users\Operations1\Desktop\Desktop File\24.04.2025")
STONE_SIZE_PATH = GATI_DB_DIR / "Stone Size.xlsx"
STONE_SHAPE_SIZE_PATH = GATI_DB_DIR / "Stone Shape Size.xlsx"
STONE_SET_PATH = GATI_DB_DIR / "Stone Set.xlsx"

# Network Size Master Format Paths
SIZE_MASTER_FORMAT_PATH = Path(r"\\server\COMMON\Storage_Network\CAD\HRITHIK\STYLE MASTER WEBSITE\Size Master Format.xlsx")
SIZE_MASTER_BACKUP_PATH = Path(r"\\server\COMMON\Storage_Network\CAD\HRITHIK\STYLE MASTER WEBSITE\Size Master Format.xlsx.bak")

# Ensure directories exist
UPLOADS_DIR.mkdir(exist_ok=True)
WATCH_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(exist_ok=True)
FAILED_DIR.mkdir(exist_ok=True)

# Centralized Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
