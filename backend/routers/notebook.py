"""
============================================================================
TRILINGUO / NYOB ZOO — PERSONAL NOTEBOOK, FLASHCARDS (>=4) & QUIZZES (>=10)
(routers/notebook.py)
All routes strictly guarded by Depends(get_current_user).
============================================================================
"""

import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, NotebookItem
from schemas import (
    NotebookCreateRequest,
    NotebookItemResponse,
    FlashcardGenerateRequest,
    QuizGenerateRequest,
    QuizSubmitRequest,
)
from dependencies import get_current_user, make_block_key, ensure_learning_block
from services.translator import DICTIONARY
from routers.auth import seed_initial_block_data_if_empty

router = APIRouter(prefix="/api/notebook", tags=["Personal Notebook, Flashcards & Quizzes"])


def serialize_notebook_item(item: NotebookItem) -> NotebookItemResponse:
    attempts = int(item.quiz_attempts or 0)
    correct = int(item.quiz_correct or 0)
    is_mastered = attempts >= 10 and (correct / attempts) > 0.80
    return NotebookItemResponse(
        id=item.id,
        block_key=item.block_key,
        source_text=item.source_text,
        target_text=item.target_text,
        hmn_text=item.hmn_text,
        vi_text=item.vi_text,
        en_text=item.en_text,
        phonetic=item.phonetic,
        pos_code=item.pos_code,
        example_sentence=item.example_sentence,
        quiz_attempts=attempts,
        quiz_correct=correct,
        remembered=bool(item.remembered),
        is_mastered=is_mastered,
        created_at=item.created_at,
    )


@router.get("", response_model=List[NotebookItemResponse])
def list_notebook_items(
    block_key: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    seed_initial_block_data_if_empty(db, current_user)
    active_block = block_key or make_block_key(current_user.native_lang, current_user.target_lang)
    items = (
        db.query(NotebookItem)
        .filter(
            NotebookItem.user_id == current_user.id,
            NotebookItem.block_key == active_block,
        )
        .order_by(NotebookItem.created_at.desc())
        .all()
    )
    return [serialize_notebook_item(i) for i in items]


@router.post("", response_model=NotebookItemResponse)
def add_word_to_notebook(
    payload: NotebookCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_learning_block(db, current_user)
    active_block = payload.block_key or make_block_key(current_user.native_lang, current_user.target_lang)

    existing = (
        db.query(NotebookItem)
        .filter(
            NotebookItem.user_id == current_user.id,
            NotebookItem.block_key == active_block,
            NotebookItem.target_text.ilike(payload.target_text.strip()),
        )
        .first()
    )
    if existing:
        return serialize_notebook_item(existing)

    new_item = NotebookItem(
        user_id=current_user.id,
        block_key=active_block,
        source_text=payload.source_text.strip(),
        target_text=payload.target_text.strip(),
        hmn_text=payload.hmn_text or payload.target_text.strip(),
        vi_text=payload.vi_text or payload.source_text.strip(),
        en_text=payload.en_text or "",
        phonetic=payload.phonetic or "",
        pos_code=payload.pos_code or "(nth) nthe",
        example_sentence=payload.example_sentence or "",
        quiz_attempts=0,
        quiz_correct=0,
        remembered=False,
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return serialize_notebook_item(new_item)


@router.patch("/{item_id}/remember", response_model=NotebookItemResponse)
def toggle_remembered_status(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(NotebookItem)
        .filter(NotebookItem.id == item_id, NotebookItem.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy từ vựng trong Sổ tay.")
    item.remembered = not item.remembered
    db.commit()
    db.refresh(item)
    return serialize_notebook_item(item)


@router.delete("/{item_id}")
def delete_notebook_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(NotebookItem)
        .filter(NotebookItem.id == item_id, NotebookItem.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy từ vựng trong Sổ tay.")
    db.delete(item)
    db.commit()
    return {"status": "deleted", "id": item_id}


@router.post("/flashcards")
def generate_flashcards_endpoint(
    payload: FlashcardGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Validates that the user selected at least 4 vocabulary items before creating Flashcards.
    """
    if len(payload.word_ids) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng tích chọn tối thiểu 4 từ vựng trong Sổ tay để tạo Flashcard!",
        )

    items = (
        db.query(NotebookItem)
        .filter(
            NotebookItem.user_id == current_user.id,
            NotebookItem.id.in_(payload.word_ids),
        )
        .all()
    )
    if len(items) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không tìm đủ tối thiểu 4 từ hợp lệ trong Sổ tay cá nhân.",
        )

    return {"cards": [serialize_notebook_item(i) for i in items], "total": len(items)}


@router.post("/quiz/generate")
def generate_quiz_endpoint(
    payload: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Validates that the user selected at least 10 vocabulary items before generating a Quiz.
    """
    if len(payload.word_ids) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng tích chọn tối thiểu 10 từ vựng trong Sổ tay để tạo bài kiểm tra Quizzes!",
        )

    selected_items = (
        db.query(NotebookItem)
        .filter(
            NotebookItem.user_id == current_user.id,
            NotebookItem.id.in_(payload.word_ids),
        )
        .all()
    )
    if len(selected_items) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cần tối thiểu 10 từ vựng hợp lệ trong Sổ tay để tạo bài kiểm tra Quizzes.",
        )

    all_block_items = (
        db.query(NotebookItem)
        .filter(NotebookItem.user_id == current_user.id)
        .all()
    )
    fallback_pool = [d.get(current_user.native_lang, d["vi"]) for d in DICTIONARY]

    questions = []
    for idx, word in enumerate(selected_items, start=1):
        distractor_candidates = [
            w.source_text for w in all_block_items if w.id != word.id and w.source_text != word.source_text
        ]
        if len(distractor_candidates) < 3:
            distractor_candidates.extend([f for f in fallback_pool if f != word.source_text])

        unique_distractors = list(dict.fromkeys(distractor_candidates))
        chosen_distractors = random.sample(unique_distractors, k=min(3, len(unique_distractors)))
        options = chosen_distractors + [word.source_text]
        random.shuffle(options)

        questions.append(
            {
                "index": idx,
                "word_id": word.id,
                "prompt_text": word.target_text,
                "phonetic": word.phonetic or "",
                "pos_code": word.pos_code or "(nth) nthe",
                "correct_answer": word.source_text,
                "options": options,
            }
        )

    return {"questions": questions, "total": len(questions)}


@router.post("/quiz/submit")
def submit_quiz_results_endpoint(
    payload: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Updates quiz_attempts (+1) and quiz_correct (+1 if right) for EACH individual vocabulary item
    and accumulates total_quiz_questions & total_quiz_correct on the user's LearningBlock.
    """
    block = ensure_learning_block(db, current_user)
    correct_count = 0
    total_submitted = len(payload.answers)

    for ans in payload.answers:
        item = (
            db.query(NotebookItem)
            .filter(NotebookItem.id == ans.word_id, NotebookItem.user_id == current_user.id)
            .first()
        )
        if not item:
            continue

        is_right = (
            bool(ans.is_correct)
            if ans.is_correct is not None
            else (ans.selected_answer.strip().lower() == item.source_text.strip().lower())
        )
        item.quiz_attempts = int(item.quiz_attempts or 0) + 1
        if is_right:
            item.quiz_correct = int(item.quiz_correct or 0) + 1
            correct_count += 1

    block.total_quiz_questions = int(block.total_quiz_questions or 0) + total_submitted
    block.total_quiz_correct = int(block.total_quiz_correct or 0) + correct_count
    db.commit()

    # Recompute real-time block metrics
    all_words = (
        db.query(NotebookItem)
        .filter(
            NotebookItem.user_id == current_user.id,
            NotebookItem.block_key == block.block_key,
        )
        .all()
    )
    mastered_count = sum(
        1
        for w in all_words
        if (w.quiz_attempts or 0) >= 10 and ((w.quiz_correct or 0) / w.quiz_attempts) > 0.80
    )
    accuracy = (
        round((block.total_quiz_correct / block.total_quiz_questions) * 100.0, 1)
        if block.total_quiz_questions > 0
        else 0.0
    )

    return {
        "total_questions": total_submitted,
        "correct_count": correct_count,
        "metrics": {
            "block_key": block.block_key,
            "total_notebook_words": len(all_words),
            "mastered_words": mastered_count,
            "total_quiz_questions": block.total_quiz_questions,
            "total_quiz_correct": block.total_quiz_correct,
            "quiz_accuracy": accuracy,
        },
    }
