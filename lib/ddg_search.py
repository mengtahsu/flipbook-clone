"""
DuckDuckGo Image Search helper for Flipbook Clone.
Fetches many images, filters watermarks, scores quality, returns best.

Usage: python ddg_search.py "search query"
Output: JSON array of image results to stdout (sorted best-first)
"""
import sys
import json
from ddgs import DDGS

# Domains known for watermarks or low-quality stock photos — deprioritize
LOW_QUALITY_DOMAINS = {
    "shutterstock.com", "istockphoto.com", "gettyimages.com",
    "alamy.com", "depositphotos.com", "dreamstime.com", "123rf.com",
    "adobe.com/stock", "stock.adobe.com",
}

# Preferred domains — free/CC image hosts
PREFERRED_DOMAINS = {
    "unsplash.com", "pexels.com", "pixabay.com", "flickr.com",
    "wikimedia.org", "wikipedia.org", "commons.wikimedia.org",
    "publicdomainpictures.net", "freeimages.com",
}


def score_image(img: dict) -> float:
    """Score an image result. Higher = better."""
    score = 0.0
    url = img.get("url", "").lower()
    source = img.get("source", "").lower()

    # Prefer larger images
    width = int(img.get("width", 0))
    height = int(img.get("height", 0))
    pixels = width * height
    if pixels >= 2000000:   # 2MP+
        score += 3
    elif pixels >= 800000:  # 0.8MP+
        score += 2
    elif pixels >= 300000:  # 0.3MP+
        score += 1

    # Prefer reasonable aspect ratio (not extreme panoramas or tall crops)
    if width > 0 and height > 0:
        ratio = width / height
        if 1.2 <= ratio <= 2.0:
            score += 2
        elif 0.8 <= ratio <= 1.2 or 2.0 < ratio <= 3.0:
            score += 1

    # Penalize watermarked stock sites
    for domain in LOW_QUALITY_DOMAINS:
        if domain in url or domain in source:
            score -= 5
            break

    # Reward preferred sources
    for domain in PREFERRED_DOMAINS:
        if domain in url or domain in source:
            score += 3
            break

    # Title length heuristic — very short titles often = low effort
    title_len = len(img.get("title", ""))
    if title_len > 30:
        score += 0.5

    return score


def search_images(query: str, max_results: int = 20) -> list[dict]:
    """Search DuckDuckGo for images, filter, score, and sort."""
    results: list[dict] = []
    try:
        with DDGS() as ddgs:
            for result in ddgs.images(query, max_results=max_results):
                img = {
                    "url": result.get("image", ""),
                    "thumb": result.get("thumbnail", ""),
                    "title": result.get("title", ""),
                    "source": result.get("source", ""),
                    "width": int(result.get("width", 0)),
                    "height": int(result.get("height", 0)),
                }
                img["_score"] = score_image(img)
                results.append(img)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return []

    # Sort by score descending, then by resolution
    results.sort(key=lambda x: (x["_score"], x["width"] * x["height"]), reverse=True)

    # Remove scoring key from output
    for r in results:
        del r["_score"]

    return results


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps([]))
        sys.exit(0)

    query = " ".join(sys.argv[1:])
    images = search_images(query)
    print(json.dumps(images, ensure_ascii=True))
