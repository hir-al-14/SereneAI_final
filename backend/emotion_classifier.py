from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import numpy as np
import pandas as pd
import requests
import os
from tensorflow.keras.models import load_model
from dotenv import load_dotenv

load_dotenv()

# === Resolve file paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, "mental_state_model.h5")
csv_path = os.path.join(BASE_DIR, "mental_state_model.csv")

# === Load model and labels
model = load_model(model_path)
label_cols = pd.read_csv(csv_path, header=None).squeeze().tolist()

# === OpenAI embeddings config
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_EMBED_MODEL = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")  # 1536 dims
OPENAI_EMBED_ENDPOINT = "https://api.openai.com/v1/embeddings"

THRESHOLD = 0.3

router = APIRouter()

class TextRequest(BaseModel):
    text: str

def get_embedding_openai(text: str) -> np.ndarray:
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set")
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}
    try:
        r = requests.post(
            OPENAI_EMBED_ENDPOINT,
            headers=headers,
            json={"model": OPENAI_EMBED_MODEL, "input": text},
            timeout=30,
        )
        r.raise_for_status()
        vec = r.json()["data"][0]["embedding"]
        return np.asarray(vec, dtype=np.float32)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {e}")

def adapt_dimension(vec: np.ndarray, target_dim: int) -> np.ndarray:
    """
    Adapt an embedding to the model's expected input dim.
    Priority:
      1) If divisible: average-pool contiguous chunks
      2) If too big: slice
      3) If too small: zero-pad
    """
    d = vec.shape[-1]
    if d == target_dim:
        return vec

    # 1) Downsample by average pooling if possible (e.g., 1536 -> 768 with factor 2)
    if d % target_dim == 0:
        factor = d // target_dim
        return vec.reshape(target_dim, factor).mean(axis=1)

    # 2) Slice if larger
    if d > target_dim:
        return vec[:target_dim]

    # 3) Pad with zeros if smaller
    out = np.zeros((target_dim,), dtype=vec.dtype)
    out[:d] = vec
    return out

@router.post("/")
def predict_emotions(req: TextRequest):
    # Get raw OpenAI embedding
    raw_vec = get_embedding_openai(req.text)

    # Determine model's expected input dimension
    try:
        target_dim = int(model.input_shape[-1])
    except Exception:
        # Fallback to 768 if model shape not available for some reason
        target_dim = 768

    # Adapt dimension
    emb_vec = adapt_dimension(raw_vec, target_dim).reshape(1, -1)

    # Predict
    try:
        probs = model.predict(emb_vec, verbose=0)[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model inference failed: {e}")

    binary = (probs > THRESHOLD).astype(int)
    matched_emotions = [label_cols[i] for i, val in enumerate(binary) if val == 1]

    return {
        "encoded_output": dict(zip(label_cols, binary.tolist())),
        "detected_problems": matched_emotions
    }
