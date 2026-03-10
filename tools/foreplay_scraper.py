"""
tools/foreplay_scraper.py — Project Antigravity
Fallback Playwright scraper for Foreplay when API key is unavailable.
Authenticates via email/password, extracts video CDN URLs from share pages.
"""
import os
import asyncio
from typing import Optional

# Credentials from .env
FOREPLAY_EMAIL = os.environ.get("FOREPLAY_EMAIL", "")
FOREPLAY_PASSWORD = os.environ.get("FOREPLAY_PASSWORD", "")
FOREPLAY_LOGIN_URL = "https://app.foreplay.co/login"


async def get_session_cookies() -> dict:
    """
    Login to Foreplay and return authenticated cookies.
    Cookies expire after ~4 hours — refresh every 3 hours.
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print("❌ Playwright not installed. Run: pip install playwright && playwright install chromium")
        return {}

    if not FOREPLAY_EMAIL or not FOREPLAY_PASSWORD:
        print("❌ FOREPLAY_EMAIL or FOREPLAY_PASSWORD not set in .env")
        return {}

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        try:
            await page.goto(FOREPLAY_LOGIN_URL, wait_until="networkidle")
            await page.fill('input[type="email"]', FOREPLAY_EMAIL)
            await page.fill('input[type="password"]', FOREPLAY_PASSWORD)
            await page.click('button[type="submit"]')
            await page.wait_for_url("**/app/**", timeout=15000)

            cookies = await page.context.cookies()
            await browser.close()
            return {c["name"]: c["value"] for c in cookies}
        except Exception as e:
            print(f"❌ Foreplay login failed: {e}")
            await browser.close()
            return {}


async def scrape_share_url(share_url: str, cookies: dict) -> dict:
    """
    Navigate to a Foreplay share URL and extract:
    - videoUrl (CDN direct link)
    - landingPageUrl
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        return {"videoUrl": "", "landingPageUrl": ""}

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()

        # Set cookies for authentication
        await context.add_cookies([
            {"name": k, "value": v, "domain": "app.foreplay.co", "path": "/"}
            for k, v in cookies.items()
        ])

        page = await context.new_page()

        # Intercept network to capture video CDN URL
        video_url = None

        async def handle_response(response):
            nonlocal video_url
            url = response.url
            if any(ext in url for ext in [".mp4", ".mov", "cdn.foreplay", "fbcdn"]):
                video_url = url

        page.on("response", handle_response)

        try:
            await page.goto(share_url, wait_until="networkidle", timeout=30000)

            # Extract landing page URL
            landing_page = await page.evaluate("""
                () => {
                    const links = Array.from(document.querySelectorAll('a[href]'));
                    const external = links.find(a =>
                        !a.href.includes('foreplay.co') &&
                        !a.href.includes('facebook.com') &&
                        a.href.startsWith('http')
                    );
                    return external ? external.href : '';
                }
            """)

            await browser.close()
            return {
                "videoUrl": video_url or "",
                "landingPageUrl": landing_page or "",
            }
        except Exception as e:
            print(f"❌ Foreplay scrape error: {e}")
            await browser.close()
            return {"videoUrl": "", "landingPageUrl": ""}


def get_session_cookies_sync() -> dict:
    """Synchronous wrapper for get_session_cookies."""
    return asyncio.run(get_session_cookies())


def scrape_share_url_sync(share_url: str, cookies: dict) -> dict:
    """Synchronous wrapper for scrape_share_url."""
    return asyncio.run(scrape_share_url(share_url, cookies))


if __name__ == "__main__":
    cookies = get_session_cookies_sync()
    if cookies:
        print(f"✅ Got {len(cookies)} session cookies")
    else:
        print("❌ Failed to get session cookies")
