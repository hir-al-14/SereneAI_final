from fastapi import APIRouter
from pydantic import BaseModel
import numpy as np
import pandas as pd
import requests
import os
from tensorflow.keras.models import load_model

# === Resolve file paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, "mental_state_model.h5")
csv_path = os.path.join(BASE_DIR, "mental_state_model.csv")

# === Load model and labels
model = load_model(model_path)
label_cols = pd.read_csv(csv_path, header=None).squeeze().tolist()

# === Embedding config
OLLAMA_URL = "http://localhost:11434/api/embeddings"
EMBED_MODEL = "nomic-embed-text"
THRESHOLD = 0.3

# === Setup router instead of FastAPI app
router = APIRouter()

class TextRequest(BaseModel):
    text: str

def get_embedding(text):
    response = requests.post(
        OLLAMA_URL,
        json={"model": EMBED_MODEL, "prompt": text}
    )
    return response.json()["embedding"]

@router.post("/")
def predict_emotions(req: TextRequest):
    emb = np.array(get_embedding(req.text)).reshape(1, -1)
    probs = model.predict(emb)[0]
    binary = (probs > THRESHOLD).astype(int)
    matched_emotions = [label_cols[i] for i, val in enumerate(binary) if val == 1]
    return {
        "encoded_output": dict(zip(label_cols, binary.tolist())),
        "detected_problems": matched_emotions
    }
