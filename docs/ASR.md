# TASK INSTRUCTION: ASR FastAPI Microservice

## 1. Objective
Implement a production-ready, Dockerized FastAPI microservice for audio transcription (Speech-to-Text). The API must accept any audio format (ogg, wav, mp3, etc.) via `POST` and allow dynamic model selection via request parameters.

## 2. Architecture & File Structure
Use the Strategy/Factory design pattern to isolate model logic. 

```text
/project_root
├── Dockerfile
├── requirements.txt
└── /app
    ├── main.py                 # FastAPI setup, routing, and temp file handling
    ├── core/
    │   └── config.py           # Env vars (HF_TOKEN, DEVICE setup)
    └── models/
        ├── __init__.py         # Model Factory logic
        ├── base.py             # Abstract base class/interface
        ├── distil_whisper.py   # Implementation for standard HuggingFace pipeline
        └── lite_asr.py         # Implementation for custom architecture (trust_remote_code)
```
## 3. Core Requirements
Endpoint: POST /transcribe

Inputs: * file: UploadFile (audio payload).

model_id: String (e.g., "freds0", "lite_asr").

Audio Handling: Save UploadFile to a temporary file using Python's tempfile. Pass the temp file path to the model, process it, and ensure the temp file is deleted via finally blocks. Format/name does not matter as long as librosa/ffmpeg can read it.

## 4. Crucial Technical Details & Lessons Learned (DO NOT IGNORE)
Based on previous debugging, the following constraints MUST be applied:

### A. Environment & Docker
System Deps: ffmpeg is strictly required. Install via apt-get in the Dockerfile.

HF Cache: Do not bake models into the image. Assume the container will be run with volume mapping: -v cache_dir:/root/.cache/huggingface.

Auth: Expose HF_TOKEN as an environment variable to prevent rate limits.

### B. VRAM & Memory Management
GPU memory leaks are fatal. Implement a rigorous cleanup function after every inference:

Python
import gc, torch
def clean_memory():
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()
    gc.collect()
Ensure variables holding pipelines or tensors are deleted (del) before cleanup.

### C. Model-Specific Implementations (The Strategy Pattern)
#### Strategy 1: Standard Whisper (e.g., freds0/distil-whisper-large-v3-ptbr)

Uses standard AutoModelForSpeechSeq2Seq.

Uses HuggingFace pipeline("automatic-speech-recognition", ...).

Warning Fix: When instantiating the pipeline, use the parameter dtype instead of the deprecated torch_dtype.

#### Strategy 2: Custom Architecture / LiteASR (e.g., efficient-speech/lite-whisper-large-v3-acc)

Architecture: Fails with standard pipelines.

Loading: Requires trust_remote_code=True and the generic AutoModel class (NOT AutoModelForSpeechSeq2Seq).

Processor: Must explicitly use openai/whisper-large-v3.

Inference Bypass: Do NOT use pipeline. Use librosa.load(file, sr=16000) to extract raw audio, pass to the processor to get input_features, and call model.generate(input_features). Do not pass forced_decoder_ids or other extra model_kwargs to .generate(), as this custom model does not support them and will crash.

## 5. Output Expectation
Generate the complete Python code for the structure defined in Section 2, ensuring FastAPI dependencies (fastapi, uvicorn, python-multipart) and Audio dependencies (torch, transformers, librosa, huggingface_hub, accelerate) are in requirements.txt.

## Help
 If really need help this repo: https://github.com/efeslab/LiteASR and this other: https://huggingface.co/freds0/distil-whisper-large-v3-ptbr can be usefull to implement.

# Paradox ASR API — Arquivos do Projeto

## `requirements.txt`

```txt
fastapi
uvicorn
python-multipart
torch
transformers
librosa
soundfile
huggingface_hub
accelerate
```

---

## `Dockerfile`

Otimizado para produção com FastAPI.

```dockerfile
FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# FFMPEG é obrigatório para processamento de áudio (librosa/transformers)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app /app

EXPOSE 8000

# Inicia o servidor Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## `/app/core/config.py`

Centraliza as configurações do ambiente e hardware.

```python
import os
import torch

class Settings:
    HF_TOKEN = os.getenv("HF_TOKEN")
    DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
    DTYPE = torch.float16 if torch.cuda.is_available() else torch.float32

settings = Settings()
```

---

## `/app/models/base.py`

A interface (contrato) que todos os modelos devem seguir.

```python
from abc import ABC, abstractmethod

class ASRStrategy(ABC):
    @abstractmethod
    def load_model(self):
        """Carrega o modelo e o processador na VRAM"""
        pass

    @abstractmethod
    def transcribe(self, audio_path: str) -> str:
        """Processa o áudio e retorna o texto transcrito"""
        pass

    @abstractmethod
    def unload(self):
        """Remove o modelo da memória para evitar vazamento de VRAM"""
        pass
```

---

## `/app/models/distil_whisper.py`

A estratégia para modelos padrão do Hugging Face.

```python
import torch
import gc
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
from core.config import settings
from models.base import ASRStrategy

class DistilWhisperStrategy(ASRStrategy):
    def __init__(self, model_id: str):
        self.model_id = model_id
        self.model = None
        self.processor = None
        self.pipe = None

    def load_model(self):
        if self.pipe is not None:
            return # Já está em cache

        print(f"🚀 Carregando {self.model_id}...")
        self.processor = AutoProcessor.from_pretrained(self.model_id, token=settings.HF_TOKEN)
        self.model = AutoModelForSpeechSeq2Seq.from_pretrained(
            self.model_id,
            torch_dtype=settings.DTYPE,
            low_cpu_mem_usage=True,
            use_safetensors=True,
            token=settings.HF_TOKEN
        ).to(settings.DEVICE)

        self.model.eval()

        self.pipe = pipeline(
            "automatic-speech-recognition",
            model=self.model,
            tokenizer=self.processor.tokenizer,
            feature_extractor=self.processor.feature_extractor,
            chunk_length_s=30,
            batch_size=16,
            dtype=settings.DTYPE, # Corrigido warning do torch_dtype
            device=settings.DEVICE,
        )

    def transcribe(self, audio_path: str) -> str:
        if not self.pipe:
            self.load_model()

        result = self.pipe(audio_path, generate_kwargs={"language": "portuguese"})
        return result["text"].strip()

    def unload(self):
        print(f"🧹 Descarregando {self.model_id}...")
        self.pipe = None
        self.model = None
        self.processor = None
```

---

## `/app/models/lite_asr.py`

A estratégia bypass exata para arquiteturas customizadas, resolvendo os problemas de compatibilidade.

```python
import torch
import gc
import librosa
from transformers import AutoModel, AutoProcessor
from core.config import settings
from models.base import ASRStrategy

class LiteASRStrategy(ASRStrategy):
    def __init__(self, model_id: str, processor_id: str = "openai/whisper-large-v3"):
        self.model_id = model_id
        self.processor_id = processor_id
        self.model = None
        self.processor = None

    def load_model(self):
        if self.model is not None:
            return

        print(f"🚀 Carregando arquitetura customizada {self.model_id}...")
        self.processor = AutoProcessor.from_pretrained(self.processor_id, token=settings.HF_TOKEN)

        # Uso obrigatório de AutoModel genérico e trust_remote_code
        self.model = AutoModel.from_pretrained(
            self.model_id,
            torch_dtype=settings.DTYPE,
            low_cpu_mem_usage=True,
            trust_remote_code=True,
            token=settings.HF_TOKEN
        ).to(settings.DEVICE)

        self.model.eval()

    def transcribe(self, audio_path: str) -> str:
        if not self.model:
            self.load_model()

        # Fluxo manual exigido pela documentação oficial
        audio, _ = librosa.load(audio_path, sr=16000)
        inputs = self.processor(audio, sampling_rate=16000, return_tensors="pt")
        input_features = inputs.input_features.to(settings.DEVICE, dtype=settings.DTYPE)

        with torch.no_grad():
            predicted_ids = self.model.generate(input_features) # Sem parâmetros extras

        transcription = self.processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
        return transcription.strip()

    def unload(self):
        print(f"🧹 Descarregando {self.model_id}...")
        self.model = None
        self.processor = None
```

---

## `/app/models/__init__.py`

O Factory que gerencia a VRAM e o "Hot Swap" dos modelos.

```python
import torch
import gc
from models.base import ASRStrategy
from models.distil_whisper import DistilWhisperStrategy
from models.lite_asr import LiteASRStrategy

class ModelFactory:
    _current_strategy: ASRStrategy = None
    _current_model_name: str = None

    # Mapeamento dos modelos disponíveis
    REGISTRY = {
        "freds0": lambda: DistilWhisperStrategy("freds0/distil-whisper-large-v3-ptbr"),
        "lite_asr": lambda: LiteASRStrategy("efficient-speech/lite-whisper-large-v3-acc")
    }

    @classmethod
    def get_strategy(cls, model_name: str) -> ASRStrategy:
        if model_name not in cls.REGISTRY:
            raise ValueError(f"Modelo '{model_name}' não suportado.")

        # Se o modelo solicitado já é o atual, retorna ele (Hot load)
        if cls._current_model_name == model_name and cls._current_strategy is not None:
            return cls._current_strategy

        # Se existe outro modelo na VRAM, descarrega e força o Garbage Collector
        if cls._current_strategy is not None:
            cls._current_strategy.unload()
            cls._current_strategy = None
            cls._clean_memory()

        # Instancia e carrega o novo modelo
        strategy = cls.REGISTRY[model_name]()
        strategy.load_model()

        cls._current_strategy = strategy
        cls._current_model_name = model_name

        return cls._current_strategy

    @staticmethod
    def _clean_memory():
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
        gc.collect()
```

---

## `/app/main.py`

A porta de entrada da API. Processamento de áudio robusto usando arquivos temporários seguros.

```python
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
    model_id: str = Form("freds0") # Modelo padrão caso o cliente não envie
):
    start_time = time.time()

    # 1. Validação inicial
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nenhum arquivo enviado.")

    try:
        # Tenta obter a estratégia (vai carregar na VRAM se for o primeiro uso)
        strategy = ModelFactory.get_strategy(model_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 2. Criação do arquivo temporário com 'delete=False' para o librosa/ffmpeg lerem
    temp_audio_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
            tmp.write(await file.read())
            temp_audio_path = tmp.name

        # 3. Execução da inferência isolada
        transcription = strategy.transcribe(temp_audio_path)

        process_time = time.time() - start_time

        return JSONResponse(content={
            "status": "success",
            "model_used": model_id,
            "processing_time_sec": round(process_time, 2),
            "transcription": transcription
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no processamento de áudio: {str(e)}")

    finally:
        # 4. Limpeza rigorosa do disco
        if temp_audio_path and os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)

@app.get("/health")
def health_check():
    return {"status": "ok", "active_model": ModelFactory._current_model_name}
```