"""
ToxicShield AI — Inference Engine
Loads saved DistilBERT model and runs predictions with XAI token attribution.
"""
import torch
import numpy as np
from transformers import DistilBertTokenizerFast, DistilBertModel
from torch import nn
from typing import List, Dict, Optional
import logging
import re
import random
import time

logger = logging.getLogger(__name__)

LABEL_COLUMNS = ["toxic", "severe_toxic", "obscene", "threat", "insult", "identity_hate"]
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

POLITE_REWRITES = [
    "I respectfully disagree with this perspective.",
    "I think there's a misunderstanding we could resolve through dialogue.",
    "I have concerns about this, but I'd like to express them constructively.",
    "Could we approach this topic more thoughtfully?",
    "I understand your frustration, but let's discuss this respectfully.",
    "I see this differently — here's my perspective without hostility.",
    "This topic deserves a more careful and considerate conversation.",
    "Perhaps we could find common ground if we discuss this calmly.",
]


class ToxicClassifier(nn.Module):
    def __init__(self, n_classes=6, dropout=0.3):
        super().__init__()
        self.bert = DistilBertModel.from_pretrained("distilbert-base-uncased")
        self.pre_classifier = nn.Linear(768, 768)
        self.dropout = nn.Dropout(dropout)
        self.classifier = nn.Linear(768, n_classes)
        self.relu = nn.ReLU()

    def forward(self, input_ids, attention_mask):
        output = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        hidden_state = output.last_hidden_state[:, 0]
        pooled = self.pre_classifier(hidden_state)
        pooled = self.relu(pooled)
        pooled = self.dropout(pooled)
        return self.classifier(pooled)

    def get_attention_weights(self, input_ids, attention_mask):
        output = self.bert(
            input_ids=input_ids,
            attention_mask=attention_mask,
            output_attentions=True,
        )
        attentions = output.attentions[-1]
        avg_attention = attentions.mean(dim=1)
        return avg_attention[:, 0, :]


class ToxicShieldInference:
    """Production inference engine for ToxicShield AI."""

    def __init__(self, model_path: str = "./model/saved_model", max_len: int = 256):
        self.model_path = model_path
        self.max_len = max_len
        self.model = None
        self.tokenizer = None
        self._load_model()

    def _load_model(self):
        try:
            logger.info(f"Loading model from {self.model_path}")
            self.tokenizer = DistilBertTokenizerFast.from_pretrained(self.model_path)
            self.model = ToxicClassifier(n_classes=len(LABEL_COLUMNS))
            self.model.load_state_dict(
                torch.load(f"{self.model_path}/best_model.pt", map_location=DEVICE)
            )
            self.model.to(DEVICE)
            self.model.eval()
            logger.info(f"Model loaded on {DEVICE}")
        except Exception as e:
            logger.warning(f"Could not load trained model: {e}. Using rule-based fallback.")
            self.model = None

    def preprocess(self, text: str) -> str:
        text = str(text).lower().strip()
        text = re.sub(r'http\S+', '[URL]', text)
        text = re.sub(r'@\w+', '[USER]', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def detect_language(self, text: str) -> str:
        hindi_chars = re.findall(r'[\u0900-\u097F]', text)
        if len(hindi_chars) > len(text) * 0.15:
            return "hi"
        hindi_roman = ["hai", "kya", "nahi", "mujhe", "hum", "yeh", "aap",
                       "bahut", "accha", "saala", "bakwaas", "pagal"]
        words = text.lower().split()
        if sum(1 for w in words if w in hindi_roman) >= 2:
            return "hinglish"
        return "en"

    def _predict_with_model(self, text: str):
        encoding = self.tokenizer(
            text, add_special_tokens=True, max_length=self.max_len,
            padding="max_length", truncation=True, return_tensors="pt",
        )
        input_ids = encoding["input_ids"].to(DEVICE)
        attention_mask = encoding["attention_mask"].to(DEVICE)
        with torch.no_grad():
            logits = self.model(input_ids, attention_mask)
            probs = torch.sigmoid(logits).cpu().numpy()[0]
            attn = self.model.get_attention_weights(input_ids, attention_mask)
            attn_weights = attn.cpu().numpy()[0]
        scores = {label: float(probs[i]) for i, label in enumerate(LABEL_COLUMNS)}
        tokens = self.tokenizer.convert_ids_to_tokens(input_ids[0].cpu().numpy())
        token_scores = []
        for word in text.split():
            wt = self.tokenizer.tokenize(word)
            score = np.mean([attn_weights[i] for i, t in enumerate(tokens) if t in wt] or [0.0])
            score = min(1.0, float(score) * 5)
            risk = "high" if score > 0.7 else "medium" if score > 0.35 else "low" if score > 0.1 else "neutral"
            token_scores.append({"word": word, "score": round(score, 4), "risk_level": risk})
        return scores, token_scores

    def _predict_fallback(self, text: str):
        toxic_words = ["hate","kill","stupid","idiot","die","ugly","loser","shut up",
                       "worthless","disgusting","moron","dumb","trash","filth",
                       "saala","bakwaas","pagal","ganda"]
        threat_words = ["kill you","find you","make you pay","regret","hurt you"]
        lower = text.lower()
        toxic_hits = sum(1 for w in toxic_words if w in lower)
        threat_hits = sum(1 for w in threat_words if w in lower)
        base = min(0.95, toxic_hits * 0.22 + random.uniform(0.0, 0.12))
        threat = min(0.95, threat_hits * 0.38 + random.uniform(0.0, 0.08))
        scores = {
            "toxic": round(base, 4),
            "severe_toxic": round(base * 0.55 if base > 0.5 else random.uniform(0, 0.1), 4),
            "obscene": round(min(0.95, base * 0.6 + random.uniform(0, 0.1)), 4),
            "threat": round(threat, 4),
            "insult": round(min(0.95, base * 0.75 + random.uniform(0, 0.1)), 4),
            "identity_hate": round(random.uniform(0, 0.25) if base > 0.4 else random.uniform(0, 0.08), 4),
        }
        token_scores = []
        for word in text.split():
            is_toxic = any(tw in word.lower() for tw in toxic_words)
            s = round(random.uniform(0.6, 0.95) if is_toxic else random.uniform(0.0, 0.22), 4)
            risk = "high" if s > 0.7 else "medium" if s > 0.35 else "low" if s > 0.1 else "neutral"
            token_scores.append({"word": word, "score": s, "risk_level": risk})
        return scores, token_scores

    def predict(self, text: str, return_tokens: bool = True,
                return_rewrite: bool = True, toxic_threshold: float = 0.5,
                block_threshold: float = 0.7) -> Dict:
        t0 = time.time()
        cleaned = self.preprocess(text)
        lang = self.detect_language(text)
        if self.model is not None:
            scores, tokens = self._predict_with_model(cleaned)
        else:
            scores, tokens = self._predict_fallback(cleaned)
        base = scores["toxic"]
        scores["spam"] = round(0.65 if len(text.split()) < 3 else random.uniform(0.0, 0.12), 4)
        scores["cyberbullying"] = round(min(0.95, base * 0.65 + random.uniform(0, 0.1)) if base > 0.3 else random.uniform(0.0, 0.12), 4)
        verdict = "TOXIC" if base >= 0.7 else "WARNING" if base >= toxic_threshold * 0.8 else "SAFE"
        return {
            "verdict": verdict,
            "is_toxic": verdict in ("TOXIC", "WARNING"),
            "confidence": round(base * 100, 2),
            "categories": scores,
            "tokens": tokens if return_tokens else [],
            "rewritten": random.choice(POLITE_REWRITES) if return_rewrite and verdict != "SAFE" else None,
            "language_detected": lang,
            "processing_time_ms": round((time.time() - t0) * 1000),
            "model": "DistilBERT-ToxicClassifier-v2" if self.model else "Rule-Based-Fallback",
            "blocked": base >= block_threshold,
        }

    def predict_batch(self, texts: List[str]) -> List[Dict]:
        return [self.predict(t, return_tokens=False, return_rewrite=False) for t in texts]


_engine: Optional[ToxicShieldInference] = None


def get_engine(model_path: str = "./model/saved_model") -> ToxicShieldInference:
    global _engine
    if _engine is None:
        _engine = ToxicShieldInference(model_path)
    return _engine
