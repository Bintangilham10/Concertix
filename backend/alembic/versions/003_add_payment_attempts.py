"""add immutable payment attempts

Revision ID: 003_payment_attempts
Revises: 002_add_constraints
Create Date: 2026-04-28
"""

from alembic import op
import sqlalchemy as sa


revision = "003_payment_attempts"
down_revision = "002_add_constraints"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "payment_attempts" not in inspector.get_table_names():
        op.create_table(
            "payment_attempts",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("transaction_id", sa.String(), nullable=False),
            sa.Column("ticket_id", sa.String(), nullable=False),
            sa.Column("amount", sa.Float(), nullable=False),
            sa.Column(
                "status",
                sa.Enum(
                    "pending",
                    "success",
                    "failed",
                    "expired",
                    "refunded",
                    name="payment_attempt_status",
                ),
                nullable=False,
            ),
            sa.Column("is_current", sa.Boolean(), nullable=False),
            sa.Column("midtrans_transaction_id", sa.String(), nullable=True),
            sa.Column("payment_type", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
            sa.ForeignKeyConstraint(["ticket_id"], ["tickets.id"]),
            sa.ForeignKeyConstraint(["transaction_id"], ["transactions.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    indexes = {index["name"] for index in inspector.get_indexes("payment_attempts")}
    if "ix_payment_attempts_transaction_current" not in indexes:
        op.create_index(
            "ix_payment_attempts_transaction_current",
            "payment_attempts",
            ["transaction_id", "is_current"],
            unique=False,
        )
    if "ix_payment_attempts_ticket_id" not in indexes:
        op.create_index(
            "ix_payment_attempts_ticket_id",
            "payment_attempts",
            ["ticket_id"],
            unique=False,
        )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "payment_attempts" in inspector.get_table_names():
        indexes = {index["name"] for index in inspector.get_indexes("payment_attempts")}
        if "ix_payment_attempts_ticket_id" in indexes:
            op.drop_index("ix_payment_attempts_ticket_id", table_name="payment_attempts")
        if "ix_payment_attempts_transaction_current" in indexes:
            op.drop_index(
                "ix_payment_attempts_transaction_current",
                table_name="payment_attempts",
            )
        op.drop_table("payment_attempts")
    sa.Enum(name="payment_attempt_status").drop(op.get_bind(), checkfirst=True)
