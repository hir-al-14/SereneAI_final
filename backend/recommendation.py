import os
import httpx
from typing import List, Dict
from fastapi import APIRouter
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GEMINI_ENDPOINT = (
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent"
    f"?key={GEMINI_API_KEY}"
)

class RecommendationRequest(BaseModel):
    emotions: List[str]

def build_prompt(emotions: List[str]) -> str:
    return (
        f"The user is feeling these emotions or problems in life cuurently: {', '.join(emotions)}.\n"
        "Recommend 5 uplifting MOVIES, 5 BOOKS, and 5 SONGS that can help them feel better emotionally. "
        "Make sure these suggestions counteract or reverse the negative feelings.\n\n"
        "Return ONLY in the given format:\n"
        "Movies:\n- Name 1\n- Name 2\n...\n"
        "Books:\n- Name 1\n- Name 2\n...\n"
        "Songs:\n- Name 1\n- Name 2\n..."
    )

def parse_response(text: str) -> List[Dict[str, str]]:
    result = []
    current_category = None
    for line in text.splitlines():
        line = line.strip()
        if line.lower().startswith("movies"):
            current_category = "movie"
        elif line.lower().startswith("books"):
            current_category = "book"
        elif line.lower().startswith("songs"):
            current_category = "song"
        elif line.startswith("-") and current_category:
            name = line.lstrip("-").strip()
            if name:
                result.append({"name": name, "category": current_category})
    return result

@router.post("/", tags=["Recommendations"])
async def get_recommendations(req: RecommendationRequest):
    prompt = build_prompt(req.emotions)
    payload = {"contents": [{"role": "user", "parts": [{"text": prompt}]}]}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(GEMINI_ENDPOINT, json=payload, timeout=30)
        raw_text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        recommendations = parse_response(raw_text)
        return {"recommendations": recommendations}
    except Exception as e:
        return {"error": str(e)}