#!/usr/bin/env python3
# 캡처 PNG를 CORS 허용으로 서빙 — Figma Scripter fetch용.  실행: python3 serve.py  (기본 8766)
import http.server, os, sys
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'captures'))
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
