"""
ToxicShield AI — DistilBERT Fine-tuning Script
Trains on Jigsaw Toxic Comment Classification Dataset

Usage:
    python model/scripts/train.py --epochs 5 --batch-size 32 --output ./model/saved_model

Dataset: https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge
"""
import os
import argparse
import logging
import json
from pathlib import Path
from datetime import datetime

import torch
import numpy as np
import pandas as pd
from torch import nn
from torch.utils.data import Dataset, DataLoader
from transformers import (
    DistilBertTokenizerFast,
    DistilBertModel,
    AdamW,
    get_linear_schedule_with_warmup,
)
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    classification_report,
)
from sklearn.model_selection import train_test_split
from tqdm import tqdm

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler("training.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# ─── Config ──────────────────────────────────────────────────────────────────

LABEL_COLUMNS = ["toxic", "severe_toxic", "obscene", "threat", "insult", "identity_hate"]
MODEL_NAME = "distilbert-base-uncased"
MAX_LEN = 256
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# ─── Dataset ─────────────────────────────────────────────────────────────────

class ToxicCommentDataset(Dataset):
    """Dataset wrapper for Jigsaw Toxic Comment data."""

    def __init__(self, texts, labels, tokenizer, max_len=MAX_LEN):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_len = max_len

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        encoding = self.tokenizer(
            self.texts[idx],
            add_special_tokens=True,
            max_length=self.max_len,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )
        return {
            "input_ids": encoding["input_ids"].squeeze(),
            "attention_mask": encoding["attention_mask"].squeeze(),
            "labels": torch.tensor(self.labels[idx], dtype=torch.float),
        }


# ─── Model ───────────────────────────────────────────────────────────────────

class ToxicClassifier(nn.Module):
    """
    Multi-label toxicity classifier built on DistilBERT.
    Classifies 6 categories: toxic, severe_toxic, obscene, threat, insult, identity_hate
    """

    def __init__(self, n_classes=6, dropout=0.3):
        super().__init__()
        self.bert = DistilBertModel.from_pretrained(MODEL_NAME)
        self.pre_classifier = nn.Linear(768, 768)
        self.dropout = nn.Dropout(dropout)
        self.classifier = nn.Linear(768, n_classes)
        self.relu = nn.ReLU()

    def forward(self, input_ids, attention_mask):
        output = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        hidden_state = output.last_hidden_state[:, 0]  # [CLS] token
        pooled = self.pre_classifier(hidden_state)
        pooled = self.relu(pooled)
        pooled = self.dropout(pooled)
        logits = self.classifier(pooled)
        return logits


# ─── Preprocessing ───────────────────────────────────────────────────────────

def preprocess_text(text: str) -> str:
    """Clean and normalize text for model input."""
    import re
    text = str(text).lower().strip()
    text = re.sub(r'http\S+|www\S+|https\S+', '[URL]', text)
    text = re.sub(r'@\w+', '[USER]', text)
    text = re.sub(r'#(\w+)', r'\1', text)
    text = re.sub(r'\n+', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def load_and_preprocess_data(csv_path: str, val_split: float = 0.1):
    """Load Jigsaw dataset, preprocess, and split."""
    logger.info(f"Loading data from {csv_path}")
    df = pd.read_csv(csv_path)

    df["comment_text"] = df["comment_text"].apply(preprocess_text)
    missing_cols = [c for c in LABEL_COLUMNS if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing label columns: {missing_cols}")

    texts = df["comment_text"].values
    labels = df[LABEL_COLUMNS].values.astype(np.float32)

    X_train, X_val, y_train, y_val = train_test_split(
        texts, labels, test_size=val_split, random_state=42, stratify=(labels.sum(axis=1) > 0)
    )

    logger.info(f"Train: {len(X_train)}, Val: {len(X_val)}")
    logger.info(f"Label distribution (train):")
    for i, col in enumerate(LABEL_COLUMNS):
        logger.info(f"  {col}: {y_train[:, i].sum():.0f} ({y_train[:, i].mean()*100:.1f}%)")

    return X_train, X_val, y_train, y_val


# ─── Training ────────────────────────────────────────────────────────────────

def train_epoch(model, loader, optimizer, scheduler, criterion, device):
    model.train()
    total_loss = 0
    all_preds, all_labels = [], []

    for batch in tqdm(loader, desc="Training"):
        input_ids = batch["input_ids"].to(device)
        attention_mask = batch["attention_mask"].to(device)
        labels = batch["labels"].to(device)

        optimizer.zero_grad()
        logits = model(input_ids, attention_mask)
        loss = criterion(logits, labels)
        loss.backward()

        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        scheduler.step()

        total_loss += loss.item()
        preds = (torch.sigmoid(logits) > 0.5).cpu().numpy()
        all_preds.extend(preds)
        all_labels.extend(labels.cpu().numpy())

    avg_loss = total_loss / len(loader)
    probs = np.array(all_preds)
    actuals = np.array(all_labels)
    acc = accuracy_score(actuals.flatten(), probs.flatten())
    return avg_loss, acc


def evaluate(model, loader, criterion, device):
    model.eval()
    total_loss = 0
    all_probs, all_labels = [], []

    with torch.no_grad():
        for batch in tqdm(loader, desc="Evaluating"):
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)

            logits = model(input_ids, attention_mask)
            loss = criterion(logits, labels)
            total_loss += loss.item()

            probs = torch.sigmoid(logits).cpu().numpy()
            all_probs.extend(probs)
            all_labels.extend(labels.cpu().numpy())

    avg_loss = total_loss / len(loader)
    probs_arr = np.array(all_probs)
    labels_arr = np.array(all_labels)
    preds_arr = (probs_arr > 0.5).astype(int)

    metrics = {
        "loss": avg_loss,
        "accuracy": accuracy_score(labels_arr.flatten(), preds_arr.flatten()),
        "precision": precision_score(labels_arr.flatten(), preds_arr.flatten(), zero_division=0),
        "recall": recall_score(labels_arr.flatten(), preds_arr.flatten(), zero_division=0),
        "f1": f1_score(labels_arr.flatten(), preds_arr.flatten(), zero_division=0),
    }

    try:
        metrics["roc_auc"] = roc_auc_score(labels_arr, probs_arr, average="macro")
    except Exception:
        metrics["roc_auc"] = 0.0

    # Per-label metrics
    metrics["per_label"] = {}
    for i, label in enumerate(LABEL_COLUMNS):
        metrics["per_label"][label] = {
            "precision": precision_score(labels_arr[:, i], preds_arr[:, i], zero_division=0),
            "recall": recall_score(labels_arr[:, i], preds_arr[:, i], zero_division=0),
            "f1": f1_score(labels_arr[:, i], preds_arr[:, i], zero_division=0),
        }

    return metrics


# ─── Main Training Loop ───────────────────────────────────────────────────────

def train(args):
    logger.info(f"🛡️ ToxicShield AI Training — Device: {DEVICE}")
    logger.info(f"Model: {MODEL_NAME} | Epochs: {args.epochs} | Batch: {args.batch_size}")

    Path(args.output).mkdir(parents=True, exist_ok=True)

    # Load data
    X_train, X_val, y_train, y_val = load_and_preprocess_data(args.data_path)

    # Tokenizer
    tokenizer = DistilBertTokenizerFast.from_pretrained(MODEL_NAME)

    # Datasets
    train_dataset = ToxicCommentDataset(X_train, y_train, tokenizer, MAX_LEN)
    val_dataset = ToxicCommentDataset(X_val, y_val, tokenizer, MAX_LEN)

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size * 2, shuffle=False, num_workers=4)

    # Model
    model = ToxicClassifier(n_classes=len(LABEL_COLUMNS)).to(DEVICE)

    # Class weights for imbalanced data
    pos_weight = torch.tensor([10.0, 50.0, 5.0, 100.0, 5.0, 25.0]).to(DEVICE)
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)

    # Optimizer with weight decay
    no_decay = ["bias", "LayerNorm.weight"]
    optimizer_grouped_parameters = [
        {"params": [p for n, p in model.named_parameters() if not any(nd in n for nd in no_decay)], "weight_decay": 0.01},
        {"params": [p for n, p in model.named_parameters() if any(nd in n for nd in no_decay)], "weight_decay": 0.0},
    ]
    optimizer = AdamW(optimizer_grouped_parameters, lr=args.lr)

    total_steps = len(train_loader) * args.epochs
    scheduler = get_linear_schedule_with_warmup(
        optimizer, num_warmup_steps=total_steps // 10, num_training_steps=total_steps
    )

    # Training loop
    best_f1 = 0
    history = {"train_loss": [], "val_loss": [], "train_acc": [], "val_metrics": []}

    for epoch in range(1, args.epochs + 1):
        logger.info(f"\n{'='*50}")
        logger.info(f"Epoch {epoch}/{args.epochs}")
        logger.info(f"{'='*50}")

        train_loss, train_acc = train_epoch(model, train_loader, optimizer, scheduler, criterion, DEVICE)
        val_metrics = evaluate(model, val_loader, criterion, DEVICE)

        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_metrics["loss"])
        history["train_acc"].append(train_acc)
        history["val_metrics"].append(val_metrics)

        logger.info(f"Train Loss: {train_loss:.4f} | Acc: {train_acc:.4f}")
        logger.info(f"Val Loss:   {val_metrics['loss']:.4f} | Acc: {val_metrics['accuracy']:.4f}")
        logger.info(f"Val F1: {val_metrics['f1']:.4f} | Precision: {val_metrics['precision']:.4f} | Recall: {val_metrics['recall']:.4f}")
        logger.info(f"AUC-ROC: {val_metrics['roc_auc']:.4f}")

        # Save best model
        if val_metrics["f1"] > best_f1:
            best_f1 = val_metrics["f1"]
            torch.save(model.state_dict(), f"{args.output}/best_model.pt")
            tokenizer.save_pretrained(args.output)
            logger.info(f"✅ Best model saved (F1={best_f1:.4f})")

        # Save checkpoint
        if epoch % 2 == 0:
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "train_loss": train_loss,
                "val_f1": val_metrics["f1"],
            }, f"{args.output}/checkpoint_epoch_{epoch}.pt")

    # Final evaluation
    logger.info("\n" + "="*50)
    logger.info("FINAL EVALUATION")
    logger.info("="*50)

    # Load best model for final eval
    model.load_state_dict(torch.load(f"{args.output}/best_model.pt"))
    final_metrics = evaluate(model, val_loader, criterion, DEVICE)

    logger.info(f"\n📊 FINAL METRICS:")
    logger.info(f"  Accuracy:  {final_metrics['accuracy']*100:.2f}%")
    logger.info(f"  Precision: {final_metrics['precision']*100:.2f}%")
    logger.info(f"  Recall:    {final_metrics['recall']*100:.2f}%")
    logger.info(f"  F1-Score:  {final_metrics['f1']*100:.2f}%")
    logger.info(f"  AUC-ROC:   {final_metrics['roc_auc']*100:.2f}%")

    logger.info("\n📊 PER-LABEL METRICS:")
    for label, metrics in final_metrics["per_label"].items():
        logger.info(f"  {label:<15} P={metrics['precision']:.3f} R={metrics['recall']:.3f} F1={metrics['f1']:.3f}")

    # Save training report
    report = {
        "model": MODEL_NAME,
        "trained_at": datetime.now().isoformat(),
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "learning_rate": args.lr,
        "max_seq_len": MAX_LEN,
        "labels": LABEL_COLUMNS,
        "final_metrics": final_metrics,
        "history": history,
        "best_f1": best_f1,
    }
    with open(f"{args.output}/training_report.json", "w") as f:
        json.dump(report, f, indent=2, default=str)

    logger.info(f"\n✅ Training complete. Model saved to {args.output}")
    logger.info(f"📊 Training report: {args.output}/training_report.json")
    return final_metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train ToxicShield AI classifier")
    parser.add_argument("--data-path", type=str, default="./model/data/train.csv",
                        help="Path to Jigsaw train.csv")
    parser.add_argument("--output", type=str, default="./model/saved_model",
                        help="Output directory for saved model")
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=2e-5)
    parser.add_argument("--max-len", type=int, default=256)
    parser.add_argument("--val-split", type=float, default=0.1)

    args = parser.parse_args()
    train(args)
