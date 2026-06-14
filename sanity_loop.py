"""Continuous sanity test loop — runs until time limit."""
import urllib.request, json, time, sys

NSFW_WORDS = {"porn", "xxx", "adult", "nsfw", "nude", "naked", "sex", "hentai", "erotic", "onlyfans", "18+", "explicit"}

def is_safe(text):
    t = (text or "").lower()
    return not any(w in t for w in NSFW_WORDS)

BASE = "https://flipbook-clone-five.vercel.app"
QUERIES = ["東京", "巴黎", "峇里島", "火箭", "長城", "北極光", "潛水", "火山", "太空站", "壽司", "倫敦", "紐約"]
DEADLINE = time.time() + 600  # 10 minutes
passes = fails = fixes = 0

def api(path, body=None):
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(f"{BASE}{path}", data, {"Content-Type": "application/json"}) if data else urllib.request.Request(f"{BASE}{path}")
    return json.loads(urllib.request.urlopen(req, timeout=30).read())

def test(name, fn):
    global passes, fails
    try:
        fn()
        passes += 1
    except Exception as e:
        fails += 1
        print(f"  [FAIL] {name}: {str(e)[:100]}")

iteration = 0
while time.time() < DEADLINE:
    iteration += 1
    q = QUERIES[iteration % len(QUERIES)]
    mins_left = int((DEADLINE - time.time()) / 60)

    # Test search -> click -> drill-down
    try:
        d1 = api("/api/search", {"query": q, "breadcrumbs": [], "depth": 1})
        passes += 1
        assert d1.get("title") and d1.get("subtopics"), f"Search failed for {q}"
        assert is_safe(d1.get("title","")), f"NSFW title: {d1['title']}"
        assert is_safe(d1.get("description","")), f"NSFW description"

        if d1.get("subtopics"):
            sub = d1["subtopics"][0]
            d2 = api("/api/search", {"query": f"{q} {sub}", "breadcrumbs": [d1["title"]], "depth": 2})
            passes += 1
            assert d2.get("title"), f"Layer 2 failed"

            # Click test
            d3 = api("/api/click", {"x": 30, "y": 40, "imageWidth": 1200, "imageHeight": 800, "currentTitle": d2["title"], "currentDescription": d2["description"], "breadcrumbs": [d1["title"], d2["title"]], "depth": 2})
            passes += 1
            assert d3.get("subQuery"), "Click inference failed"
    except Exception as e:
        fails += 1

    # Test DDG images + LLM relevance check
    try:
        term = d1.get("imageSearchTerm", q)
        imgs = api("/api/images", {"query": term})
        passes += 1
        if len(imgs) < 3:
            fails += 1
            print(f"\n  [FAIL] Only {len(imgs)} images for term={term}")
        if imgs:
            r = api("/api/click", {
                "x": 50, "y": 50, "imageWidth": 1, "imageHeight": 1,
                "currentTitle": "CHECK_IMAGE",
                "currentDescription": f"Is this image relevant to '{q}'? Title: {imgs[0].get('title','')} Source: {imgs[0].get('source','')}. Answer YES or NO.",
                "breadcrumbs": [], "depth": 0,
            })
            if "NO" in r.get("subQuery", "").upper():
                fails += 1
                print(f"\n  [FAIL] LLM: image NOT relevant for {q}: {imgs[0].get('title','')[:50]}")
    except Exception as e:
        fails += 1

    ok = passes - fails
    msg = f"[{iteration}] {q:6s} | {ok} ok {fails} fail | {mins_left}min left"
    print(msg, flush=True)
    time.sleep(3)

print(f"\n\n=== SANITY TEST COMPLETE ===")
print(f"Iterations: {iteration}")
print(f"Passes: {passes}")
print(f"Fails: {fails}")
print(f"Bugs fixed: {fixes}")
