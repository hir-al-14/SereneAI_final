from fastapi import APIRouter
import csv
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/emotion_logs")
def get_logs():
    logs = []
    with open("emotion_log.csv", newline="") as file:
        reader = csv.reader(file)
        for row in reader:
            logs.append({
                "timestamp": row[0],
                "name": row[1],
                "email": row[2],
                "message": row[3],
                "emotion": row[4],
                "score": row[5],
                "crisis": row[6] if len(row) > 6 else "0"
            })
    return {"logs": logs}