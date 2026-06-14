"""Sanity test for flipbook-clone. Tests search, click, images endpoints."""
import urllib.request, json, time, sys

BASE = "https://flipbook-clone-five.vercel.app"
QUERIES = ["東京", "巴黎", "巴里島", "火箭引擎", "壽司", "長城", "北極光"]
PASS, FAIL = 0, 0

def test(name, fn):
    global PASS, FAIL
    try:
        fn()
        PASS += 1
        print(f"  [PASS] {name}")
    except Exception as e:
        FAIL += 1
        print(f"  [FAIL] {name}: {e}")

def api(path, body=None):
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(f"{BASE}{path}", data, {"Content-Type": "application/json"}) if data else urllib.request.Request(f"{BASE}{path}")
    return json.loads(urllib.request.urlopen(req, timeout=30).read())

# Test 1: Search endpoint
print("=== Search API ===")
for q in QUERIES[:4]:
    def do(q=q):
        d = api("/api/search", {"query": q, "breadcrumbs": [], "depth": 1})
        assert d.get("title"), f"No title for {q}"
        assert d.get("imageSearchTerm"), f"No imageSearchTerm for {q}"
        assert len(d.get("subtopics", [])) >= 2, f"Too few subtopics: {d.get('subtopics')}"
        print(f"    {q}: {d['title']} | term={d['imageSearchTerm']}")
    test(f"Search '{q}'", do)
    time.sleep(1)

# Test 2: DDG images endpoint
print("\n=== DDG Images ===")
for q in ["Tokyo", "Paris France"]:
    def do(q=q):
        d = api("/api/images", {"query": q})
        assert len(d) >= 5, f"Only {len(d)} images for {q}"
        assert d[0].get("url"), f"No URL in first image for {q}"
        print(f"    {q}: {len(d)} images, first={d[0]['url'][:60]}...")
    test(f"Images '{q}'", do)

# Test 3: Click endpoint
print("\n=== Click API ===")
def do_click():
    d = api("/api/click", {"x": 50, "y": 50, "imageWidth": 1200, "imageHeight": 800, "currentTitle": "東京", "currentDescription": "日本首都", "breadcrumbs": ["東京"], "depth": 1})
    assert d.get("subQuery"), f"No subQuery: {d}"
    print(f"    Click on 東京 -> {d['subQuery']}")
test("Click inference", do_click)

# Test 4: Homepage
print("\n=== Homepage ===")
def do_home():
    req = urllib.request.Request(f"{BASE}/")
    html = urllib.request.urlopen(req, timeout=10).read().decode()
    assert "flipbook" in html.lower(), "Homepage missing flipbook"
    assert "輸入" in html or "探索" in html, "Homepage missing Chinese text"
    print(f"    OK ({len(html)} bytes)")
test("Homepage loads", do_home)

print(f"\n{'='*30}")
print(f"Results: {PASS} pass, {FAIL} fail")
sys.exit(0 if FAIL == 0 else 1)
