# emotion_classifier.py
import os
import json
import re
import httpx
import torch
from typing import List
from fastapi import APIRouter
from pydantic import BaseModel
from dotenv import load_dotenv
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch.nn.functional as F

# === Setup environment and router ===
load_dotenv()
router = APIRouter()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# === Model loading ===
MODEL_NAME = "kashyaparun/Mental-Health-Chatbot-using-RoBERTa-fine-tuned-on-GoEmotion"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
model.eval()

class EmotionRequest(BaseModel):
    message: str

# === Phrase extraction via Gemini ===
async def extract_phrases_gemini(text: str) -> List[str]:
    prompt = (
        "Extract short emotional or psychological phrases from this message. "
        "Return only a JSON list, like: [\"feel sad\", \"can’t sleep\"]\n\n"
        f"{text}"
    )
    endpoint = (
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent"
        f"?key={GEMINI_API_KEY}"
    )
    payload = {"contents":[{"role":"user","parts":[{"text":prompt}]}]}

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(endpoint, json=payload, timeout=30)
        raw = res.json()["candidates"][0]["content"]["parts"][0]["text"]

        match = re.search(r"\[.*?\]", raw, re.DOTALL)
        if match:
            return json.loads(match.group(0).replace("'", "\""))

        # fallback split if JSON is malformed
        lines = re.split(r"[-•\n,]", raw)
        phrases = [line.strip(" -•.,*:\n\r\t\"'") for line in lines if len(line.strip())>2]
        return phrases if phrases else ["No valid phrases extracted."]
    except Exception as e:
        return [f"Failed to extract phrases: {e}"]

# === Emotion classification function ===
def classify_emotion(phrase: str) -> List[str]:
    inputs = tokenizer(phrase, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        logits = model(**inputs).logits.squeeze(0)
        probs = torch.sigmoid(logits).tolist()

    labels = model.config.id2label
    result = [label for idx, label in labels.items() if probs[idx] > 0.5]
    # If threshold yields nothing, pick top-1
    if not result:
        top = max(range(len(probs)), key=lambda i: probs[i])
        result = [labels.get(top)]
    return result

# === API endpoint ===
@router.post("/", tags=["Emotion Classification"])
async def emotion_analysis(req: EmotionRequest):
    phrases = await extract_phrases_gemini(req.message)
    if not phrases or "Failed" in phrases[0]:
        return {"error": phrases[0]}

    results = []
    for phrase in phrases:
        try:
            emotions = classify_emotion(phrase)
            results.append({"phrase": phrase, "emotions": emotions})
        except Exception as e:
            results.append({"phrase": phrase, "emotions": [f"Error: {e}"]})

    return {"results": results}
