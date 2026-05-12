"""Build src/data/subway-lines.json from Kaggle Seoul subway geometry data.

Usage:
  python3 scripts/build-subway-lines-from-kaggle.py

Requires:
  kagglehub, pandas, geopandas/shapely installed in the active Python env.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import kagglehub
import pandas as pd


DATASET = "ninetyninenewton/seoul-subway-coordinates"
OUTPUT_FILE = Path("src/data/subway-lines.json")

LINE_NAMES = {
    "1": "1호선",
    "2": "2호선",
    "3": "3호선",
    "4": "4호선",
    "5": "5호선",
    "6": "6호선",
    "7": "7호선",
    "8": "8호선",
    "9": "9호선",
    "K1": "경의중앙선",
    "K2": "수인분당선",
    "K2_": "수인분당선",
    "D": "신분당선",
    "AREX": "공항철도",
    "I1": "인천1호선",
    "I2": "인천2호선",
    "P1": "경춘선",
    "U1": "의정부경전철",
    "S1": "우이신설선",
    "Y1": "용인경전철",
    "K4": "경강선",
}


def load_env_token() -> None:
    env_file = Path(".env.local")
    if os.environ.get("KAGGLE_API_TOKEN") or not env_file.exists():
        return

    for line in env_file.read_text(encoding="utf-8").splitlines():
        if line.startswith("KAGGLE_API_TOKEN="):
            os.environ["KAGGLE_API_TOKEN"] = line.split("=", 1)[1].strip().strip("\"'")
            return


def main() -> None:
    load_env_token()
    dataset_dir = Path(kagglehub.dataset_download(DATASET))
    lines = pd.read_pickle(dataset_dir / "Seoul_subway_lines.pkl")

    features = []
    for _, row in lines.iterrows():
        line_code = str(row["line"])
        line_name = LINE_NAMES.get(line_code, line_code)
        geometry = row["geometry"]
        if geometry is None or geometry.is_empty:
            continue

        features.append({
            "type": "Feature",
            "properties": {
                "source": DATASET,
                "line": line_name,
                "lineCode": line_code,
                "name": line_name,
                "sourceColor": row.get("color"),
            },
            "geometry": geometry.__geo_interface__,
        })

    collection = {
        "type": "FeatureCollection",
        "features": features,
    }

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(collection, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {OUTPUT_FILE} ({len(features)} features)")


if __name__ == "__main__":
    main()
