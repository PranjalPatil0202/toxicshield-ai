"""
ToxicShield AI - Data Preprocessing
Cleans Jigsaw dataset, splits into train/val/test, handles class imbalance.

Usage:
    python model/scripts/preprocess.py --raw-dir ./model/data/raw --output-dir ./model/data
"""
import re, argparse, logging
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
LABEL_COLUMNS = ["toxic","severe_toxic","obscene","threat","insult","identity_hate"]


def clean_text(text: str) -> str:
    if not isinstance(text, str): return ""
    text = text.lower().strip()
    text = re.sub(r'http\S+', ' [URL] ', text)
    text = re.sub(r'@\w+', ' [USER] ', text)
    text = re.sub(r'(.)\1{3,}', r'\1\1', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def oversample(df, mult=3):
    toxic = df[df[LABEL_COLUMNS].sum(axis=1) > 0]
    clean = df[df[LABEL_COLUMNS].sum(axis=1) == 0]
    return pd.concat([clean] + [toxic]*mult).sample(frac=1, random_state=42).reset_index(drop=True)


def preprocess(args):
    out = Path(args.output_dir); out.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(Path(args.raw_dir)/"train.csv")
    df = df.dropna(subset=["comment_text"])
    df["comment_text"] = df["comment_text"].apply(clean_text)
    df = df[df["comment_text"].str.len() >= 3].reset_index(drop=True)
    df["is_toxic"] = (df[LABEL_COLUMNS].sum(axis=1) > 0).astype(int)
    logger.info(f"Total: {len(df)}, toxic: {df['is_toxic'].sum()}")

    train, temp = train_test_split(df, test_size=0.2, random_state=42, stratify=df["is_toxic"])
    val, test   = train_test_split(temp, test_size=0.5, random_state=42, stratify=temp["is_toxic"])
    if args.oversample:
        train = oversample(train, args.oversample_mult)

    cols = ["comment_text"] + LABEL_COLUMNS
    train[cols].to_csv(out/"train.csv", index=False)
    val[cols].to_csv(out/"val.csv", index=False)
    test[cols].to_csv(out/"test.csv", index=False)
    logger.info(f"Saved: train={len(train)}, val={len(val)}, test={len(test)}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--raw-dir",        default="./model/data/raw")
    p.add_argument("--output-dir",     default="./model/data")
    p.add_argument("--oversample",     action="store_true")
    p.add_argument("--oversample-mult",type=int, default=3)
    preprocess(p.parse_args())
