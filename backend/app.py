"""PlateRate pricing API — intentionally dependency-free Python."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import math


def _round_50(value: float) -> int:
    return int(round(value / 50.0) * 50)


def estimate(data: dict) -> dict:
    followers = max(1_000, min(10_000_000, int(data.get("followers", 50_000))))
    engagement = max(0.1, min(30.0, float(data.get("engagementRate", 4))))
    deliverables = max(1, min(10, int(data.get("deliverables", 1))))
    platform = {"instagram": 1.0, "tiktok": .9, "youtube": 1.55}.get(data.get("platform"), 1.0)
    video = {"mention": .65, "dedicated": 1.0, "visit": 1.35}.get(data.get("videoType"), 1.0)
    rights = {"organic": 1.0, "ninety": 1.35, "perpetual": 1.85}.get(data.get("usageRights"), 1.0)
    exclusivity = {"none": 1.0, "thirty": 1.2, "ninety": 1.45}.get(data.get("exclusivity"), 1.0)
    expected_views = max(500, followers * min(.65, .08 + engagement / 100 * 4.2))
    creator_fee = max(180, expected_views * .035)
    production_fee = 350 if data.get("videoType") == "visit" else 175
    subtotal = (creator_fee + production_fee) * platform * video * (1 + (deliverables - 1) * .62) * rights * exclusivity
    if data.get("travel"):
        subtotal += 250
    low, high = _round_50(subtotal * .82), _round_50(subtotal * 1.25)
    return {"low": low, "high": high, "midpoint": _round_50((low + high) / 2), "expectedViews": round(expected_views), "confidence": "Planning estimate"}


class Handler(BaseHTTPRequestHandler):
    def _headers(self, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._headers(204)

    def do_GET(self):
        self._headers(200)
        self.wfile.write(json.dumps({"service": "PlateRate API", "status": "ok"}).encode())

    def do_POST(self):
        if self.path != "/api/estimate":
            self._headers(404)
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            result = estimate(json.loads(self.rfile.read(length) or b"{}"))
            self._headers(200)
            self.wfile.write(json.dumps(result).encode())
        except (ValueError, TypeError, json.JSONDecodeError) as error:
            self._headers(400)
            self.wfile.write(json.dumps({"error": str(error)}).encode())


if __name__ == "__main__":
    print("PlateRate API running at http://127.0.0.1:8000")
    ThreadingHTTPServer(("127.0.0.1", 8000), Handler).serve_forever()
