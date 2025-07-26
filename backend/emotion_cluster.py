import pandas as pd
import numpy as np
import requests
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.model_selection import train_test_split

# === Configuration ===
OLLAMA_URL = "http://localhost:11434/api/embeddings"
EMBED_MODEL = "nomic-embed-text"
EPOCHS = 10

# === Load Dataset ===
df = pd.read_csv("mental_health_ques_data/oneHotData.csv")  # Replace with your filename
df = df[df['questionFull'].notnull()]  # Use column D as question text
questions = df['questionFull'].astype(str).tolist()

# Use columns E to AK → index 4 to 36
label_cols = df.columns[4:37]
labels_df = df[label_cols].apply(pd.to_numeric, errors='coerce').fillna(0).astype(int)
Y = labels_df.loc[df['questionFull'].notnull()].values

# === Embedding Function using Ollama ===
def get_embedding(text):
    response = requests.post(
        OLLAMA_URL,
        json={"model": EMBED_MODEL, "prompt": text}
    )
    if response.status_code != 200:
        raise Exception(f"Ollama Error: {response.status_code} - {response.text}")
    return response.json()["embedding"]

# === Generate Embeddings ===
X = []
for i, q in enumerate(questions[:100]):  # limit to first 100 for speed
    try:
        emb = get_embedding(q)
        X.append(emb)
        print(f"Embedded {i+1}/{len(questions[:100])}")
    except Exception as e:
        print(f"Error on {i+1}: {e}")
        X.append([0.0]*768)

X = np.array(X)

# === Train/Test Split ===
X_train, X_test, y_train, y_test = train_test_split(X, Y[:len(X)], test_size=0.2, random_state=42)

# === Define ANN Model ===
class MultiLabelANN(nn.Module):
    def __init__(self, input_dim, output_dim):
        super().__init__()
        self.fc1 = nn.Linear(input_dim, 256)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(256, output_dim)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        return self.sigmoid(self.fc2(self.relu(self.fc1(x))))

device = torch.device("cpu")
model = MultiLabelANN(input_dim=X.shape[1], output_dim=Y.shape[1]).to(device)

X_train_tensor = torch.tensor(X_train, dtype=torch.float32).to(device)
y_train_tensor = torch.tensor(y_train, dtype=torch.float32).to(device)

# === Train Model ===
criterion = nn.BCELoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

for epoch in range(EPOCHS):
    model.train()
    optimizer.zero_grad()
    outputs = model(X_train_tensor)
    loss = criterion(outputs, y_train_tensor)
    loss.backward()
    optimizer.step()
    print(f"Epoch {epoch+1}/{EPOCHS}, Loss: {loss.item():.4f}")

# === Predict Function ===
def predict_problems(text):
    emb = get_embedding(text)
    input_tensor = torch.tensor([emb], dtype=torch.float32).to(device)
    model.eval()
    with torch.no_grad():
        preds = model(input_tensor).cpu().numpy()[0]
    binary = (preds > 0.5).astype(int)
    return binary

# === Example Prediction ===
test_text = "The emptiness left by their absence is unbearable; my world feels fractured, and a constant knot of anxiety tightens in my chest, making it hard to breathe. Sometimes, the only way I can feel anything is to cause myself pain, a desperate, misguided attempt to make the emotional agony tangible and, I hope, temporary."
output = predict_problems(test_text)
print("Binary Output:", ''.join(map(str, output)))
