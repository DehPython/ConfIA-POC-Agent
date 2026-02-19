import torch
import gc
from models.base import ASRStrategy
from models.distil_whisper import DistilWhisperStrategy
from models.lite_asr import LiteASRStrategy

class ModelFactory:
    _current_strategy: ASRStrategy = None
    _current_model_name: str = None

    REGISTRY = {
        "freds0": lambda: DistilWhisperStrategy("freds0/distil-whisper-large-v3-ptbr"),
        "lite_asr": lambda: LiteASRStrategy("efficient-speech/lite-whisper-large-v3-acc")
    }

    @classmethod
    def get_strategy(cls, model_name: str) -> ASRStrategy:
        if model_name not in cls.REGISTRY:
            raise ValueError(f"Modelo '{model_name}' nao suportado.")

        if cls._current_model_name == model_name and cls._current_strategy is not None:
            return cls._current_strategy

        if cls._current_strategy is not None:
            cls._current_strategy.unload()
            cls._current_strategy = None
            cls._clean_memory()

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
