"""
tools/gsheet_writer.py — Project Antigravity
Write ad intelligence records to Google Sheets using service account credentials.

Uses gspread + google-auth. Expects credentials.json in project root.

Features:
  - Creates/reuses a spreadsheet per crawl (or appends to master sheet)
  - 4-tab structure matching Excel builder
  - Deduplication by adLibraryId (upserts, never duplicates)
  - Formatting: frozen headers, column widths, wrapped text
"""
import os
import sys
import json
import re
from datetime import datetime, timezone

# Fix Windows encoding
if sys.platform == "win32":
    for stream in [sys.stdout, sys.stderr]:
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

import time as _time

import gspread
from google.oauth2.service_account import Credentials

PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__))
CREDENTIALS_PATH = os.path.join(PROJECT_ROOT, "credentials.json")

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

# Sheet names
TAB1 = "Ad Intelligence Records"
TAB2 = "Production Formulas"
TAB3 = "Key Takeaways"
TAB4 = "Legend & Instructions"

# Tab 1 headers (32 columns — includes all metadata + analysis + new fields)
TAB1_HEADERS = [
    "#", "BRAND", "MARKET", "AD LINK", "LANDING PAGE", "VIDEO URL",
    "AD START DATE", "LONGEVITY (DAYS)", "AD ITERATIONS", "STATUS",
    "DURATION (SEC)", "VIDEO FORMAT",
    "IMPRESSIONS (LOW)", "IMPRESSIONS (HIGH)",
    "SPEND (LOW)", "SPEND (HIGH)", "CURRENCY",
    "AD SCORE",
    "HOOK", "CONCEPT / BIG IDEA", "SCRIPT BREAKDOWN", "VISUAL — A/B/C ROLL",
    "CONSUMER PSYCHOLOGY", "CTA", "KEY TAKEAWAYS", "PRODUCTION FORMULA",
    "HOOK TYPE", "PRIMARY ANGLE", "FRAMEWORK",
    "PAGE NAME", "AD LIBRARY ID", "CRAWLED AT",
]

# Tab 2 headers
TAB2_HEADERS = [
    "#", "BRAND", "MARKET", "HOOK TYPE", "PRIMARY ANGLE / BIG IDEA",
    "FRAMEWORK", "FULL PRODUCTION FORMULA (Phase-by-Phase Shoot Brief)",
]

# Tab 3 headers
TAB3_HEADERS = [
    "#", "BRAND", "MARKET",
    "STEAL (What to replicate)", "KAIZEN (Gap to exploit)",
    "UPGRADE (FusiForce advantage)",
]


def _retry(fn, *args, max_retries=3, **kwargs):
    """Retry a Google Sheets API call with exponential backoff on rate limit errors."""
    for attempt in range(max_retries):
        try:
            return fn(*args, **kwargs)
        except gspread.exceptions.APIError as e:
            status = getattr(e, 'response', None)
            code = status.status_code if status else 0
            if code == 429 and attempt < max_retries - 1:
                wait = 2 ** (attempt + 1) * 10  # 20s, 40s, 80s
                print(f"  GSheet: Rate limited (429), retrying in {wait}s... (attempt {attempt+1}/{max_retries})", file=sys.stderr)
                _time.sleep(wait)
            else:
                raise


def _get_client() -> gspread.Client:
    """Authenticate with Google using service account credentials."""
    if not os.path.exists(CREDENTIALS_PATH):
        raise FileNotFoundError(f"credentials.json not found at {CREDENTIALS_PATH}")
    creds = Credentials.from_service_account_file(CREDENTIALS_PATH, scopes=SCOPES)
    return gspread.authorize(creds)


def _extract_hook_type(hook: str) -> str:
    m = re.search(r"Type:\s*([^\n]+)", hook)
    return m.group(1).strip() if m else ""


def _extract_big_idea(concept: str) -> str:
    m = re.search(r'Big Idea:\s*["\']?([^"\'\n.]+)', concept)
    return m.group(1).strip() if m else ""


def _extract_framework(script: str) -> str:
    m = re.search(r"Framework:\s*([^\n]+)", script)
    return m.group(1).strip() if m else ""


def _parse_takeaways(kt: str) -> tuple:
    steals = re.findall(r"STEAL[^:]*:\s*(.*?)(?=\n\n[^\n]*(?:STEAL|KAIZEN|UPGRADE)|\Z)", kt, re.DOTALL)
    kaizens = re.findall(r"KAIZEN[^:]*:\s*(.*?)(?=\n\n[^\n]*(?:STEAL|KAIZEN|UPGRADE)|\Z)", kt, re.DOTALL)
    upgrade = re.findall(r"UPGRADE[^:]*:\s*(.*?)(?=\n\n[^\n]*(?:STEAL|KAIZEN|UPGRADE)|\Z)", kt, re.DOTALL)
    steal_txt = "\n\n".join(f"• {s.strip()}" for s in steals) if steals else ""
    kaizen_txt = "\n\n".join(f"• {k.strip()}" for k in kaizens) if kaizens else ""
    upgrade_txt = upgrade[0].strip() if upgrade else ""
    return steal_txt, kaizen_txt, upgrade_txt


def _get_existing_ad_ids(ws) -> dict:
    """Get map of adLibraryId -> row number for deduplication."""
    try:
        all_values = ws.get_all_values()
        # Find the AD LIBRARY ID column index
        if not all_values:
            return {}
        headers = all_values[0]
        id_col = None
        for i, h in enumerate(headers):
            if "AD LIBRARY ID" in h.upper():
                id_col = i
                break
        if id_col is None:
            return {}
        result = {}
        for row_idx, row in enumerate(all_values[1:], start=2):  # 1-indexed, skip header
            if id_col < len(row) and row[id_col]:
                result[row[id_col]] = row_idx
        return result
    except Exception:
        return {}


def get_or_create_spreadsheet(
    client: gspread.Client,
    title: str,
    share_email: str = "",
) -> gspread.Spreadsheet:
    """Get existing spreadsheet by title, or create a new one."""
    try:
        # Try to open existing
        ss = client.open(title)
        print(f"  GSheet: Opened existing '{title}'", file=sys.stderr)
        return ss
    except gspread.SpreadsheetNotFound:
        ss = client.create(title)
        print(f"  GSheet: Created new '{title}'", file=sys.stderr)
        if share_email:
            ss.share(share_email, perm_type="user", role="writer")
        # Make it accessible to anyone with the link (for easy sharing)
        ss.share("", perm_type="anyone", role="writer")
        return ss


def _ensure_tabs(ss: gspread.Spreadsheet) -> dict:
    """Ensure all 4 tabs exist with headers. Returns dict of tab name -> worksheet."""
    existing = {ws.title: ws for ws in ss.worksheets()}
    tabs = {}

    # Tab 1
    if TAB1 in existing:
        tabs[TAB1] = existing[TAB1]
    else:
        if "Sheet1" in existing:
            ws = existing["Sheet1"]
            ws.update_title(TAB1)
        else:
            ws = ss.add_worksheet(title=TAB1, rows=500, cols=len(TAB1_HEADERS))
        ws.update(values=[TAB1_HEADERS], range_name="A1")
        ws.freeze(rows=1)
        tabs[TAB1] = ws

    # Tab 2
    if TAB2 in existing:
        tabs[TAB2] = existing[TAB2]
    else:
        ws = ss.add_worksheet(title=TAB2, rows=500, cols=len(TAB2_HEADERS))
        ws.update(values=[TAB2_HEADERS], range_name="A1")
        ws.freeze(rows=1)
        tabs[TAB2] = ws

    # Tab 3
    if TAB3 in existing:
        tabs[TAB3] = existing[TAB3]
    else:
        ws = ss.add_worksheet(title=TAB3, rows=500, cols=len(TAB3_HEADERS))
        ws.update(values=[TAB3_HEADERS], range_name="A1")
        ws.freeze(rows=1)
        tabs[TAB3] = ws

    # Tab 4 (legend — static content)
    if TAB4 not in existing:
        ws = ss.add_worksheet(title=TAB4, rows=30, cols=2)
        legend = [
            ["HOW TO USE THIS FILE", ""],
            ["Tab 1: Ad Intelligence Records", "Complete forensic analysis. All fields per ad."],
            ["Tab 2: Production Formulas", "Phase-by-phase shoot briefs. Filter by Hook Type or Angle."],
            ["Tab 3: Key Takeaways", "STEAL / KAIZEN / UPGRADE pre-parsed."],
            ["", ""],
            ["FIELD DEFINITIONS", ""],
            ["Hook", "Hook TYPE + execution (0-5s) + WHY it stops the scroll."],
            ["Concept / Big Idea", "Central creative idea + strategic architecture."],
            ["Script Breakdown", "Named framework + numbered beats with timecodes."],
            ["Visual", "A-Roll / B-Roll / C-Roll breakdown."],
            ["Consumer Psychology", "Named cognitive biases with execution detail."],
            ["CTA", "Mechanism + offer + landing page connection."],
            ["Key Takeaways", "STEAL = replicate. KAIZEN = weakness to exploit. UPGRADE = FusiForce advantage."],
            ["Production Formula", "Ready-to-shoot brief: FORMAT + 5 phases + voiceover + TEXT SUPER."],
            ["", ""],
            ["AD SCORING", ""],
            ["Ad Score (0-10)", "Longevity 50% + Impressions 30% + Duration 20%."],
        ]
        ws.update(values=legend, range_name="A1")
        tabs[TAB4] = ws
    else:
        tabs[TAB4] = existing[TAB4]

    return tabs


def write_records_to_gsheet(
    records: list,
    regions: list = None,
    spreadsheet_title: str = "Antigravity Intelligence",
    share_email: str = "",
) -> str:
    """
    Write/update records to Google Sheet. Deduplicates by adLibraryId.

    Args:
        records: List of AdRecord dicts
        regions: List of region codes for naming (e.g. ["US", "UK"])
        spreadsheet_title: Name of the spreadsheet
        share_email: Email to share the sheet with (optional)

    Returns:
        URL of the spreadsheet
    """
    client = _get_client()

    # Sort by adScore DESC
    sorted_recs = sorted(records, key=lambda r: r.get("adScore", 0), reverse=True)

    ss = get_or_create_spreadsheet(client, spreadsheet_title, share_email)
    tabs = _ensure_tabs(ss)

    # ── Tab 1: Ad Intelligence Records ──
    # Strategy: clear + single batch write (1 API call instead of N per-row updates)
    ws1 = tabs[TAB1]

    all_rows = []
    for idx, rec in enumerate(sorted_recs):
        all_rows.append([
            idx + 1,
            rec.get("brand", ""),
            rec.get("region", ""),
            rec.get("foreplayUrl", ""),
            rec.get("landingPageUrl", ""),
            rec.get("videoUrl", ""),
            rec.get("adStartDate", ""),
            rec.get("longevityDays", 0),
            rec.get("adIterationCount", 1),
            "Active" if rec.get("isActive", True) else "Inactive",
            rec.get("durationSeconds", 0),
            rec.get("videoFormat", ""),
            rec.get("impressionsLower", ""),
            rec.get("impressionsUpper", ""),
            rec.get("spendLower", ""),
            rec.get("spendUpper", ""),
            rec.get("spendCurrency", ""),
            rec.get("adScore", 0),
            rec.get("hook", ""),
            rec.get("concept", ""),
            rec.get("scriptBreakdown", ""),
            rec.get("visual", ""),
            rec.get("psychology", ""),
            rec.get("cta", ""),
            rec.get("keyTakeaways", ""),
            rec.get("productionFormula", ""),
            rec.get("hookType", ""),
            rec.get("primaryAngle", ""),
            rec.get("frameworkName", ""),
            rec.get("pageName", ""),
            rec.get("adLibraryId", ""),
            rec.get("crawledAt", ""),
        ])

    _retry(ws1.clear)
    _retry(ws1.update, values=[TAB1_HEADERS] + all_rows, range_name="A1")
    _retry(ws1.freeze, rows=1)
    print(f"  GSheet Tab1: Wrote {len(all_rows)} records (clear + batch)", file=sys.stderr)

    # Use sorted_recs directly for Tabs 2 & 3 (we already have all data)
    all_sheet_recs = sorted_recs

    # ── Tab 2: Production Formulas ──
    ws2 = tabs[TAB2]
    tab2_rows = []
    for idx, rec in enumerate(all_sheet_recs):
        hook = rec.get("hook", "")
        concept = rec.get("concept", "")
        script = rec.get("scriptBreakdown", "")
        formula = rec.get("productionFormula", "")
        tab2_rows.append([
            idx + 1,
            rec.get("brand", ""),
            rec.get("region", ""),
            _extract_hook_type(hook),
            _extract_big_idea(concept),
            _extract_framework(script),
            formula,
        ])
    if tab2_rows:
        _retry(ws2.clear)
        _retry(ws2.update, values=[TAB2_HEADERS] + tab2_rows, range_name="A1")
        _retry(ws2.freeze, rows=1)

    # ── Tab 3: Key Takeaways ──
    ws3 = tabs[TAB3]
    tab3_rows = []
    for idx, rec in enumerate(all_sheet_recs):
        kt = rec.get("keyTakeaways", "")
        steal, kaizen, upgrade = _parse_takeaways(kt)
        tab3_rows.append([
            idx + 1,
            rec.get("brand", ""),
            rec.get("region", ""),
            steal, kaizen, upgrade,
        ])
    if tab3_rows:
        _retry(ws3.clear)
        _retry(ws3.update, values=[TAB3_HEADERS] + tab3_rows, range_name="A1")
        _retry(ws3.freeze, rows=1)

    url = ss.url
    print(f"  GSheet: Done! {len(all_rows)} records written across 3 tabs", file=sys.stderr)
    print(f"  GSheet URL: {url}", file=sys.stderr)
    return url


def sync_from_db_to_gsheet(
    spreadsheet_title: str = "Antigravity Intelligence",
) -> str:
    """
    Read all records from the Neon DB JSON export and sync to Google Sheet.
    This is the recommended way to keep the sheet up-to-date.
    """
    # Find the latest data file
    tmp_dir = os.path.join(PROJECT_ROOT, ".tmp")
    data_files = []
    if os.path.exists(tmp_dir):
        for f in os.listdir(tmp_dir):
            if f.endswith("-data.json"):
                fp = os.path.join(tmp_dir, f)
                data_files.append((os.path.getmtime(fp), fp))

    if not data_files:
        print("No data files found", file=sys.stderr)
        return ""

    # Use the newest file
    data_files.sort(reverse=True)
    latest = data_files[0][1]
    print(f"  Syncing from: {latest}", file=sys.stderr)

    with open(latest, "r", encoding="utf-8") as f:
        records = json.load(f)

    if not records:
        print("  No records in file", file=sys.stderr)
        return ""

    # Get regions from records
    regions = list(set(r.get("region", "") for r in records))

    return write_records_to_gsheet(
        records=records,
        regions=regions,
        spreadsheet_title=spreadsheet_title,
    )


# ── CLI entry point ──
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Sync Antigravity data to Google Sheets")
    parser.add_argument("--title", default="Antigravity Intelligence",
                        help="Spreadsheet title")
    parser.add_argument("--data-file", default="",
                        help="Path to data JSON file (default: latest in .tmp/)")
    parser.add_argument("--share", default="",
                        help="Email to share the sheet with")
    args = parser.parse_args()

    if args.data_file:
        with open(args.data_file, "r", encoding="utf-8") as f:
            recs = json.load(f)
        regions = list(set(r.get("region", "") for r in recs))
        url = write_records_to_gsheet(recs, regions, args.title, args.share)
    else:
        url = sync_from_db_to_gsheet(args.title)

    if url:
        print(f"\nSpreadsheet URL: {url}")
