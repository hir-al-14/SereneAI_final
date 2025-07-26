import pandas as pd
import numpy as np
import requests
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout
from tensorflow.keras.optimizers import Adam
from sklearn.model_selection import train_test_split

# === Config ===
CSV_PATH = "mental_health_ques_data/oneHotData.csv"
OLLAMA_URL = "http://localhost:11434/api/embeddings"
EMBED_MODEL = "nomic-embed-text"
TRAIN_LIMIT = 200

# === Load Dataset ===
df = pd.read_csv(CSV_PATH)
df = df[df['questionFull'].notnull()]
questions = df['questionFull'].astype(str).tolist()
label_cols = df.columns[4:37]
labels_df = df[label_cols].apply(pd.to_numeric, errors='coerce').fillna(0).astype(int)
Y = labels_df.loc[df['questionFull'].notnull()].values

# === Embedding Function ===
def get_embedding(text):
    response = requests.post(
        OLLAMA_URL,
        json={"model": EMBED_MODEL, "prompt": text}
    )
    return response.json()["embedding"]

# === Generate Embeddings ===
X = []
for i, q in enumerate(questions[:TRAIN_LIMIT]):
    try:
        emb = get_embedding(q)
        X.append(emb)
        print(f"Embedded {i+1}/{TRAIN_LIMIT}")
    except:
        X.append([0.0]*768)

X = np.array(X)
Y = Y[:len(X)]

# === Split
X_train, X_test, y_train, y_test = train_test_split(X, Y, test_size=0.2, random_state=42)

# === Keras Model
model = Sequential([
    Dense(512, activation='relu', input_shape=(768,)),
    Dropout(0.3),
    Dense(256, activation='relu'),
    Dropout(0.3),
    Dense(Y.shape[1], activation='sigmoid')
])
model.compile(optimizer=Adam(0.001), loss='binary_crossentropy', metrics=['accuracy'])
model.fit(X_train, y_train, epochs=10, batch_size=16, validation_split=0.1)

# === Save Model and Labels
model.save("mental_state_model.h5")
pd.Series(label_cols).to_csv("mental_state_model.csv", index=False)
print("Model and labels saved.")
