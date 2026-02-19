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
            return

        print(f"Carregando {self.model_id}...")
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
            dtype=settings.DTYPE,
            device=settings.DEVICE,
        )

    def transcribe(self, audio_path: str) -> str:
        if not self.pipe:
            self.load_model()

        result = self.pipe(audio_path, generate_kwargs={"language": "portuguese"})
        return result["text"].strip()

    def unload(self):
        print(f"Descarregando {self.model_id}...")
        self.pipe = None
        self.model = None
        self.processor = None
