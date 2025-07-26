from pydantic import BaseModel
from typing import List

class ChatInput(BaseModel):
    message: str
    history: List[str] = []

class KeywordClusterInput(BaseModel):
    conversation: str
    num_clusters: int = 3

class RecommendationInput(BaseModel):
    keywords: List[str]

class CrisisInput(BaseModel):
    message: str

class ToneInput(BaseModel):
    original_message: str
