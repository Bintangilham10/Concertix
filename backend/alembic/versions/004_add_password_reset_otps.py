"""add password reset otps

Revision ID: 004_password_reset_otps
Revises: 003_payment_attempts
Create Date: 2026-05-01
"""

from alembic import op
import sqlalchemy as sa


revision = "004_password_reset_otps"
down_revision = "003_payment_attempts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "password_reset_otps" not in inspector.get_table_names():
        op.create_table(
            "password_reset_otps",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("user_id", sa.String(), nullable=False),
            sa.Column("otp_hash", sa.String(), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    indexes = {index["name"] for index in inspector.get_indexes("password_reset_otps")}
    if "ix_password_reset_otps_user_id" not in indexes:
        op.create_index(
            "ix_password_reset_otps_user_id",
            "password_reset_otps",
            ["user_id"],
            unique=False,
        )
    if "ix_password_reset_otps_expires_at" not in indexes:
        op.create_index(
            "ix_password_reset_otps_expires_at",
            "password_reset_otps",
            ["expires_at"],
            unique=False,
        )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "password_reset_otps" in inspector.get_table_names():
        indexes = {index["name"] for index in inspector.get_indexes("password_reset_otps")}
        if "ix_password_reset_otps_expires_at" in indexes:
            op.drop_index("ix_password_reset_otps_expires_at", table_name="password_reset_otps")
        if "ix_password_reset_otps_user_id" in indexes:
            op.drop_index("ix_password_reset_otps_user_id", table_name="password_reset_otps")
        op.drop_table("password_reset_otps")
