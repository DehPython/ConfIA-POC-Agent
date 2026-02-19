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

        print(f"Carregando arquitetura customizada {self.model_id}...")
        self.processor = AutoProcessor.from_pretrained(self.processor_id, token=settings.HF_TOKEN)

        # Uso obrigatorio de AutoModel generico e trust_remote_code
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

        # Fluxo manual exigido pela arquitetura customizada
        audio, _ = librosa.load(audio_path, sr=16000)
        inputs = self.processor(audio, sampling_rate=16000, return_tensors="pt")
        input_features = inputs.input_features.to(settings.DEVICE, dtype=settings.DTYPE)

        with torch.no_grad():
            predicted_ids = self.model.generate(input_features)

        transcription = self.processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
        return transcription.strip()

    def unload(self):
        print(f"Descarregando {self.model_id}...")
        self.model = None
        self.processor = None
