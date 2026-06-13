"""
Playwright smoke test for the Flipbook Clone.
Runs against localhost:3456.
Tests: page loads, UI elements render, empty state shows.
"""
import asyncio
from playwright.async_api import async_playwright

APP_URL = "http://localhost:3456"


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
        )
        page = await context.new_page()

        results = {"pass": 0, "fail": 0, "tests": []}

        def check(name: str, condition: bool, detail: str = ""):
            if condition:
                results["pass"] += 1
                results["tests"].append(f"  [PASS] {name}")
            else:
                results["fail"] += 1
                results["tests"].append(f"  [FAIL] {name} — {detail}")

        # Test 1: Page loads
        print("[test] Loading app...")
        try:
            await page.goto(APP_URL, wait_until="networkidle", timeout=15000)
            check("Page loads", True)
        except Exception as e:
            check("Page loads", False, str(e))
            print("\n--- Results ---")
            for t in results["tests"]:
                print(t)
            await browser.close()
            return

        # Test 2: Title
        title = await page.title()
        check("Page has title", len(title) > 0, f"title='{title}'")
        print(f"  Title: {title}")

        # Test 3: Browser shell exists
        shell = await page.locator(".browser-stage").count()
        check("Browser shell renders", shell > 0, f"found {shell} .browser-stage elements")

        # Test 4: Toolbar exists
        toolbar = await page.locator(".browser-toolbar").count()
        check("Toolbar renders", toolbar > 0, f"found {toolbar} .browser-toolbar elements")

        # Test 5: Window controls (dots)
        dots = await page.locator(".browser-dot").count()
        check("Window control dots render", dots >= 3, f"found {dots} dots")

        # Test 6: Search input exists
        search_inputs = await page.locator(".browser-address-input").count()
        check("Search input renders", search_inputs > 0, f"found {search_inputs} inputs")

        # Test 7: Search input has placeholder
        placeholder = await page.locator(".browser-address-input").getAttribute("placeholder")
        check("Search has placeholder", placeholder is not None and len(placeholder) > 0,
              f"placeholder='{placeholder}'")
        print(f"  Placeholder: {placeholder}")

        # Test 8: Empty state shows
        empty_state = await page.locator(".empty-state").count()
        check("Empty state renders", empty_state > 0, f"found {empty_state} empty state elements")

        # Test 9: About section exists
        about = await page.locator(".about-section").count()
        check("About section renders", about > 0, f"found {about} about sections")

        # Test 10: About title has content
        about_title = await page.locator(".about-title").text_content()
        check("About title has content", about_title is not None and len(about_title) > 10,
              f"title='{about_title[:60]}...'")

        # Test 11: Screenshot
        await page.screenshot(
            path="C:\\workspace\\20260613_flipbook\\flipbook-clone\\smoke-test-screenshot.png",
            full_page=True,
        )
        check("Screenshot saved", True)

        # Test 12: Type in search bar and verify
        search_input = page.locator(".browser-address-input").first
        await search_input.click()
        await search_input.fill("Paris")
        value = await search_input.input_value()
        check("Can type in search input", value == "Paris", f"value='{value}'")

        await page.screenshot(
            path="C:\\workspace\\20260613_flipbook\\flipbook-clone\\smoke-test-typed.png",
            full_page=False,
        )

        # Summary
        total = results["pass"] + results["fail"]
        print(f"\n--- Results: {results['pass']}/{total} passed ---")
        for t in results["tests"]:
            print(t)

        await browser.close()

        if results["fail"] > 0:
            exit(1)


if __name__ == "__main__":
    asyncio.run(main())
