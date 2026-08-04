#!/usr/bin/env python3
"""Scripter 덤프 수신 서버 — 피그마 Scripter의 fetch POST를 받아 파일로 저장.

사용: python3 dump-receiver.py [port]
저장 위치: ./figma-dump/ (JSON은 state.json, PNG는 <이름>.png)
"""
import json
import pathlib
import re
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
OUT = pathlib.Path(__file__).parent / "figma-dump"
OUT.mkdir(exist_ok=True)


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        # /json → state.json, /png?name=Button → Button.png
        if self.path.startswith("/png"):
            m = re.search(r"name=([^&]+)", self.path)
            name = re.sub(r"[^\w\-가-힣]", "_", m.group(1)) if m else "frame"
            path = OUT / f"{name}.png"
            path.write_bytes(body)
        else:
            path = OUT / "state.json"
            try:
                path.write_text(json.dumps(json.loads(body), ensure_ascii=False, indent=1))
            except Exception:
                path.write_bytes(body)
        print(f"저장됨: {path} ({length} bytes)")
        self.send_response(200)
        self._cors()
        self.end_headers()
        self.wfile.write(b"ok")

    def log_message(self, *a):
        pass


print(f"수신 대기: http://127.0.0.1:{PORT}  → 저장: {OUT}/")
HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
