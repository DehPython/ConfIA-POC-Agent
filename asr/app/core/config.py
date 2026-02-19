import os
import torch

class Settings:
    HF_TOKEN = os.getenv("HF_TOKEN")
    DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
    DTYPE = torch.float16 if torch.cuda.is_available() else torch.float32

settings = Settings()
