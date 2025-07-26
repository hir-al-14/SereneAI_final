from fastapi import APIRouter
from pydantic import BaseModel
import numpy as np
import pandas as pd
import requests
from tensorflow.keras.models import load_model

# === Load model and labels
model = load_model("mental_state_model.h5")
label_cols = pd.read_csv("mental_state_model.csv", header=None).squeeze().tolist()
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

@router.post("/predict")
def predict_emotions(req: TextRequest):
    emb = np.array(get_embedding(req.text)).reshape(1, -1)
    probs = model.predict(emb)[0]
    binary = (probs > 0.3).astype(int)
    matched_emotions = [label_cols[i] for i, val in enumerate(binary) if val == 1]
    return {
        "encoded_output": dict(zip(label_cols, binary.tolist())),
        "detected_problems": matched_emotions
    }
