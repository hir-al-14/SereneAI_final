import os
import httpx
from typing import List, Dict
from fastapi import APIRouter
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions"

class RecommendationRequest(BaseModel):
    emotions: List[str]

def build_prompt(emotions: List[str]) -> str:
    return (
        f"The user is feeling these emotions or problems in life currently: {', '.join(emotions) if emotions else 'general sadness and stress'}.\n"
        "Recommend 5 uplifting MOVIES, 5 BOOKS, and 5 SONGS that can help them feel better emotionally. "
        "Make sure these suggestions counteract or reverse the negative feelings.\n\n"
        "Return ONLY in the given format:\n"
        "Movies:\n- Name 1\n- Name 2\n- Name 3\n- Name 4\n- Name 5\n"
        "Books:\n- Name 1\n- Name 2\n- Name 3\n- Name 4\n- Name 5\n"
        "Songs:\n- Name 1\n- Name 2\n- Name 3\n- Name 4\n- Name 5\n"
    )

# Fallbacks to guarantee all three categories have 5
FALLBACKS = {
    "movie": ["Inside Out","The Pursuit of Happyness","Amélie","The Secret Life of Walter Mitty","Paddington 2"],
    "book":  ["The Alchemist","Big Magic","Tiny Beautiful Things","The Boy, the Mole, the Fox and the Horse","The Gifts of Imperfection"],
    "song":  ["Here Comes the Sun","Brave","Shake It Out","Three Little Birds","Stronger (What Doesn’t Kill You)"],
}

def parse_response(text: str) -> List[Dict[str, str]]:
    result, category = [], None
    for line in text.splitlines():
        l = line.strip()
        if not l:
            continue
        low = l.lower()
        if low.startswith("movies"): category = "movie"; continue
        if low.startswith("books"):  category = "book";  continue
        if low.startswith("songs"):  category = "song";  continue
        if l.startswith("-") and category:
            name = l.lstrip("-").strip()
            if name:
                result.append({"name": name, "category": category})
    return result

def ensure_three_groups(items: List[Dict[str,str]]) -> List[Dict[str,str]]:
    by = {"movie": [], "book": [], "song": []}
    seen = set()
    for it in items:
        cat = it.get("category","movie")
        name = (it.get("name") or "").strip()
        if not name: continue
        key = (cat, name.lower())
        if key in seen: continue
        seen.add(key)
        if cat in by:
            by[cat].append(name)
    # top up to 5 each
    out: List[Dict[str,str]] = []
    for cat in ("movie","book","song"):
        arr = by[cat]
        fb = [t for t in FALLBACKS[cat] if t.lower() not in {a.lower() for a in arr}]
        while len(arr) < 5 and fb:
            arr.append(fb.pop(0))
        # last-resort placeholders
        while len(arr) < 5:
            arr.append(f"{cat.title()} Pick {len(arr)+1}")
        out.extend({"name": n, "category": cat} for n in arr[:5])
    return out

@router.post("/", tags=["Recommendations"])
async def get_recommendations(req: RecommendationRequest):
    prompt = build_prompt(req.emotions or [])
    payload = {"model": OPENAI_MODEL, "messages": [{"role": "user", "content": prompt}]}
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}

    try:
        async with httpx.AsyncClient(timeout=40) as client:
            resp = await client.post(OPENAI_ENDPOINT, headers=headers, json=payload)
            resp.raise_for_status()
            raw_text = resp.json()["choices"][0]["message"]["content"]
            parsed = parse_response(raw_text)
            guaranteed = ensure_three_groups(parsed)
            return {"recommendations": guaranteed}
    except httpx.HTTPStatusError as e:
        # on any error, serve pure fallbacks so UI still shows all 3
        fallback = ensure_three_groups([])
        return {"recommendations": fallback, "error": f"OpenAI HTTP {e.response.status_code}"}
    except Exception as e:
        fallback = ensure_three_groups([])
        return {"recommendations": fallback, "error": f"Recommendation error: {e}"}
