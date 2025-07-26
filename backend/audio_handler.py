# For text-to-speech and speech-to-text
from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def audio_handler():
    return {"message": "Audio handler route ready"}
