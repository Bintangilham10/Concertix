"""add ticket and transaction uniqueness constraints

Revision ID: 002_add_ticket_transaction_constraints
Revises: 001_add_blockchain
Create Date: 2026-04-27
"""

from alembic import op


revision = "002_add_ticket_transaction_constraints"
down_revision = "001_add_blockchain"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_tickets_user_concert",
        "tickets",
        ["user_id", "concert_id"],
    )
    op.create_unique_constraint(
        "uq_transactions_ticket_id",
        "transactions",
        ["ticket_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_transactions_ticket_id", "transactions", type_="unique")
    op.drop_constraint("uq_tickets_user_concert", "tickets", type_="unique")
