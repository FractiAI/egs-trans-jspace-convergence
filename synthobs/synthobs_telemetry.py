"""
synthOBS Telemetry Engine · real-time JSON stream for overlays / OBS / WebSocket.

Each frame is one JSON object (JSON Lines) with schema synthobs-telemetry/v1.
"""
from __future__ import annotations

import json
import logging
import sys
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, TextIO

logger = logging.getLogger(__name__)

SCHEMA = "synthobs-telemetry/v1"
OPERATOR = "SynthOBS Autonomous Agent · Syntheverse Sandbox"


@dataclass
class TelemetryFrame:
    schema: str = SCHEMA
    operator: str = OPERATOR
    issued_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    model_id: str = ""
    prompt_hash: str = ""
    step: int = 0
    layer_index: int = 0
    egs_phi: float = 1.618033989
    primary_ratio: float | None = None
    primary_deviation: float | None = None
    fraction_near_phi: float = 0.0
    status: str = "UNKNOWN"
    seq_len: int = 0
    hidden_dim: int = 0
    top_singular_values: list[float] = field(default_factory=list)
    consecutive_ratios: list[float] = field(default_factory=list)
    oom: bool = False
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema": self.schema,
            "operator": self.operator,
            "issuedAt": self.issued_at,
            "modelId": self.model_id,
            "promptHash": self.prompt_hash,
            "step": self.step,
            "layerIndex": self.layer_index,
            "egsPhi": self.egs_phi,
            "primaryRatio": self.primary_ratio,
            "primaryDeviation": self.primary_deviation,
            "fractionNearPhi": self.fraction_near_phi,
            "status": self.status,
            "seqLen": self.seq_len,
            "hiddenDim": self.hidden_dim,
            "topSingularValues": self.top_singular_values,
            "consecutiveRatios": self.consecutive_ratios,
            "oom": self.oom,
            "error": self.error,
        }

    def to_json_line(self) -> str:
        return json.dumps(self.to_dict(), separators=(",", ":"))


class SynthObsTelemetryEngine:
    """
    Serialize LayerCapture events to JSONL stream + optional WebSocket broadcast.

    Outputs:
    - stdout (default) for piping into OBS browser / overlay scripts
    - file append at data/synthobs_telemetry.jsonl
    - optional websocket clients on ws://127.0.0.1:8765 (if websockets installed)
    """

    def __init__(
        self,
        *,
        model_id: str = "",
        out_path: Path | None = None,
        stream: TextIO | None = None,
        websocket_port: int | None = None,
        snapshot_path: Path | None = None,
    ) -> None:
        self.model_id = model_id
        self.out_path = out_path
        self.stream = stream or sys.stdout
        self.websocket_port = websocket_port
        self.snapshot_path = snapshot_path
        self._step = 0
        self._lock = threading.Lock()
        self._ws_clients: set[Any] = set()
        self._ws_server = None
        self._ws_thread: threading.Thread | None = None

        if out_path:
            out_path.parent.mkdir(parents=True, exist_ok=True)

        if websocket_port:
            self._start_websocket_server(websocket_port)

    def _start_websocket_server(self, port: int) -> None:
        try:
            import asyncio
            import websockets
        except ImportError:
            logger.warning("websockets not installed; pip install websockets for WS broadcast")
            return

        engine = self

        async def handler(websocket):
            engine._ws_clients.add(websocket)
            try:
                async for _ in websocket:
                    pass
            finally:
                engine._ws_clients.discard(websocket)

        async def serve():
            async with websockets.serve(handler, "127.0.0.1", port):
                await asyncio.Future()

        def run_loop():
            asyncio.run(serve())

        self._ws_thread = threading.Thread(target=run_loop, daemon=True)
        self._ws_thread.start()
        logger.info("synthOBS WebSocket listening on ws://127.0.0.1:%s", port)

    def _broadcast_ws(self, line: str) -> None:
        if not self._ws_clients:
            return
        try:
            import asyncio

            async def send_all():
                dead = []
                for ws in list(self._ws_clients):
                    try:
                        await ws.send(line)
                    except Exception:
                        dead.append(ws)
                for ws in dead:
                    self._ws_clients.discard(ws)

            asyncio.run(send_all())
        except Exception as e:
            logger.debug("WS broadcast skip: %s", e)

    @staticmethod
    def _prompt_hash(text: str) -> str:
        import hashlib

        return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]

    def emit_capture(
        self,
        capture: Any,
        *,
        prompt: str = "",
    ) -> TelemetryFrame:
        """Build frame from LayerCapture and write to all sinks."""
        from synthobs.interceptor import LayerCapture

        if not isinstance(capture, LayerCapture):
            raise TypeError("capture must be LayerCapture")

        with self._lock:
            self._step += 1
            step = self._step

        egs = capture.egs_report
        frame = TelemetryFrame(
            model_id=self.model_id,
            prompt_hash=self._prompt_hash(prompt) if prompt else "",
            step=step,
            layer_index=capture.layer_index,
            egs_phi=egs.egs_phi,
            primary_ratio=egs.primary_ratio,
            primary_deviation=egs.primary_deviation,
            fraction_near_phi=egs.fraction_near_phi,
            status=egs.status,
            seq_len=capture.seq_len,
            hidden_dim=capture.hidden_dim,
            top_singular_values=egs.top_singular_values,
            consecutive_ratios=egs.consecutive_ratios,
            oom=capture.oom,
            error=capture.error,
        )

        line = frame.to_json_line()
        self.stream.write(line + "\n")
        self.stream.flush()

        if self.out_path:
            with self.out_path.open("a", encoding="utf-8") as f:
                f.write(line + "\n")

        if self.snapshot_path:
            snapshot = {
                "schema": SCHEMA,
                "operator": OPERATOR,
                "updatedAt": frame.issued_at,
                "latest": frame.to_dict(),
            }
            self.snapshot_path.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")

        if self.websocket_port:
            self._broadcast_ws(line)

        return frame

    def emit_batch(
        self,
        captures: list[Any],
        *,
        prompt: str = "",
    ) -> list[TelemetryFrame]:
        return [self.emit_capture(c, prompt=prompt) for c in captures]

    def close(self) -> None:
        pass


def tail_jsonl(path: Path, callback: Callable[[dict[str, Any]], None], poll_ms: int = 250) -> None:
    """Block and tail a JSONL file (for local overlay dev)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.touch()

    with path.open("r", encoding="utf-8") as f:
        f.seek(0, 2)
        while True:
            line = f.readline()
            if line:
                try:
                    callback(json.loads(line))
                except json.JSONDecodeError:
                    pass
            else:
                time.sleep(poll_ms / 1000.0)
