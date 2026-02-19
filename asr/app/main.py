import os
import time
import tempfile
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from models import ModelFactory

app = FastAPI(title="Paradox ASR API", version="1.0.0")

@app.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    model_id: str = Form("freds0")
):
    start_time = time.time()

    if not file.filename:
        raise HTTPException(status_code=400, detail="Nenhum arquivo enviado.")

    try:
        strategy = ModelFactory.get_strategy(model_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    temp_audio_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
            tmp.write(await file.read())
            temp_audio_path = tmp.name

        transcription = strategy.transcribe(temp_audio_path)

        process_time = time.time() - start_time

        return JSONResponse(content={
            "status": "success",
            "model_used": model_id,
            "processing_time_sec": round(process_time, 2),
            "transcription": transcription
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no processamento de audio: {str(e)}")

    finally:
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

@app.get("/health")
def health_check():
    return {"status": "ok", "active_model": ModelFactory._current_model_name}
