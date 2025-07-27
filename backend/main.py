# backend/main.py

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.chat_handler import router as chat_router
from backend.emotion_classifier import router as emotion_router
from backend.crisis_detector import router as crisis_router
from backend.recommendation import router as recommendation_router

import csv
import os

app = FastAPI()

# === Enable CORS for frontend connection ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://localhost:5173"] for strict dev mode
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Mount routers ===
app.include_router(chat_router, prefix="/chat")
app.include_router(emotion_router, prefix="/predict")
app.include_router(crisis_router, prefix="/crisis")
app.include_router(recommendation_router, prefix="/recommendations")

# === Logging endpoints ===
LOG_FILE = "emotion_logs.csv"

@app.post("/log")
async def log_data(request: Request):
    data = await request.json()
    os.makedirs("logs", exist_ok=True)
    filepath = os.path.join("logs", LOG_FILE)
    
    with open(filepath, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            data["name"], data["email"], data["message"],
            ", ".join(data["emotions"]), data["crisis"]
        ])
    return {"status": "logged"}

@app.get("/logs")
def get_logs():
    filepath = os.path.join("logs", LOG_FILE)
    if not os.path.exists(filepath):
        return []

    logs = []
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) < 5:
                continue  # skip incomplete rows
            emotions = row[3].split(", ") if row[3].strip() else []
            logs.append({
                "name": row[0],
                "email": row[1],
                "message": row[2],
                "emotions": emotions,
                "crisis": row[4]
            })
    return logs
