# backend/audio_handler.py
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from dotenv import load_dotenv
import httpx, os, io

load_dotenv()
router = APIRouter()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_STT_MODEL = os.getenv("OPENAI_STT_MODEL", "whisper-1")
OPENAI_TTS_MODEL = os.getenv("OPENAI_TTS_MODEL", "tts-1")
OPENAI_TTS_VOICE = os.getenv("OPENAI_TTS_VOICE", "alloy")

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set")

HEADERS = {"Authorization": f"Bearer {OPENAI_API_KEY}"}

def _mime(fmt: str) -> str:
    fmt = (fmt or "mp3").lower()
    return {"mp3":"audio/mpeg","wav":"audio/wav","ogg":"audio/ogg"}.get(fmt, "audio/mpeg")

@router.post("/transcribe", tags=["Audio"])
async def transcribe_audio(file: UploadFile = File(...), language: str | None = Form(None)):
    """
    Accept audio (webm/ogg/wav/mp3/m4a) -> { text }
    """
    try:
        content = await file.read()
        files = {
            "file": (file.filename or "audio.webm", content, file.content_type or "audio/webm"),
            "model": (None, OPENAI_STT_MODEL),
        }
        if language:
            files["language"] = (None, language)

        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(f"{OPENAI_BASE_URL}/audio/transcriptions", headers=HEADERS, files=files)
            r.raise_for_status()
            return {"text": r.json().get("text","").strip()}
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

@router.post("/tts", tags=["Audio"])
async def synthesize_speech(body: dict):
    """
    Accept { text, voice?, format? } -> audio bytes stream
    """
    text = (body.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    voice = (body.get("voice") or OPENAI_TTS_VOICE).strip()
    fmt = (body.get("format") or "mp3").strip().lower()
    payload = {"model": OPENAI_TTS_MODEL, "voice": voice, "input": text, "format": fmt}

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(f"{OPENAI_BASE_URL}/audio/speech",
                                  headers={**HEADERS, "Content-Type":"application/json"},
                                  json=payload)
            r.raise_for_status()
            return StreamingResponse(io.BytesIO(r.content), media_type=_mime(fmt))
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS failed: {e}")

@router.get("/health", tags=["Audio"])
async def health():
    return JSONResponse({"ok": True, "stt_model": OPENAI_STT_MODEL, "tts_model": OPENAI_TTS_MODEL})
