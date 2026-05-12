"""
ToxicShield AI - Model Evaluation Script
Computes accuracy, precision, recall, F1, AUC-ROC, MCC per label.

Usage:
    python model/scripts/evaluate.py --model-path ./model/saved_model \
        --test-data ./model/data/test.csv --output ./model/eval_results
"""
import argparse, json, logging
from pathlib import Path
import numpy as np
import torch
from torch.utils.data import DataLoader
from transformers import DistilBertTokenizerFast
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, matthews_corrcoef,
)
import pandas as pd

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

LABEL_COLUMNS = ["toxic","severe_toxic","obscene","threat","insult","identity_hate"]
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def evaluate(args):
    from train import ToxicClassifier, ToxicCommentDataset, preprocess_text
    Path(args.output).mkdir(parents=True, exist_ok=True)

    tokenizer = DistilBertTokenizerFast.from_pretrained(args.model_path)
    model = ToxicClassifier(n_classes=len(LABEL_COLUMNS))
    model.load_state_dict(torch.load(f"{args.model_path}/best_model.pt", map_location=DEVICE))
    model.to(DEVICE); model.eval()

    df = pd.read_csv(args.test_data)
    df["comment_text"] = df["comment_text"].apply(preprocess_text)
    texts  = df["comment_text"].values
    labels = df[LABEL_COLUMNS].values.astype(np.float32)
    dataset = ToxicCommentDataset(texts, labels, tokenizer)
    loader  = DataLoader(dataset, batch_size=64, shuffle=False)

    all_probs, all_labels = [], []
    with torch.no_grad():
        for batch in loader:
            logits = model(batch["input_ids"].to(DEVICE), batch["attention_mask"].to(DEVICE))
            all_probs.extend(torch.sigmoid(logits).cpu().numpy())
            all_labels.extend(batch["labels"].numpy())

    y_prob = np.array(all_probs)
    y_true = np.array(all_labels)
    y_pred = (y_prob > 0.5).astype(int)

    global_metrics = {
        "accuracy":  round(accuracy_score (y_true.flatten(), y_pred.flatten()), 4),
        "precision": round(precision_score(y_true.flatten(), y_pred.flatten(), zero_division=0), 4),
        "recall":    round(recall_score   (y_true.flatten(), y_pred.flatten(), zero_division=0), 4),
        "f1_score":  round(f1_score       (y_true.flatten(), y_pred.flatten(), zero_division=0), 4),
        "roc_auc":   round(roc_auc_score  (y_true, y_prob, average="macro"), 4),
        "mcc":       round(matthews_corrcoef(y_true.flatten(), y_pred.flatten()), 4),
    }

    per_label = {}
    for i, label in enumerate(LABEL_COLUMNS):
        per_label[label] = {
            "precision": round(precision_score(y_true[:,i], y_pred[:,i], zero_division=0), 4),
            "recall":    round(recall_score   (y_true[:,i], y_pred[:,i], zero_division=0), 4),
            "f1_score":  round(f1_score       (y_true[:,i], y_pred[:,i], zero_division=0), 4),
            "support":   int(y_true[:,i].sum()),
        }

    logger.info("Global: " + str(global_metrics))
    for label, m in per_label.items():
        logger.info(f"  {label:<20} F1={m['f1_score']:.3f}  support={m['support']}")

    report = {"global_metrics": global_metrics, "per_label_metrics": per_label}
    with open(f"{args.output}/evaluation_report.json","w") as f:
        json.dump(report, f, indent=2)
    logger.info(f"Saved to {args.output}/evaluation_report.json")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--model-path", default="./model/saved_model")
    p.add_argument("--test-data",  default="./model/data/test.csv")
    p.add_argument("--output",     default="./model/eval_results")
    evaluate(p.parse_args())
