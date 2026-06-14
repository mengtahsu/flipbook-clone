"""
Diagnose old iPhone button issue — Playwright with iPhone 12 + iOS 13 UA.
"""
import asyncio
from playwright.async_api import async_playwright

APP = "https://flipbook-clone-five.vercel.app"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # iPhone 12 with iOS 13 (4 years ago)
        ctx = await browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 13_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Mobile/15E148 Safari/604.1",
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True,
        )
        page = await ctx.new_page()

        print("[1] Loading page...")
        await page.goto(APP, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)
        await page.screenshot(path="C:\\workspace\\20260613_flipbook\\flipbook-clone\\screenshots\\01-homepage.png", full_page=True)
        print("    Homepage loaded")

        # Find search input - try multiple selectors
        print("[2] Finding search input...")
        inp = None
        for sel in ["#search-input", "input[type='search']", ".browser-address-input", "input"]:
            try:
                inp = await page.wait_for_selector(sel, timeout=3000)
                if inp:
                    print(f"    Found: {sel}")
                    break
            except:
                pass
        if not inp:
            print("    No input found! Dumping HTML...")
            print(await page.content()[:1000])
            await browser.close()
            return

        print("[3] Typing 'Bali'...")
        await inp.click()
        await inp.fill("Bali")
        await page.keyboard.press("Enter")
        print("    Waiting for results...")
        await page.wait_for_timeout(12000)
        await page.screenshot(path="C:\\workspace\\20260613_flipbook\\flipbook-clone\\screenshots\\02-after-search.png", full_page=True)

        # Check info card + buttons
        info_card = await page.query_selector(".info-card")
        print(f"    Info card visible: {info_card is not None}")

        # Scroll down to see the info card
        if info_card:
            await info_card.scroll_into_view_if_needed()
            await page.wait_for_timeout(500)

        subs = await page.query_selector_all(".info-panel-subtopic")
        print(f"    Subtopic buttons found: {len(subs)}")

        for i, btn in enumerate(subs[:5]):
            try:
                visible = await btn.is_visible()
                text = await btn.text_content()
                box = await btn.bounding_box()
                print(f"    [{i}] '{text}' visible={visible} box={box}")
            except Exception as e:
                print(f"    [{i}] error: {e}")

        # Computed styles
        if len(subs) > 0:
            btn = subs[0]
            styles = await btn.evaluate("""el => {
                const s = getComputedStyle(el);
                return {
                    display: s.display, visibility: s.visibility,
                    opacity: s.opacity, color: s.color,
                    background: s.background, border: s.border,
                    borderRadius: s.borderRadius,
                    pointerEvents: s.pointerEvents,
                    webkitAppearance: s.webkitAppearance,
                    width: s.width, height: s.height,
                    fontSize: s.fontSize,
                };
            }""")
            print(f"\n[4] Computed styles on first button:")
            for k, v in styles.items():
                print(f"    {k}: {v}")

        # Try clicking
        if len(subs) > 0:
            print(f"\n[5] Clicking '{await subs[0].text_content()}'...")
            try:
                await subs[0].click()
                await page.wait_for_timeout(8000)
                await page.screenshot(path="C:\\workspace\\20260613_flipbook\\flipbook-clone\\screenshots\\03-after-click.png", full_page=True)
                new_title = await page.query_selector(".info-card .info-panel-title")
                if new_title:
                    print(f"    New title: {await new_title.text_content()}")
                crumbs = await page.query_selector_all(".browser-breadcrumb-button")
                print(f"    Breadcrumbs: {len(crumbs)} layers")
            except Exception as e:
                print(f"    Click failed: {e}")

        await browser.close()
        print("\n[Done]")

asyncio.run(main())
