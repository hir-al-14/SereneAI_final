from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict
import os, re, json, httpx
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions"
OPENAI_MODERATION_ENDPOINT = "https://api.openai.com/v1/moderations"
OPENAI_MOD_MODEL = os.getenv("OPENAI_MOD_MODEL", "omni-moderation-latest")

router = APIRouter()

CRISIS_REGEXES = [
    r"kill myself", r"end my life", r"take my life",
    r"i don'?t want to live", r"don'?t want to be alive",
    r"i wish i (?:were|was) dead", r"i should die",
    r"better off dead", r"hurt myself", r"self[-\s]?harm",
    r"suicide", r"suicidal", r"cutting", r"overdose",
    r"jump off", r"hang myself"
]

class CrisisInput(BaseModel):
    message: str

def headers():
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY missing")
    return {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}

def hit_crisis_rules(text: str) -> bool:
    lower = text.lower()
    for pattern in CRISIS_REGEXES:
        if re.search(pattern, lower):
            return True
    return False

async def call_openai_moderation(text: str):
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                OPENAI_MODERATION_ENDPOINT,
                headers=headers(),
                json={"model": OPENAI_MOD_MODEL, "input": text},
            )
            res.raise_for_status()
            data = res.json()
            cats = data["results"][0].get("categories", {})
            # if self-harm flagged -> True
            if any(cats.get(k, False) for k in cats.keys() if "self" in k or "suicide" in k):
                return True
    except Exception:
        pass
    return False

@router.post("/", tags=["Crisis Detection"])
async def detect_crisis(input: CrisisInput):
    text = input.message
    # Step 1: rule-based hit
    if hit_crisis_rules(text):
        return {"label": "CRISIS", "phrases": [text], "scored": [{"text": text, "score": 10}]}

    # Step 2: moderation
    mod_flag = await call_openai_moderation(text)
    if mod_flag:
        return {"label": "CRISIS", "phrases": [text], "scored": [{"text": text, "score": 10}]}

    # Step 3: else HIGH_RISK by default if text contains distress words
    distress_words = ["anxious", "panic", "hopeless", "depressed", "hate myself", "body", "can't sleep"]
    if any(w in text.lower() for w in distress_words):
        return {"label": "HIGH_RISK", "phrases": [text], "scored": [{"text": text, "score": 6}]}

    # Step 4: normal fallback
    return {"label": "NORMAL", "phrases": [text], "scored": [{"text": text, "score": 3}]}
