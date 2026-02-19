from abc import ABC, abstractmethod

class ASRStrategy(ABC):
    @abstractmethod
    def load_model(self):
        """Carrega o modelo e o processador na VRAM"""
        pass

    @abstractmethod
    def transcribe(self, audio_path: str) -> str:
        """Processa o audio e retorna o texto transcrito"""
        pass

    @abstractmethod
    def unload(self):
        """Remove o modelo da memoria para evitar vazamento de VRAM"""
        pass
