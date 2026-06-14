"""
Vercel Python serverless function: DuckDuckGo Image Search.
POST /api/images  { "query": "..." }
"""
import json
import time
from http.server import BaseHTTPRequestHandler
from ddgs import DDGS

# Domains to completely reject (ads, spam, irrelevant)
_REJECT = {
    "etsy.com", "ebay.com", "amazon.com", "aliexpress.com",
    "pinterest.", "pinimg.com", "shutterstock.com", "istockphoto.com",
    "gettyimages.com", "alamy.com", "depositphotos.com", "dreamstime.com",
    "123rf.com", "unsplash.com", "pexels.com", "pixabay.com",
    "vecteezy.com", "freepik.com", "stock.adobe.com",
    "wallpaperflare.com", "wallpapercave.com", "wallpaperaccess.com",
    "hdwallpapers.in", "wallpapersden.com", "eskipaper.com",
}
_PREFERRED = {
    "flickr.com", "wikimedia.org", "wikipedia.org", "commons.wikimedia.org",
    "publicdomainpictures.net", "freeimages.com", "travel", "tourism",
    "britannica.com", "lonelyplanet.com", "nationalgeographic.com",
}


def _is_rejected(url: str, source: str) -> bool:
    for d in _REJECT:
        if d in url or d in source:
            return True
    return False


def _score(img: dict) -> float:
    score = 0.0
    url = img.get("url", "").lower()
    source = img.get("source", "").lower()
    w = int(img.get("width", 0))
    h = int(img.get("height", 0))
    px = w * h
    if px >= 2_000_000: score += 3
    elif px >= 800_000: score += 2
    elif px >= 300_000: score += 1
    if w > 0 and h > 0:
        ratio = w / h
        if 1.2 <= ratio <= 2.0: score += 2
        elif 0.8 <= ratio <= 3.0: score += 1
    for d in _PREFERRED:
        if d in url or d in source: score += 3; break
    if len(img.get("title", "")) > 30: score += 0.5
    return score


def search_images(query: str, max_results: int = 40) -> list[dict]:
    results = []
    seen = set()
    try:
        with DDGS() as ddgs:
            for r in ddgs.images(query, max_results=max(max_results * 5, 80)):
                url = r.get("image", "")
                if not url or url in seen:
                    continue
                seen.add(url)
                # Skip ad/spam/stock domains entirely
                if _is_rejected(url, r.get("source", "")):
                    continue
                img = {
                    "url": url,
                    "thumb": r.get("thumbnail", ""),
                    "title": r.get("title", ""),
                    "source": r.get("source", ""),
                    "width": int(r.get("width", 0)),
                    "height": int(r.get("height", 0)),
                }
                img["_score"] = _score(img)
                results.append(img)
                if len(results) >= max_results:
                    break
    except Exception:
        pass

    if results:
        results.sort(key=lambda x: (x["_score"], x["width"] * x["height"]), reverse=True)
        for r in results:
            del r["_score"]

    return results


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length))
        query = body.get("query", "")
        if not query:
            self._respond(400, {"error": "Missing query"})
            return
        results = search_images(query)
        self._respond(200 if results else 204, results)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _respond(self, status: int, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=True).encode())
