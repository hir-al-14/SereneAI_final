# backend/chat_handler.py
import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from langchain.memory import ConversationBufferMemory

# Load environment variables from .env if present
load_dotenv()

router = APIRouter()

# === Config ===
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# Default to Gemini Flash; override by setting GEMINI_MODEL in your .env if needed
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GEMINI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

# Conversation memory (keeps lightweight running context)
memory = ConversationBufferMemory(memory_key="history", return_messages=False)

class ChatRequest(BaseModel):
    message: str

def _extract_text_from_candidates(data: dict) -> str:
    """Safely extract text from Gemini REST 'candidates' response."""
    cands = data.get("candidates") or []
    if not cands:
        return ""
    # Take first candidate; concatenate all text parts
    parts = (cands[0].get("content") or {}).get("parts") or []
    texts = []
    for p in parts:
        # Each part is typically {"text": "..."}; ignore non-dict items safely
        if isinstance(p, dict):
            t = p.get("text", "")
            if t:
                texts.append(t)
    return "".join(texts).strip()

@router.post("/", tags=["Chat"])
async def chat_handler(body: ChatRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not set")

    user_input = body.message

    # Save user message in memory and load context
    memory.chat_memory.add_user_message(user_input)
    history_context = memory.load_memory_variables({}).get("history", "")

    # Build a concise, empathetic prompt
    prompt = f"""
You are a compassionate AI mental health assistant.
Use the chat history (if any) to keep context.
Keep replies short, warm, and supportive (5–7 lines).

Chat History:
{history_context}

User: {user_input}
Respond empathetically:
""".strip()

    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "maxOutputTokens": 256,
            "temperature": 0.7
        }
    }
    headers = {"Content-Type": "application/json"}

    # Call Gemini (Flash)
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{GEMINI_ENDPOINT}?key={GEMINI_API_KEY}",
                headers=headers,
                json=payload
            )
    except Exception as e:
        reply = f"Model call failed: {e}"
        memory.chat_memory.add_ai_message(reply)
        return {"response": reply}

    # Parse response JSON
    try:
        data = resp.json()
    except Exception:
        reply = f"Non-JSON response (HTTP {resp.status_code})."
        memory.chat_memory.add_ai_message(reply)
        return {"response": reply}

    # Transport / API error object
    if resp.status_code != 200 or "error" in data:
        err = data.get("error", {})
        code = err.get("code", resp.status_code)
        msg = err.get("message", "Unknown error")
        reply = f"Gemini API error ({code}): {msg}"
        memory.chat_memory.add_ai_message(reply)
        return {"response": reply}

    # Safety block (no candidates in some cases)
    fb = data.get("promptFeedback") or {}
    if fb.get("blockReason"):
        reply = f"Content blocked by safety filters ({fb['blockReason']}). Could you rephrase?"
        memory.chat_memory.add_ai_message(reply)
        return {"response": reply}

    # Extract text defensively
    text = _extract_text_from_candidates(data)
    reply = text if text else "Sorry, I couldn't generate a response this time."

    # Save assistant message in memory
    memory.chat_memory.add_ai_message(reply)
    return {"response": reply}
