"""
============================================================================
TRILINGUO / NYOB ZOO — ACCOUNT PROFILE & PROGRESS DASHBOARD ROUTER
(routers/profile.py)
Strictly protected by Depends(get_current_user).
Computes the 3 real-time metrics for the active LearningBlock:
1. Total Notebook Words
2. Mastered Words: quiz_attempts >= 10 AND (quiz_correct / quiz_attempts) > 0.80
3. Quiz Accuracy: (total_quiz_correct / total_quiz_questions) * 100
============================================================================
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, LearningBlock, NotebookItem
from schemas import ProfileUpdateRequest, ProgressMetricsResponse
from dependencies import get_current_user, make_block_key, ensure_learning_block
from routers.auth import serialize_user, seed_initial_block_data_if_empty

router = APIRouter(prefix="/api/profile", tags=["Account Profile & Progress"])


def calculate_block_metrics(db: Session, user: User, block_key_override: Optional[str] = None) -> ProgressMetricsResponse:
    seed_initial_block_data_if_empty(db, user)
    block = ensure_learning_block(db, user)
    active_key = block_key_override or block.block_key

    target_block = (
        db.query(LearningBlock)
        .filter(LearningBlock.user_id == user.id, LearningBlock.block_key == active_key)
        .first()
    ) or block

    words = (
        db.query(NotebookItem)
        .filter(NotebookItem.user_id == user.id, NotebookItem.block_key == active_key)
        .all()
    )

    total_notebook_words = len(words)
    mastered_words = sum(
        1
        for w in words
        if int(w.quiz_attempts or 0) >= 10
        and (int(w.quiz_correct or 0) / int(w.quiz_attempts)) > 0.80
    )

    total_q = int(target_block.total_quiz_questions or 0)
    total_c = int(target_block.total_quiz_correct or 0)
    quiz_accuracy = round((total_c / total_q) * 100.0, 1) if total_q > 0 else 0.0

    return ProgressMetricsResponse(
        block_key=active_key,
        native_lang=target_block.native_lang,
        target_lang=target_block.target_lang,
        total_notebook_words=total_notebook_words,
        mastered_words=mastered_words,
        total_quiz_questions=total_q,
        total_quiz_correct=total_c,
        quiz_accuracy=quiz_accuracy,
    )


@router.get("")
def get_profile_and_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    metrics = calculate_block_metrics(db, current_user)
    blocks = (
        db.query(LearningBlock)
        .filter(LearningBlock.user_id == current_user.id)
        .all()
    )
    return {
        "user": serialize_user(current_user),
        "metrics": metrics,
        "available_blocks": [
            {
                "block_key": b.block_key,
                "native_lang": b.native_lang,
                "target_lang": b.target_lang,
                "total_quiz_questions": b.total_quiz_questions,
                "total_quiz_correct": b.total_quiz_correct,
            }
            for b in blocks
        ],
    }


@router.put("")
def update_profile_and_language_block(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.native_lang == payload.target_lang:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngôn ngữ 'Tôi là' và 'Tôi muốn học' không được trùng nhau!",
        )

    if payload.email and payload.email.strip():
        clean_email = payload.email.strip().lower()
        conflict = (
            db.query(User)
            .filter(User.email == clean_email, User.id != current_user.id)
            .first()
        )
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Địa chỉ Gmail này đã được liên kết với một tài khoản khác.",
            )
        current_user.email = clean_email

    if payload.phone and payload.phone.strip():
        clean_phone = payload.phone.strip()
        conflict_phone = (
            db.query(User)
            .filter(User.phone == clean_phone, User.id != current_user.id)
            .first()
        )
        if conflict_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Số điện thoại này đã được liên kết với một tài khoản khác.",
            )
        current_user.phone = clean_phone

    current_user.account_name = payload.account_name.strip()
    current_user.native_lang = payload.native_lang
    current_user.target_lang = payload.target_lang

    db.commit()
    db.refresh(current_user)

    seed_initial_block_data_if_empty(db, current_user)
    metrics = calculate_block_metrics(db, current_user)

    return {
        "user": serialize_user(current_user),
        "metrics": metrics,
    }


@router.get("/progress", response_model=ProgressMetricsResponse)
def get_progress_metrics_only(
    block_key: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return calculate_block_metrics(db, current_user, block_key_override=block_key)
