"""SQLAlchemy database models."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    """User model representing authenticated users with Nango connections."""

    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid4,
        doc="Primary key UUID",
    )

    nango_connection_id: Mapped[str] = mapped_column(
        Text,
        unique=True,
        nullable=False,
        index=True,
        doc="Reference to Nango connection ID",
    )

    atlassian_account_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        doc="Jira/Atlassian user account identifier",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
        doc="Record creation timestamp",
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
        doc="Last update timestamp",
    )

    def __repr__(self) -> str:
        """String representation of User model."""
        return f"<User(id={self.id}, atlassian_account_id={self.atlassian_account_id})>"
