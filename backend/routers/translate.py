"""
============================================================================
TRILINGUO / NYOB ZOO — TRANSLATION & HISTORY ROUTER (routers/translate.py)
============================================================================
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User, TranslationHistory
from schemas import (
    TranslateRequest,
    LookupSelectionRequest,
    TranslateResponse,
    HistoryItemResponse,
)
from dependencies import get_current_user, get_optional_user, make_block_key, ensure_learning_block
from services.translator import translate_text_3way

router = APIRouter(prefix="/api/translate", tags=["Translator & History"])


@router.post("", response_model=TranslateResponse)
def translate_endpoint(
    payload: TranslateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    result = translate_text_3way(
        text=payload.text,
        source_lang=payload.source_lang,
        target_lang=payload.target_lang,
    )

    saved_to_history = False
    history_id = None

    if current_user and payload.save_history and result["source_text"]:
        ensure_learning_block(db, current_user)
        block_key = make_block_key(current_user.native_lang, current_user.target_lang)

        # Avoid duplicate consecutive entry for the exact same source_text in this block
        existing = (
            db.query(TranslationHistory)
            .filter(
                TranslationHistory.user_id == current_user.id,
                TranslationHistory.block_key == block_key,
                TranslationHistory.source_text == result["source_text"],
            )
            .first()
        )
        if existing:
            db.delete(existing)
            db.flush()

        hist = TranslationHistory(
            user_id=current_user.id,
            block_key=block_key,
            source_lang=payload.source_lang,
            target_lang=payload.target_lang,
            source_text=result["source_text"],
            translated_text=result["translated_text"],
            hmn_text=result["hmn_text"],
            vi_text=result["vi_text"],
            en_text=result["en_text"],
            phonetic=result["phonetic"],
            pos_code=result["pos_code"],
            grammar_note=result["grammar_note"],
        )
        db.add(hist)
        db.commit()
        db.refresh(hist)
        saved_to_history = True
        history_id = hist.id

    return TranslateResponse(
        **result,
        saved_to_history=saved_to_history,
        history_id=history_id,
    )


@router.post("/lookup")
def lookup_selected_text_endpoint(payload: LookupSelectionRequest):
    result = translate_text_3way(
        text=payload.text,
        source_lang=payload.source_lang,
        target_lang=payload.target_lang,
    )
    return {
        "original": payload.text.strip(),
        "hmn": result["hmn_text"],
        "vi": result["vi_text"],
        "en": result["en_text"],
        "phonetic": result["phonetic"],
        "posCode": result["pos_code"],
        "note": result["grammar_note"],
    }


@router.get("/history", response_model=List[HistoryItemResponse])
def get_translation_history_endpoint(
    block_key: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    active_block = block_key or make_block_key(current_user.native_lang, current_user.target_lang)
    items = (
        db.query(TranslationHistory)
        .filter(
            TranslationHistory.user_id == current_user.id,
            TranslationHistory.block_key == active_block,
        )
        .order_by(TranslationHistory.created_at.desc())
        .limit(100)
        .all()
    )
    return items


@router.delete("/history")
def clear_translation_history_endpoint(
    block_key: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    active_block = block_key or make_block_key(current_user.native_lang, current_user.target_lang)
    db.query(TranslationHistory).filter(
        TranslationHistory.user_id == current_user.id,
        TranslationHistory.block_key == active_block,
    ).delete(synchronize_session=False)
    db.commit()
    return {"status": "cleared", "block_key": active_block}
