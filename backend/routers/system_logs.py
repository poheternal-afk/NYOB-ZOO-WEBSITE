"""
============================================================================
TRILINGUO / NYOB ZOO — SYSTEM LOGS & COMPONENT CHANGE REQUESTS ROUTER
File: WEBSITE/backend/routers/system_logs.py
============================================================================
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from logger_lib import (
    log_client_event,
    log_change_request,
    get_change_requests,
    delete_change_request,
    read_recent_logs,
)

router = APIRouter(prefix="/api/logs", tags=["System Logs & Component Inspector"])


class ClientLogPayload(BaseModel):
    level: str = Field(default="INFO")
    component_id: str = Field(default="CMP-UNKNOWN")
    component_name: Optional[str] = Field(default="")
    page: str = Field(default="index.html")
    action: str = Field(default="client_event")
    message: str = Field(default="")
    selector: Optional[str] = Field(default="")
    details: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ChangeRequestPayload(BaseModel):
    component_id: str = Field(..., description="Standardized Component ID, e.g. CMP-TRANS-10")
    component_name: Optional[str] = Field(default="")
    page: str = Field(default="index.html")
    selector: Optional[str] = Field(default="")
    request_type: str = Field(default="UI_CHANGE")
    priority: str = Field(default="NORMAL")
    note: str = Field(..., min_length=1, description="Description of the requested modification or bug fix")
    author: Optional[str] = Field(default="Developer / User")


@router.post("/client")
def receive_client_log(payload: ClientLogPayload):
    """Receives frontend telemetry, UI actions, and JavaScript error logs."""
    entry = log_client_event(payload.model_dump())
    return {"status": "logged", "entry": entry}


@router.post("/change-request")
def submit_component_change_request(payload: ChangeRequestPayload):
    """
    Saves a developer/team modification request tied to a specific Component ID
    into WEBSITE/backend/logs/change_requests.jsonl.
    """
    entry = log_change_request(payload.model_dump())
    return {"status": "saved", "ticket": entry}


@router.get("/change-requests")
def list_component_change_requests(limit: int = Query(default=100, ge=1, le=500)):
    """Returns all saved component modification / bug tickets."""
    items = get_change_requests(limit=limit)
    return {"total": len(items), "items": items}


@router.delete("/change-requests/{ticket_id}")
def remove_component_change_request(ticket_id: str):
    """Deletes/resolves a specific change request ticket."""
    removed = delete_change_request(ticket_id)
    return {"status": "deleted" if removed else "not_found", "ticket_id": ticket_id}


@router.get("/recent")
def get_recent_system_logs(
    log_type: str = Query(default="app", description="app | error | frontend | changes"),
    lines: int = Query(default=80, ge=5, le=500),
):
    """Returns the last N lines from the selected log file for quick debugging."""
    entries = read_recent_logs(log_type=log_type, lines=lines)
    return {
        "log_type": log_type,
        "count": len(entries),
        "lines": entries,
    }
