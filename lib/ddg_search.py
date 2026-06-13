"""
DuckDuckGo Image Search helper (local dev fallback).
Usage: python ddg_search.py "search query"
"""
import sys, json
from ddgs import DDGS

_PENALIZED = {
    "shutterstock.com", "istockphoto.com", "gettyimages.com",
    "alamy.com", "depositphotos.com", "dreamstime.com", "123rf.com",
    "unsplash.com", "pexels.com", "pixabay.com",
}
_PREFERRED = {
    "flickr.com", "wikimedia.org", "wikipedia.org",
    "publicdomainpictures.net", "freeimages.com",
}


def _score(img: dict) -> float:
    s = 0.0
    url = img.get("url", "").lower()
    src = img.get("source", "").lower()
    w, h = int(img.get("width", 0)), int(img.get("height", 0))
    px = w * h
    if px >= 2_000_000: s += 3
    elif px >= 800_000: s += 2
    elif px >= 300_000: s += 1
    if w > 0 and h > 0:
        r = w / h
        if 1.2 <= r <= 2.0: s += 2
        elif 0.8 <= r <= 3.0: s += 1
    for d in _PENALIZED:
        if d in url or d in src: s -= 5; break
    for d in _PREFERRED:
        if d in url or d in src: s += 3; break
    if len(img.get("title", "")) > 30: s += 0.5
    return s


def search_images(query: str, max_results: int = 20) -> list:
    results, seen = [], set()
    try:
        with DDGS() as ddgs:
            for r in ddgs.images(query, max_results=60):
                url = r.get("image", "")
                if not url or url in seen: continue
                seen.add(url)
                img = {
                    "url": url, "thumb": r.get("thumbnail", ""),
                    "title": r.get("title", ""), "source": r.get("source", ""),
                    "width": int(r.get("width", 0)), "height": int(r.get("height", 0)),
                }
                img["_score"] = _score(img)
                results.append(img)
                if len(results) >= max_results: break
    except Exception: pass

    if results:
        results.sort(key=lambda x: (x["_score"], x["width"] * x["height"]), reverse=True)
        for r in results: del r["_score"]
    return results


if __name__ == "__main__":
    q = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else ""
    print(json.dumps(search_images(q), ensure_ascii=True))
