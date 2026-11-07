"""
============================================================================
TRILINGUO / NYOB ZOO — PYDANTIC VALIDATION SCHEMAS (schemas.py)
============================================================================
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


# --- AUTHENTICATION & OTP SCHEMAS ---

class SendOtpRequest(BaseModel):
    identifier: str = Field(..., min_length=3, description="User Gmail address or Phone number")
    channel: str = Field(default="email", description="'email' or 'phone'")
    purpose: str = Field(default="login", description="'login', 'register', or 'forgot_password'")


class VerifyOtpAuthRequest(BaseModel):
    identifier: str = Field(..., min_length=2)
    channel: str = Field(default="email")
    otp_code: Optional[str] = Field(default=None)
    account_name: Optional[str] = None
    password: Optional[str] = None
    native_lang: str = Field(default="vi", pattern="^(en|vi|hmn)$")
    target_lang: str = Field(default="hmn", pattern="^(en|vi|hmn)$")
    accepted_terms: bool = Field(...)


class DirectLoginRequest(BaseModel):
    identifier: str = Field(..., min_length=2, description="Gmail, Phone number, or Username")
    channel: str = Field(default="email")
    account_name: Optional[str] = None
    native_lang: str = Field(default="vi", pattern="^(en|vi|hmn)$")
    target_lang: str = Field(default="hmn", pattern="^(en|vi|hmn)$")
    accepted_terms: bool = Field(...)


class PasswordLoginRequest(BaseModel):
    identifier: str = Field(..., min_length=2, description="Email or Phone number")
    password: str = Field(..., min_length=6)
    native_lang: Optional[str] = Field(default=None, pattern="^(en|vi|hmn)$")
    target_lang: Optional[str] = Field(default=None, pattern="^(en|vi|hmn)$")
    accepted_terms: bool = Field(default=True)


class ForgotPasswordResetRequest(BaseModel):
    identifier: str = Field(..., min_length=2, description="Gmail or Phone number")
    otp_code: Optional[str] = Field(default=None)
    new_password: str = Field(..., min_length=6)


class GoogleOAuthTokenRequest(BaseModel):
    id_token: Optional[str] = None
    access_token: Optional[str] = None
    native_lang: str = Field(default="vi", pattern="^(en|vi|hmn)$")
    target_lang: str = Field(default="hmn", pattern="^(en|vi|hmn)$")
    accepted_terms: bool = Field(...)


class FacebookOAuthTokenRequest(BaseModel):
    access_token: str = Field(..., min_length=5)
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
