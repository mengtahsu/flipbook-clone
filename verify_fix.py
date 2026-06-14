import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            viewport={"width": 390, "height": 844},
            is_mobile=True, has_touch=True,
        )
        page = await ctx.new_page()
        print("[1] Loading...")
        await page.goto("https://flipbook-clone-five.vercel.app", wait_until="networkidle")
        inp = await page.wait_for_selector("input[type='search']", timeout=5000)
        await inp.fill("Bali")
        await page.keyboard.press("Enter")
        await page.wait_for_timeout(12000)

        info = await page.query_selector(".info-card")
        if info:
            await info.scroll_into_view_if_needed()
        await page.wait_for_timeout(500)

        subs = await page.query_selector_all(".info-panel-subtopic")
        print(f"[2] Buttons found: {len(subs)}")

        if subs:
            s = await subs[0].evaluate("""el => {
                const cs = getComputedStyle(el);
                return { opacity: cs.opacity, color: cs.color, height: cs.height, bg: cs.backgroundColor };
            }""")
            print(f"    opacity={s['opacity']} color={s['color']} height={s['height']}")
            visible = await subs[0].is_visible()
            print(f"    visible={visible}")

            # Try clicking
            print("[3] Clicking first button...")
            await subs[0].click()
            await page.wait_for_timeout(8000)
            new_title = await page.query_selector(".info-card .info-panel-title")
            if new_title:
                print(f"    OK - navigated to: {await new_title.text_content()}")
            else:
                print("    FAIL - no navigation")
        await browser.close()

asyncio.run(main())
