"""
============================================================================
TRILINGUO / NYOB ZOO — COMMONLY USED PHRASES ROUTER (routers/phrases.py)
============================================================================
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from models import User
from dependencies import get_optional_user
from services.translator import COMMON_PHRASES

router = APIRouter(prefix="/api/phrases", tags=["Commonly Used Phrases"])


@router.get("")
def list_common_phrases(
    category: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    native_lang: Optional[str] = Query(default=None),
    target_lang: Optional[str] = Query(default=None),
    current_user: Optional[User] = Depends(get_optional_user),
):
    n_lang = native_lang or (current_user.native_lang if current_user else "vi")
    t_lang = target_lang or (current_user.target_lang if current_user else "hmn")

    results = []
    search_q = (q or "").strip().lower()

    for phrase in COMMON_PHRASES:
        if category and category != "all" and phrase.get("category") != category:
            continue
        if search_q:
            if (
                search_q not in phrase["hmn"].lower()
                and search_q not in phrase["vi"].lower()
                and search_q not in phrase["en"].lower()
            ):
                continue

        results.append(
            {
                **phrase,
                "source_text": phrase.get(n_lang) or phrase["vi"],
                "target_text": phrase.get(t_lang) or phrase["hmn"],
                "native_lang": n_lang,
                "target_lang": t_lang,
            }
        )

    return {"items": results, "total": len(results)}
