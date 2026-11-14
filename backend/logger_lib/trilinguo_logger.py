"""
============================================================================
TRILINGUO / NYOB ZOO — STRUCTURED LOGGING & COMPONENT CHANGE REQUEST ENGINE
File: WEBSITE/backend/logger_lib/trilinguo_logger.py

Provides:
1. Rotating UTF-8 file loggers:
   - logs/app.log                 (All API requests, latency, status, component IDs)
   - logs/error.log               (4xx/5xx errors, stack traces, validation failures)
   - logs/frontend_events.jsonl   (Browser UI telemetry, JS errors, user interactions)
   - logs/change_requests.jsonl   (Component-ID tagged change/fix requests from UI)
2. FastAPI RequestLoggingMiddleware for automatic request/response tracing.
============================================================================
"""

import json
import logging
import time
import traceback
import uuid
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

import os
import tempfile

_DEFAULT_LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
try:
    if os.getenv("VERCEL"):
        LOG_DIR = Path(tempfile.gettempdir()) / "trilinguo_logs"
    else:
        LOG_DIR = _DEFAULT_LOG_DIR
    LOG_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    LOG_DIR = Path(tempfile.gettempdir()) / "trilinguo_logs"
    LOG_DIR.mkdir(parents=True, exist_ok=True)

APP_LOG_FILE = LOG_DIR / "app.log"
ERROR_LOG_FILE = LOG_DIR / "error.log"
FRONTEND_JSONL_FILE = LOG_DIR / "frontend_events.jsonl"
CHANGE_REQUESTS_JSONL_FILE = LOG_DIR / "change_requests.jsonl"

_LOG_FORMAT = (
    "%(asctime)s | %(levelname)-7s | %(name)-22s | "
    "cmp=%(component_id)s | req=%(request_id)s | %(message)s"
)


class ContextDefaultsFilter(logging.Filter):
    """Ensures component_id and request_id fields always exist on LogRecord."""

    def filter(self, record: logging.LogRecord) -> bool:
        if not hasattr(record, "component_id"):
            record.component_id = "-"
        if not hasattr(record, "request_id"):
            record.request_id = "-"
        return True


def _configure_root_trilinguo_logger() -> logging.Logger:
    base_logger = logging.getLogger("trilinguo")
    if base_logger.handlers:
        return base_logger

    base_logger.setLevel(logging.DEBUG)
    formatter = logging.Formatter(_LOG_FORMAT, datefmt="%Y-%m-%d %H:%M:%S")
    ctx_filter = ContextDefaultsFilter()

    # 1. Rotating App Log (10 MB x 5 backups, UTF-8)
    app_handler = RotatingFileHandler(
        APP_LOG_FILE,
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    app_handler.setLevel(logging.INFO)
    app_handler.setFormatter(formatter)
    app_handler.addFilter(ctx_filter)

    # 2. Rotating Error Log (10 MB x 5 backups, UTF-8)
    error_handler = RotatingFileHandler(
        ERROR_LOG_FILE,
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    error_handler.setLevel(logging.WARNING)
    error_handler.setFormatter(formatter)
    error_handler.addFilter(ctx_filter)

    base_logger.addHandler(app_handler)
    base_logger.addHandler(error_handler)
    base_logger.propagate = False
    return base_logger


_configure_done = _configure_root_trilinguo_logger()


def get_logger(module_name: str = "app") -> logging.Logger:
    """Returns a child logger under 'trilinguo.<module_name>'."""
    _configure_root_trilinguo_logger()
    child = logging.getLogger(f"trilinguo.{module_name}")
    child.addFilter(ContextDefaultsFilter())
    return child


def utc_iso_now() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def log_api_event(
    level: str,
    message: str,
    component_id: str = "-",
    request_id: str = "-",
    extra_data: Optional[Dict[str, Any]] = None,
) -> None:
    """Writes a structured log entry with Component ID and Request ID."""
    logger = get_logger("api")
    suffix = f" | data={json.dumps(extra_data, ensure_ascii=False)}" if extra_data else ""
    log_method = getattr(logger, level.lower(), logger.info)
    log_method(
        f"{message}{suffix}",
        extra={"component_id": component_id or "-", "request_id": request_id or "-"},
    )


def log_client_event(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Appends a client-side event / error / interaction to logs/frontend_events.jsonl
    and mirrors warnings/errors to logs/app.log and logs/error.log.
    """
    entry = {
        "event_id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
        "timestamp": utc_iso_now(),
        "level": (payload.get("level") or "INFO").upper(),
        "component_id": payload.get("component_id") or "CMP-UNKNOWN",
        "component_name": payload.get("component_name") or "",
        "page": payload.get("page") or "index.html",
        "action": payload.get("action") or "client_log",
        "message": payload.get("message") or "",
        "selector": payload.get("selector") or "",
        "details": payload.get("details") or {},
    }

    with open(FRONTEND_JSONL_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    lvl = entry["level"]
    log_api_event(
        level="error" if lvl in ("ERROR", "CRITICAL") else ("warning" if lvl == "WARN" else "info"),
        message=f"[FRONTEND:{entry['page']}] {entry['action']} - {entry['message']}",
        component_id=entry["component_id"],
        request_id=entry["event_id"],
        extra_data=entry["details"] if entry["details"] else None,
    )
    return entry


def log_change_request(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Records a component-specific modification or bug report submitted via the
    Visual Component Inspector into logs/change_requests.jsonl.
    """
    ticket_id = f"REQ-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    entry = {
        "ticket_id": ticket_id,
        "timestamp": utc_iso_now(),
        "status": payload.get("status") or "OPEN",
        "priority": payload.get("priority") or "NORMAL",
        "component_id": payload.get("component_id") or "CMP-UNKNOWN",
        "component_name": payload.get("component_name") or "",
        "page": payload.get("page") or "index.html",
        "selector": payload.get("selector") or "",
        "request_type": payload.get("request_type") or "UI_CHANGE",
        "note": (payload.get("note") or "").strip(),
        "author": payload.get("author") or "Team Member",
    }

    with open(CHANGE_REQUESTS_JSONL_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    log_api_event(
        level="info",
        message=f"[CHANGE_REQUEST:{ticket_id}] ({entry['page']} | {entry['selector']}) {entry['note']}",
        component_id=entry["component_id"],
        request_id=ticket_id,
    )
    return entry


def get_change_requests(limit: int = 100) -> List[Dict[str, Any]]:
    """Reads all active component change requests from logs/change_requests.jsonl."""
    if not CHANGE_REQUESTS_JSONL_FILE.exists():
        return []
    items: List[Dict[str, Any]] = []
    with open(CHANGE_REQUESTS_JSONL_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                items.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return list(reversed(items))[:limit]


def delete_change_request(ticket_id: str) -> bool:
    """Removes a resolved change request ticket by ticket_id."""
    if not CHANGE_REQUESTS_JSONL_FILE.exists():
        return False
    kept: List[str] = []
    removed = False
    with open(CHANGE_REQUESTS_JSONL_FILE, "r", encoding="utf-8") as f:
        for line in f:
            raw = line.strip()
            if not raw:
                continue
            try:
                obj = json.loads(raw)
                if obj.get("ticket_id") == ticket_id:
                    removed = True
                    continue
            except json.JSONDecodeError:
                pass
            kept.append(raw)

    with open(CHANGE_REQUESTS_JSONL_FILE, "w", encoding="utf-8") as f:
        for line in kept:
            f.write(line + "\n")
    return removed


def read_recent_logs(log_type: str = "app", lines: int = 80) -> List[str]:
    """Reads the last N lines of app.log, error.log, or frontend_events.jsonl."""
    target_map = {
        "app": APP_LOG_FILE,
        "error": ERROR_LOG_FILE,
        "frontend": FRONTEND_JSONL_FILE,
        "changes": CHANGE_REQUESTS_JSONL_FILE,
    }
    target = target_map.get(log_type, APP_LOG_FILE)
    if not target.exists():
        return []
    with open(target, "r", encoding="utf-8", errors="replace") as f:
        all_lines = [ln.rstrip("\r\n") for ln in f.readlines() if ln.strip()]
    return all_lines[-lines:]


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    FastAPI Middleware that logs every incoming API request, execution time (ms),
    HTTP status code, and X-Component-ID header if sent by Frontend.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # For frontend HTML/JS/CSS files, attach no-cache headers so browser edits take effect immediately
        path = request.url.path
        if not path.startswith("/api"):
            response: Response = await call_next(request)
            if path == "/" or path.endswith((".html", ".js", ".css")):
                response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
                response.headers["Pragma"] = "no-cache"
                response.headers["Expires"] = "0"
            return response

        req_id = request.headers.get("X-Request-ID") or f"REQ-{uuid.uuid4().hex[:8].upper()}"
        cmp_id = request.headers.get("X-Component-ID") or "-"
        start_time = time.perf_counter()

        try:
            response: Response = await call_next(request)
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            status_code = response.status_code

            level = "error" if status_code >= 500 else ("warning" if status_code >= 400 else "info")
            log_api_event(
                level=level,
                message=f"{request.method} {path} -> HTTP {status_code} ({elapsed_ms} ms)",
                component_id=cmp_id,
                request_id=req_id,
            )
            response.headers["X-Request-ID"] = req_id
            return response
        except Exception as exc:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            tb_str = traceback.format_exc()
            log_api_event(
                level="error",
                message=f"UNHANDLED EXCEPTION in {request.method} {path} ({elapsed_ms} ms): {exc}\n{tb_str}",
                component_id=cmp_id,
                request_id=req_id,
            )
            raise
