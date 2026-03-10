"""
tools/cleanup.py — One-time cleanup: clear Google Sheet + truncate DB tables.
Run: python tools/cleanup.py
"""
import sys
import os

# Fix Windows encoding
if sys.platform == "win32":
    for stream in [sys.stdout, sys.stderr]:
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__))

# ── 1. Clear Google Sheet ──
print("=== Clearing Google Sheet ===")
try:
    from gsheet_writer import _get_client, TAB1, TAB2, TAB3, TAB1_HEADERS, TAB2_HEADERS, TAB3_HEADERS

    client = _get_client()
    ss = client.open("Antigravity Intelligence")

    for tab_name, headers in [(TAB1, TAB1_HEADERS), (TAB2, TAB2_HEADERS), (TAB3, TAB3_HEADERS)]:
        try:
            ws = ss.worksheet(tab_name)
            ws.clear()
            ws.update([headers], "A1")
            ws.freeze(rows=1)
            print(f"  Cleared & reset headers: {tab_name}")
        except Exception as e:
            print(f"  Skipped {tab_name}: {e}")

    print(f"  Sheet URL: {ss.url}")
    print("Google Sheet cleared successfully!")
except Exception as e:
    print(f"ERROR clearing Google Sheet: {e}")

# ── 2. Truncate DB tables ──
print("\n=== Truncating DB tables ===")
try:
    # Load .env
    from dotenv import load_dotenv
    load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        print("ERROR: DATABASE_URL not set in .env")
        sys.exit(1)

    import psycopg2
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()

    tables = ["AdRecord", "CompetitorScore", "CrawlJob"]
    for table in tables:
        try:
            cur.execute(f'TRUNCATE TABLE "{table}" CASCADE;')
            print(f'  Truncated: {table}')
        except Exception as e:
            conn.rollback()
            print(f'  Skipped {table}: {e}')

    conn.commit()
    cur.close()
    conn.close()
    print("DB tables truncated successfully!")
except ImportError:
    print("psycopg2 not installed. Trying with prisma raw SQL via Node...")
    print("Run manually: npx prisma db execute --stdin <<< 'TRUNCATE \"AdRecord\", \"CompetitorScore\", \"CrawlJob\" CASCADE;'")
except Exception as e:
    print(f"ERROR truncating DB: {e}")

print("\nDone! Next crawl will write fresh data with the new 32-column schema.")
