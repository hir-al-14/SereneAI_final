# backend/chat_handler.py

import os
import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from dotenv import load_dotenv
from langchain.memory import ConversationBufferMemory

# Load environment variables
load_dotenv()

router = APIRouter()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Initialize memory
memory = ConversationBufferMemory(memory_key="history", return_messages=False)

# Request schema
class ChatRequest(BaseModel):
    message: str

# Chat endpoint
@router.post("/", tags=["Chat"])
async def chat_handler(body: ChatRequest):
    user_input = body.message

    # Store user message in memory
    memory.chat_memory.add_user_message(user_input)

    # Load chat history
    history_context = memory.load_memory_variables({})["history"]

    # Prepare prompt
    prompt = f"""
You are a compassionate AI mental health assistant.
Use the following chat history to maintain context.

Chat History:
{history_context}

User: {user_input}
Respond empathetically:
"""

    # Gemini API endpoint
    endpoint = (
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent"
        f"?key={GEMINI_API_KEY}"
    )

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}]
            }
        ]
    }

    headers = {"Content-Type": "application/json"}

    # Make async HTTP call
    async with httpx.AsyncClient() as client:
        response = await client.post(endpoint, headers=headers, json=payload, timeout=30.0)

    # Parse Gemini response
    try:
        reply = response.json()["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        reply = f"Gemini API error: {str(e)}"

    # Store AI message in memory
    memory.chat_memory.add_ai_message(reply)

    return {"response": reply}
