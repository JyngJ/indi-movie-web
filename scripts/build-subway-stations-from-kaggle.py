"""Build data/subway/stations.json from Kaggle Seoul subway station data.

This keeps station markers aligned with src/data/subway-lines.json, which is
generated from the same Kaggle dataset.

Usage:
  python3 scripts/build-subway-stations-from-kaggle.py
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import kagglehub
import pandas as pd


DATASET = "ninetyninenewton/seoul-subway-coordinates"
OUTPUT_FILE = Path("data/subway/stations.json")

LINE_NAMES = {
    "01호선": "1호선",
    "02호선": "2호선",
    "03호선": "3호선",
    "04호선": "4호선",
    "05호선": "5호선",
    "06호선": "6호선",
    "07호선": "7호선",
    "08호선": "8호선",
    "09호선": "9호선",
    "분당선": "수인분당선",
    "수인선": "수인분당선",
    "신분당선": "신분당선",
    "경의선": "경의중앙선",
    "공항철도": "공항철도",
    "경춘선": "경춘선",
    "의정부경전철": "의정부경전철",
    "우이신설경전철": "우이신설선",
    "용인경전철": "용인경전철",
    "경강선": "경강선",
    "인천선": "인천1호선",
    "인천2호선": "인천2호선",
}


def load_env_token() -> None:
    env_file = Path(".env.local")
    if os.environ.get("KAGGLE_API_TOKEN") or not env_file.exists():
        return

    for line in env_file.read_text(encoding="utf-8").splitlines():
        if line.startswith("KAGGLE_API_TOKEN="):
            os.environ["KAGGLE_API_TOKEN"] = line.split("=", 1)[1].strip().strip("\"'")
            return


def source_id(name: str) -> str:
    return "kaggle-seoul-subway-" + "".join(
        char for char in name.lower().replace(" ", "-")
        if char.isalnum() or char in {"-", "_"}
    )


def infer_region(lng: float) -> tuple[str, str | None]:
    if lng < 126.78:
        return "인천광역시", "인천"
    if lng > 127.18 or lng < 126.82:
        return "경기도", None
    return "서울특별시", None


def main() -> None:
    load_env_token()
    dataset_dir = Path(kagglehub.dataset_download(DATASET))
    rows = pd.read_pickle(dataset_dir / "Seoul_subway_stations.pkl")

    grouped = {}
    for _, row in rows.iterrows():
        raw_line = str(row["line"])
        line = LINE_NAMES.get(raw_line)
        if not line:
            continue

        name = str(row["name"])
        station_name = name if name.endswith("역") else f"{name}역"
        item = grouped.setdefault(station_name, {
            "source_id": source_id(station_name),
            "name": station_name,
            "lines": set(),
            "lat_values": [],
            "lng_values": [],
            "aliases": {station_name, name},
        })
        item["lines"].add(line)
        item["lat_values"].append(float(row["lat"]))
        item["lng_values"].append(float(row["lng"]))

    stations = []
    for item in grouped.values():
        lat = sum(item["lat_values"]) / len(item["lat_values"])
        lng = sum(item["lng_values"]) / len(item["lng_values"])
        city, district = infer_region(lng)
        stations.append({
            "source_id": item["source_id"],
            "name": item["name"],
            "lines": sorted(item["lines"]),
            "lat": round(lat, 8),
            "lng": round(lng, 8),
            "city": city,
            "district": district,
            "neighborhood": None,
            "aliases": sorted(item["aliases"]),
        })

    stations.sort(key=lambda station: station["name"])
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps({"stations": stations}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {OUTPUT_FILE} ({len(stations)} stations)")


if __name__ == "__main__":
    main()
