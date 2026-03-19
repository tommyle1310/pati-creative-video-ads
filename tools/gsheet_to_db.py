#!/usr/bin/env python3
"""
One-time script: Read records from Google Sheet → insert into Neon DB.
Uses the same GSheet credentials and Prisma DB connection.

Usage:
  python tools/gsheet_to_db.py
"""
import os
import sys
import json

# Fix Windows encoding
if sys.platform == "win32":
    for s in [sys.stdout, sys.stderr]:
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

# Load .env
def _load_dotenv():
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if not os.path.exists(env_path):
        return
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip("'").strip('"')
            if val and not val.startswith("#"):
                os.environ.setdefault(key, val)

_load_dotenv()

import gspread
from google.oauth2.service_account import Credentials
import requests

PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__))
CREDENTIALS_PATH = os.path.join(PROJECT_ROOT, "credentials.json")

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

SHEET_ID = "1UIFNVFXM67OOfUMZDJUCUv1YjGC9myTKyN6QL8qbLFo"
TAB_NAME = "Ad Intelligence Records"

# Tab 1 column order (0-indexed):
# 0=#, 1=BRAND, 2=MARKET, 3=AD LINK, 4=LANDING PAGE, 5=VIDEO URL,
# 6=AD START DATE, 7=LONGEVITY (DAYS), 8=AD ITERATIONS, 9=STATUS,
# 10=DURATION (SEC), 11=VIDEO FORMAT,
# 12=IMPRESSIONS (LOW), 13=IMPRESSIONS (HIGH),
# 14=SPEND (LOW), 15=SPEND (HIGH), 16=CURRENCY,
# 17=AD SCORE,
# 18=HOOK, 19=CONCEPT, 20=SCRIPT BREAKDOWN, 21=VISUAL,
# 22=PSYCHOLOGY, 23=CTA, 24=KEY TAKEAWAYS, 25=PRODUCTION FORMULA,
# 26=HOOK TYPE, 27=PRIMARY ANGLE, 28=FRAMEWORK, 29=CREATIVE PATTERN,
# 30=PAGE NAME, 31=AD LIBRARY ID, 32=CRAWLED AT


def _safe_float(val, default=0.0):
    try:
        if val is None or val == "":
            return default
        return float(str(val).replace(",", ""))
    except (ValueError, TypeError):
        return default


def _safe_int(val, default=0):
    try:
        if val is None or val == "":
            return default
        return int(float(str(val).replace(",", "")))
    except (ValueError, TypeError):
        return default


def _safe_str(val, default=""):
    if val is None:
        return default
    return str(val).strip()


def _col(row, idx):
    """Safely get column value from row (handles short rows)."""
    if idx < len(row):
        return row[idx]
    return ""


def read_gsheet():
    """Read all records from Tab 1 of the Google Sheet."""
    creds = Credentials.from_service_account_file(CREDENTIALS_PATH, scopes=SCOPES)
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    ws = sh.worksheet(TAB_NAME)

    all_rows = ws.get_all_values()
    if not all_rows:
        print("Sheet is empty!")
        return []

    # Skip header row
    headers = all_rows[0]
    data_rows = all_rows[1:]
    print(f"Found {len(data_rows)} rows (headers: {len(headers)} columns)")

    records = []
    for row in data_rows:
        ad_library_id = _safe_str(_col(row, 31))
        if not ad_library_id:
            # Try extracting from AD LINK URL
            ad_link = _safe_str(_col(row, 3))
            if "id=" in ad_link:
                ad_library_id = ad_link.split("id=")[-1].split("&")[0]

        if not ad_library_id:
            print(f"  Skipping row (no adLibraryId): {_safe_str(_col(row, 1))}")
            continue

        brand = _safe_str(_col(row, 1))
        if not brand:
            continue

        record = {
            "brand": brand,
            "foreplayUrl": "",
            "landingPageUrl": _safe_str(_col(row, 4)),
            "hook": _safe_str(_col(row, 18)),
            "concept": _safe_str(_col(row, 19)),
            "scriptBreakdown": _safe_str(_col(row, 20)),
            "visual": _safe_str(_col(row, 21)),
            "psychology": _safe_str(_col(row, 22)),
            "cta": _safe_str(_col(row, 23)),
            "keyTakeaways": _safe_str(_col(row, 24)),
            "productionFormula": _safe_str(_col(row, 25)),
            "adScore": _safe_float(_col(row, 17)),
            "longevityDays": _safe_int(_col(row, 7)),
            "hookType": _safe_str(_col(row, 26)),
            "primaryAngle": _safe_str(_col(row, 27)),
            "frameworkName": _safe_str(_col(row, 28)),
            "creativePattern": _safe_str(_col(row, 29)),
            "adLibraryId": ad_library_id,
            "adLibraryUrl": _safe_str(_col(row, 3)),
            "region": _safe_str(_col(row, 2)) or "US",
            "keyword": "creatine gummies",
            "status": _safe_str(_col(row, 9)).lower() or "active",
            "videoUrl": _safe_str(_col(row, 5)) or None,
            "thumbnailUrl": None,
            "durationSeconds": _safe_float(_col(row, 10)) or None,
            "videoFormat": _safe_str(_col(row, 11)) or None,
            "pageName": _safe_str(_col(row, 30)) or brand,
            "adStartDate": _safe_str(_col(row, 6)) or None,
            "adIterationCount": _safe_int(_col(row, 8)) or None,
            "isActive": _safe_str(_col(row, 9)).lower() in ("active", "true", "1", ""),
            "impressionsLower": _safe_str(_col(row, 12)) or None,
            "impressionsUpper": _safe_str(_col(row, 13)) or None,
            "spendLower": _safe_str(_col(row, 14)) or None,
            "spendUpper": _safe_str(_col(row, 15)) or None,
            "spendCurrency": _safe_str(_col(row, 16)) or None,
            "pageId": None,
        }
        records.append(record)

    return records


def insert_to_db(records):
    """Insert records into Neon DB via the API route (avoids Prisma Python dependency)."""
    # Write to a temp JSON file and use the existing persistRecords logic
    # OR directly call the Prisma-compatible DB

    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        print("ERROR: DATABASE_URL not set in .env")
        return 0

    # Use psycopg2 directly for bulk insert
    try:
        import psycopg2
    except ImportError:
        print("Installing psycopg2-binary...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"])
        import psycopg2

    # Convert prisma:// URL to postgresql:// for psycopg2
    conn_url = db_url
    if conn_url.startswith("prisma://"):
        # Use DIRECT_URL if available
        conn_url = os.environ.get("DIRECT_URL", "")
        if not conn_url:
            print("ERROR: prisma:// URL detected but no DIRECT_URL set")
            print("  Add DIRECT_URL=postgresql://... to your .env")
            return 0

    conn = psycopg2.connect(conn_url)
    cur = conn.cursor()

    inserted = 0
    skipped = 0

    for rec in records:
        try:
            cur.execute("""
                INSERT INTO "AdRecord" (
                    id, brand, "foreplayUrl", "landingPageUrl",
                    hook, concept, "scriptBreakdown", visual, psychology, cta,
                    "keyTakeaways", "productionFormula",
                    "adScore", "longevityDays",
                    "hookType", "primaryAngle", "frameworkName", "creativePattern",
                    "adLibraryId", "adLibraryUrl", region, keyword, status,
                    "videoUrl", "thumbnailUrl", "durationSeconds", "videoFormat",
                    "pageName", "adStartDate", "adIterationCount", "isActive",
                    "impressionsLower", "impressionsUpper",
                    "spendLower", "spendUpper", "spendCurrency",
                    "pageId", "crawledAt", "createdAt", "updatedAt"
                ) VALUES (
                    gen_random_uuid(), %(brand)s, %(foreplayUrl)s, %(landingPageUrl)s,
                    %(hook)s, %(concept)s, %(scriptBreakdown)s, %(visual)s, %(psychology)s, %(cta)s,
                    %(keyTakeaways)s, %(productionFormula)s,
                    %(adScore)s, %(longevityDays)s,
                    %(hookType)s, %(primaryAngle)s, %(frameworkName)s, %(creativePattern)s,
                    %(adLibraryId)s, %(adLibraryUrl)s, %(region)s, %(keyword)s, %(status)s,
                    %(videoUrl)s, %(thumbnailUrl)s, %(durationSeconds)s, %(videoFormat)s,
                    %(pageName)s, %(adStartDate)s, %(adIterationCount)s, %(isActive)s,
                    %(impressionsLower)s, %(impressionsUpper)s,
                    %(spendLower)s, %(spendUpper)s, %(spendCurrency)s,
                    %(pageId)s, NOW(), NOW(), NOW()
                )
                ON CONFLICT ("adLibraryId") DO UPDATE SET
                    hook = EXCLUDED.hook,
                    concept = EXCLUDED.concept,
                    "scriptBreakdown" = EXCLUDED."scriptBreakdown",
                    visual = EXCLUDED.visual,
                    psychology = EXCLUDED.psychology,
                    cta = EXCLUDED.cta,
                    "keyTakeaways" = EXCLUDED."keyTakeaways",
                    "productionFormula" = EXCLUDED."productionFormula",
                    "adScore" = EXCLUDED."adScore",
                    "longevityDays" = EXCLUDED."longevityDays",
                    "hookType" = EXCLUDED."hookType",
                    "primaryAngle" = EXCLUDED."primaryAngle",
                    "frameworkName" = EXCLUDED."frameworkName",
                    "creativePattern" = EXCLUDED."creativePattern",
                    status = EXCLUDED.status,
                    "updatedAt" = NOW()
            """, rec)
            inserted += 1
        except Exception as e:
            print(f"  Error inserting {rec['adLibraryId']}: {e}")
            conn.rollback()
            skipped += 1
            continue

    conn.commit()
    cur.close()
    conn.close()

    return inserted


def main():
    print("=" * 60)
    print("Google Sheet → Neon DB Sync (one-time)")
    print("=" * 60)

    print("\n1. Reading from Google Sheet...")
    records = read_gsheet()
    if not records:
        print("No records found. Exiting.")
        return

    print(f"\n   Found {len(records)} records")
    for r in records[:3]:
        print(f"   - {r['brand']} ({r['region']}) | AdScore: {r['adScore']} | ID: {r['adLibraryId'][:15]}...")

    print(f"\n2. Inserting into Neon DB...")
    count = insert_to_db(records)
    print(f"\n   Done! {count}/{len(records)} records synced to DB.")


if __name__ == "__main__":
    main()
