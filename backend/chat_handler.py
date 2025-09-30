import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from langchain.memory import ConversationBufferMemory

# Load environment variables
load_dotenv()

router = APIRouter()

# === Config ===
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions"

# Conversation memory
memory = ConversationBufferMemory(memory_key="history", return_messages=False)

class ChatRequest(BaseModel):
    message: str

@router.post("/", tags=["Chat"])
async def chat_handler(body: ChatRequest):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set")

    user_input = body.message
    memory.chat_memory.add_user_message(user_input)
    history_context = memory.load_memory_variables({}).get("history", "")

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
        "model": OPENAI_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 256
    }
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(OPENAI_ENDPOINT, headers=headers, json=payload)
            resp.raise_for_status()
    except Exception as e:
        reply = f"Model call failed: {e}"
        memory.chat_memory.add_ai_message(reply)
        return {"response": reply}

    data = resp.json()
    if "choices" not in data:
        reply = "Sorry, I couldn’t generate a response."
        memory.chat_memory.add_ai_message(reply)
        return {"response": reply}

    reply = data["choices"][0]["message"]["content"].strip()
    memory.chat_memory.add_ai_message(reply)
    return {"response": reply}
