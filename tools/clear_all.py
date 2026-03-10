#!/usr/bin/env python3
"""
One-time script: Clear Neon DB tables + Google Sheet.
Run: python tools/clear_all.py
"""
import os
import sys
import json

# Fix Windows encoding
if sys.platform == "win32":
    for stream in [sys.stdout, sys.stderr]:
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

# Load .env
PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__))
env_path = os.path.join(PROJECT_ROOT, ".env")
if os.path.exists(env_path):
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

# ── 1. Clear Database ──
print("\n=== CLEARING DATABASE ===")
DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    print("DATABASE_URL not set — skipping DB clear")
else:
    try:
        from neon_api_helper import clear_db
        clear_db()
    except ImportError:
        # Direct SQL approach via psycopg2 or HTTP
        try:
            import requests as req
            # Use Neon SQL-over-HTTP
            # Extract host from DATABASE_URL
            # Format: postgresql://user:pass@host/db?sslmode=require
            import re
            m = re.match(r'postgresql://([^:]+):([^@]+)@([^/]+)/([^?]+)', DATABASE_URL)
            if m:
                user, password, host, dbname = m.groups()
                url = f"https://{host}/sql"
                headers = {
                    "Content-Type": "application/json",
                    "Neon-Connection-String": DATABASE_URL,
                }

                # Delete in correct order (foreign keys)
                tables = [
                    ("CompetitorScore", 'DELETE FROM "CompetitorScore"'),
                    ("CrawlJob", 'DELETE FROM "CrawlJob"'),
                    ("AdRecord", 'DELETE FROM "AdRecord"'),
                ]

                for name, sql in tables:
                    resp = req.post(url, headers=headers, json={"query": sql}, timeout=15)
                    if resp.status_code == 200:
                        print(f"  Cleared {name}")
                    else:
                        print(f"  Failed to clear {name}: {resp.status_code} {resp.text[:200]}")

                # Verify
                resp = req.post(url, headers=headers, json={"query": 'SELECT COUNT(*) FROM "AdRecord"'}, timeout=10)
                if resp.status_code == 200:
                    data = resp.json()
                    rows = data.get("rows", [[0]])
                    count = rows[0][0] if rows else "?"
                    print(f"  AdRecord count after clear: {count}")
            else:
                print("  Could not parse DATABASE_URL")
        except Exception as e:
            print(f"  DB clear failed: {e}")
            print("  Try running: npx prisma db execute --stdin <<< 'DELETE FROM \"AdRecord\"; DELETE FROM \"CrawlJob\"; DELETE FROM \"CompetitorScore\";'")

# ── 2. Clear Google Sheet ──
print("\n=== CLEARING GOOGLE SHEET ===")
try:
    import gspread
    from google.oauth2.service_account import Credentials

    CREDENTIALS_PATH = os.path.join(PROJECT_ROOT, "credentials.json")
    if not os.path.exists(CREDENTIALS_PATH):
        print("  credentials.json not found — skipping sheet clear")
    else:
        SCOPES = [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive",
        ]
        creds = Credentials.from_service_account_file(CREDENTIALS_PATH, scopes=SCOPES)
        client = gspread.authorize(creds)

        ss = client.open("Antigravity Intelligence")
        print(f"  Opened: {ss.title}")

        for ws in ss.worksheets():
            if ws.title in ("Legend & Instructions",):
                print(f"  Skipping tab: {ws.title}")
                continue
            # Clear data rows but keep headers
            all_vals = ws.get_all_values()
            if len(all_vals) > 1:
                # Keep row 1 (headers), delete everything below
                ws.resize(rows=1)
                ws.resize(rows=500)  # Restore capacity
                print(f"  Cleared tab: {ws.title} ({len(all_vals) - 1} rows removed)")
            else:
                print(f"  Tab already empty: {ws.title}")

        print(f"  Sheet URL: {ss.url}")

except ImportError:
    print("  gspread not installed — skipping sheet clear")
except Exception as e:
    print(f"  Sheet clear failed: {e}")

# ── 3. Clear tmp data files ──
print("\n=== CLEARING TMP FILES ===")
tmp_dir = os.path.join(PROJECT_ROOT, ".tmp")
if os.path.exists(tmp_dir):
    import glob
    files = glob.glob(os.path.join(tmp_dir, "*.json"))
    for f in files:
        os.remove(f)
        print(f"  Deleted: {os.path.basename(f)}")
    if not files:
        print("  No JSON files in .tmp/")
else:
    print("  .tmp/ does not exist")

print("\n=== DONE ===")
print("Ready for a fresh crawl!")
