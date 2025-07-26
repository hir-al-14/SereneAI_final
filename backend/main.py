# Mounts all feature routers
from fastapi import FastAPI
from chat_handler import router as chat_router
from emotion_classifier import router as emotion_router
from crisis_detector import router as crisis_router
from recommendation import router as recommendation_router

app = FastAPI()

app.include_router(chat_router, prefix="/chat")
app.include_router(emotion_router, prefix="/emotion")
app.include_router(crisis_router, prefix="/crisis")
app.include_router(recommendation_router, prefix="/recommendations")