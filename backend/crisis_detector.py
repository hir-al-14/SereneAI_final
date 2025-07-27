from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import httpx
import os
import re
import json
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

router = APIRouter()

class CrisisInput(BaseModel):
    message: str

# === Helper: Call Gemini API ===
async def call_gemini(prompt: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}]
    }

    async with httpx.AsyncClient() as client:
        res = await client.post(url, headers={"Content-Type": "application/json"}, json=payload, timeout=30)

    if res.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Gemini failed: {res.status_code} - {res.text}")

    data = res.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        raise HTTPException(status_code=500, detail="Crisis detection failed: 'candidates'")

# === Step 1: Extract Emotional Phrases ===
async def extract_phrases(message: str) -> List[str]:
    prompt = (
        "Extract emotional or psychological phrases from the message. "
        "Return ONLY a JSON list like [\"I feel anxious\", \"can't sleep\"]:\n\n"
        f"{message}"
    )
    raw = await call_gemini(prompt)
    raw = raw.replace("“", "\"").replace("”", "\"").replace("’", "'")

    # Try to parse as JSON list
    match = re.search(r"\[.*?\]", raw, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group(0))
            if isinstance(parsed, list):
                return parsed
        except:
            pass

    # Fallback: use simple line-by-line split
    lines = [line.strip("-• \n\"'") for line in raw.splitlines()]
    return [line for line in lines if line and len(line.split()) <= 10]

# === Step 2: Score phrases ===
async def score_phrases(phrases: List[str]) -> List[dict]:
    prompt = (
        "You are a clinical mental health AI assistant. "
        "Rate the **psychological severity** of each phrase on a scale of 0 to 10, where:\n"
        "- 0–3 = NORMAL (no concerning language)\n"
        "- 4–6 = HIGH_RISK (stress, anxiety, burnout, but no direct harm)\n"
        "- 7–10 = CRISIS (language suggesting harm, suicide, or hopelessness)\n\n"
        f"Phrases: {phrases}\n\n"
        "Return ONLY JSON like:\n"
        "[{\"text\": \"I feel exhausted\", \"score\": 3}, {\"text\": \"I want to disappear\", \"score\": 9}]"
    )
    raw = await call_gemini(prompt)
    match = re.search(r"\[.*?\]", raw, re.DOTALL)
    if not match:
        raise HTTPException(status_code=500, detail="Crisis detection failed: No scores returned.")
    
    try:
        return json.loads(match.group(0))
    except:
        raise HTTPException(status_code=500, detail="Crisis detection failed: Invalid JSON for scores.")

# === Step 3: Classify Risk ===
def classify(scores: List[dict]) -> str:
    total = sum(s["score"] for s in scores)
    avg = total / len(scores) if scores else 0

    if avg >= 7:
        return "CRISIS"
    elif avg >= 4:
        return "HIGH_RISK"
    else:
        return "NORMAL"

# === Endpoint ===
@router.post("/crisis", tags=["Crisis Detection"])
async def detect_crisis(input: CrisisInput):
    try:
        phrases = await extract_phrases(input.message)
        if not phrases:
            raise HTTPException(status_code=400, detail="Crisis detection failed: No valid phrases extracted")

        scores = await score_phrases(phrases)
        label = classify(scores)

        return {
            "label": label,
            "phrases": phrases,
            "scored": scores
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Crisis detection failed: {e}")