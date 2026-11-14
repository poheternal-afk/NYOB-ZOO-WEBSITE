"""
============================================================================
TRILINGUO / NYOB ZOO — PYDANTIC VALIDATION SCHEMAS (schemas.py)
============================================================================
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


# --- AUTHENTICATION SCHEMAS ---

class DirectLoginRequest(BaseModel):
    identifier: str = Field(..., min_length=2, description="Gmail, Phone number, or Username")
    channel: str = Field(default="email")
    account_name: Optional[str] = None
    native_lang: str = Field(default="vi", pattern="^(en|vi|hmn)$")
    target_lang: str = Field(default="hmn", pattern="^(en|vi|hmn)$")
    accepted_terms: bool = Field(...)


class UserResponse(BaseModel):
    id: int
    account_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    auth_provider: str
    native_lang: str
    target_lang: str
    role: str = "user"
    is_active: bool = True
    accepted_terms: bool
    learning_block: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- TRANSLATOR & HISTORY SCHEMAS ---

class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)
    source_lang: str = Field(..., pattern="^(en|vi|hmn)$")
    target_lang: str = Field(..., pattern="^(en|vi|hmn)$")
    save_history: bool = Field(default=True)


class LookupSelectionRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=250)
    source_lang: str = Field(default="vi", pattern="^(en|vi|hmn)$")
    target_lang: str = Field(default="hmn", pattern="^(en|vi|hmn)$")


class TranslateResponse(BaseModel):
    source_text: str
    translated_text: str
    source_lang: str
    target_lang: str
    hmn_text: str
    vi_text: str
    en_text: str
    phonetic: str
    pos_code: str
    grammar_note: str
    saved_to_history: bool = False
    history_id: Optional[int] = None


class HistoryItemResponse(BaseModel):
    id: int
    block_key: str
    source_lang: str
    target_lang: str
    source_text: str
    translated_text: str
    hmn_text: Optional[str] = None
    vi_text: Optional[str] = None
    en_text: Optional[str] = None
    phonetic: Optional[str] = None
    pos_code: Optional[str] = None
    grammar_note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- NOTEBOOK, FLASHCARD & QUIZ SCHEMAS ---

class NotebookCreateRequest(BaseModel):
    source_text: str = Field(..., min_length=1)
    target_text: str = Field(..., min_length=1)
    hmn_text: Optional[str] = None
    vi_text: Optional[str] = None
    en_text: Optional[str] = None
    phonetic: Optional[str] = ""
    pos_code: Optional[str] = "(nth) nthe"
    example_sentence: Optional[str] = ""
    block_key: Optional[str] = None


class NotebookItemResponse(BaseModel):
    id: int
    block_key: str
    source_text: str
    target_text: str
    hmn_text: Optional[str] = None
    vi_text: Optional[str] = None
    en_text: Optional[str] = None
    phonetic: Optional[str] = None
    pos_code: Optional[str] = None
    example_sentence: Optional[str] = None
    quiz_attempts: int
    quiz_correct: int
    remembered: bool
    is_mastered: bool
    created_at: datetime


class FlashcardGenerateRequest(BaseModel):
    word_ids: List[int] = Field(..., description="Must contain at least 4 word IDs")


class QuizGenerateRequest(BaseModel):
    word_ids: List[int] = Field(..., description="Must contain at least 10 word IDs")


class QuizAnswerItem(BaseModel):
    word_id: int
    selected_answer: str
    is_correct: Optional[bool] = None


class QuizSubmitRequest(BaseModel):
    answers: List[QuizAnswerItem] = Field(..., min_length=1)
    block_key: Optional[str] = None


# --- PROFILE & PROGRESS METRICS SCHEMAS ---

class ProfileUpdateRequest(BaseModel):
    account_name: str = Field(..., min_length=1, max_length=120)
    email: Optional[str] = None
    phone: Optional[str] = None
    native_lang: str = Field(..., pattern="^(en|vi|hmn)$")
    target_lang: str = Field(..., pattern="^(en|vi|hmn)$")


class ProgressMetricsResponse(BaseModel):
    block_key: str
    native_lang: str
    target_lang: str
    total_notebook_words: int
    mastered_words: int
    total_quiz_questions: int
    total_quiz_correct: int
    quiz_accuracy: float


# --- ADMIN PORTAL & RBAC SCHEMAS ---

class AdminUserUpdateRequest(BaseModel):
    username: Optional[str] = Field(default=None, max_length=120)
    account_name: Optional[str] = Field(default=None, max_length=120)
    email: Optional[str] = None
    phone: Optional[str] = None
    native_lang: Optional[str] = Field(default=None, pattern="^(en|vi|hmn)$")
    active_target_lang: Optional[str] = Field(default=None, pattern="^(en|vi|hmn)$")
    target_lang: Optional[str] = Field(default=None, pattern="^(en|vi|hmn)$")
    is_active: Optional[bool] = None


class AdminRoleUpdateRequest(BaseModel):
    role: str = Field(..., pattern="^(user|admin|super_admin)$")


# --- COMMUNITY CONTRIBUTION & ADMIN CORPUS TRAINING SCHEMAS ---

class UserContributionCreateRequest(BaseModel):
    hmn_text: str = Field(..., min_length=1, max_length=500, description="Từ hoặc câu tiếng Hmong (Bắt buộc)")
    vi_text: Optional[str] = Field(default="", max_length=500, description="Bản dịch sang Tiếng Việt")
    en_text: Optional[str] = Field(default="", max_length=500, description="Bản dịch sang Tiếng Anh")
    note: Optional[str] = Field(default="", max_length=500, description="Ghi chú ngữ cảnh hoặc ví dụ")


class CorpusBatchItemInput(BaseModel):
    hmn_text: str = Field(..., min_length=1, max_length=500)
    vi_text: Optional[str] = Field(default="", max_length=500)
    en_text: Optional[str] = Field(default="", max_length=500)
    note: Optional[str] = Field(default="", max_length=500)


class AdminDocumentUploadRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    content: Optional[str] = Field(default="")
    entries: Optional[List[CorpusBatchItemInput]] = Field(default=None)


class CorpusEntryResponse(BaseModel):
    id: int
    hmn_text: str
    vi_text: Optional[str] = ""
    en_text: Optional[str] = ""
    phonetic: Optional[str] = ""
    pos_code: Optional[str] = "(nth) nthe"
    note: Optional[str] = ""
    source_type: str = "user_contribution"
    source_name: Optional[str] = ""
    contributor_id: Optional[int] = None
    revision_count: int = 1
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

