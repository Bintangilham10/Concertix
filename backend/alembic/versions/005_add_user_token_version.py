"""add user token version

Revision ID: 005_user_token_version
Revises: 004_password_reset_otps
Create Date: 2026-05-01
"""

from alembic import op
import sqlalchemy as sa


revision = "005_user_token_version"
down_revision = "004_password_reset_otps"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "token_version" not in columns:
        op.add_column(
            "users",
            sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
        )
        op.alter_column("users", "token_version", server_default=None)


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "token_version" in columns:
        op.drop_column("users", "token_version")
