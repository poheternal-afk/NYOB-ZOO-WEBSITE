"""
============================================================================
TRILINGUO / NYOB ZOO — SQLALCHEMY DATABASE MODELS (models.py)
Partitioned by Language Learning Blocks (native_lang -> target_lang)
============================================================================
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from database import Base


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    account_name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)
    phone = Column(String(40), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=True)
    avatar_url = Column(String(512), nullable=True)

    # Auth provider: 'google', 'facebook', 'email', 'phone'
    auth_provider = Column(String(50), nullable=False, default="email")
    provider_user_id = Column(String(255), index=True, nullable=True)

    # Learning Profile: "Tôi là" (native_lang) & "Tôi muốn học" (target_lang)
    native_lang = Column(String(10), nullable=False, default="vi")
    target_lang = Column(String(10), nullable=False, default="hmn")

    # Mandatory Terms & Conditions acceptance
    accepted_terms = Column(Boolean, nullable=False, default=True)
    is_verified = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    learning_blocks = relationship(
        "LearningBlock", back_populates="user", cascade="all, delete-orphan"
    )
    history_items = relationship(
        "TranslationHistory", back_populates="user", cascade="all, delete-orphan"
    )
    notebook_items = relationship(
        "NotebookItem", back_populates="user", cascade="all, delete-orphan"
    )


class LearningBlock(Base):
    """
    Stores per-user progress for each Language Learning Block (e.g. 'vi_hmn', 'hmn_en').
    Allows one user to study multiple language pairs without mixing progress metrics.
    """
    __tablename__ = "learning_blocks"
    __table_args__ = (
        UniqueConstraint("user_id", "block_key", name="uq_user_learning_block"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    block_key = Column(String(30), nullable=False, index=True)  # e.g. 'vi_hmn'
    native_lang = Column(String(10), nullable=False)
    target_lang = Column(String(10), nullable=False)

    # Cumulative Quiz stats for Quiz Accuracy = (total_quiz_correct / total_quiz_questions) * 100
    total_quiz_questions = Column(Integer, nullable=False, default=0)
    total_quiz_correct = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="learning_blocks")


class TranslationHistory(Base):
    """
    Stores every word/phrase/sentence translated by a user under their active Learning Block.
    """
    __tablename__ = "translation_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    block_key = Column(String(30), nullable=False, index=True)
    source_lang = Column(String(10), nullable=False)
    target_lang = Column(String(10), nullable=False)
    source_text = Column(Text, nullable=False)
    translated_text = Column(Text, nullable=False)
    hmn_text = Column(Text, nullable=True)
    vi_text = Column(Text, nullable=True)
    en_text = Column(Text, nullable=True)
    phonetic = Column(String(255), nullable=True)
    pos_code = Column(String(60), nullable=True)
    grammar_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="history_items")


class NotebookItem(Base):
    """
    Personal Notebook (Sổ tay cá nhân) items saved from Translation History or Commonly Used Phrases.
    Tracks per-word quiz_attempts and quiz_correct to determine Mastered status:
    Mastered iff quiz_attempts >= 10 AND (quiz_correct / quiz_attempts) > 0.80.
    """
    __tablename__ = "personal_notebook"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    block_key = Column(String(30), nullable=False, index=True)
    source_text = Column(Text, nullable=False)
    target_text = Column(Text, nullable=False)
    hmn_text = Column(Text, nullable=True)
    vi_text = Column(Text, nullable=True)
    en_text = Column(Text, nullable=True)
    phonetic = Column(String(255), nullable=True)
    pos_code = Column(String(60), nullable=True)
    example_sentence = Column(Text, nullable=True)

    quiz_attempts = Column(Integer, nullable=False, default=0)
    quiz_correct = Column(Integer, nullable=False, default=0)
    remembered = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="notebook_items")


class OtpVerification(Base):
    """
    Stores 6-digit OTP verification codes with a strict 5-minute TTL for:
    - Registration / Login via Gmail SMTP or Phone SMS/Zalo
    - Forgot Password verification before password reset
    """
    __tablename__ = "otp_verifications"

    id = Column(Integer, primary_key=True, index=True)
    identifier = Column(String(255), nullable=False, index=True)  # email or phone number
    channel = Column(String(30), nullable=False, default="email")  # 'email' or 'phone'
    purpose = Column(String(50), nullable=False, default="login")  # 'login', 'register', 'forgot_password'
    otp_code = Column(String(12), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    verified = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
