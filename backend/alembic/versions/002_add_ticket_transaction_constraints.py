"""add ticket and transaction uniqueness constraints

Revision ID: 002_add_constraints
Revises: 001_add_blockchain
Create Date: 2026-04-27
"""

from alembic import op
import sqlalchemy as sa


revision = "002_add_constraints"
down_revision = "001_add_blockchain"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    ticket_indexes = {index["name"] for index in inspector.get_indexes("tickets")}
    ticket_constraints = {
        constraint["name"] for constraint in inspector.get_unique_constraints("tickets")
    }
    transaction_constraints = {
        constraint["name"] for constraint in inspector.get_unique_constraints("transactions")
    }

    if (
        "uq_tickets_user_concert_active" not in ticket_indexes
        and "uq_tickets_user_concert" not in ticket_constraints
    ):
        op.create_index(
            "uq_tickets_user_concert_active",
            "tickets",
            ["user_id", "concert_id"],
            unique=True,
            postgresql_where=sa.text("status IN ('pending', 'paid', 'used')"),
        )
    if "uq_transactions_ticket_id" not in transaction_constraints:
        op.create_unique_constraint(
            "uq_transactions_ticket_id",
            "transactions",
            ["ticket_id"],
        )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    ticket_indexes = {index["name"] for index in inspector.get_indexes("tickets")}
    ticket_constraints = {
        constraint["name"] for constraint in inspector.get_unique_constraints("tickets")
    }
    transaction_constraints = {
        constraint["name"] for constraint in inspector.get_unique_constraints("transactions")
    }

    if "uq_transactions_ticket_id" in transaction_constraints:
        op.drop_constraint("uq_transactions_ticket_id", "transactions", type_="unique")
    if "uq_tickets_user_concert_active" in ticket_indexes:
        op.drop_index("uq_tickets_user_concert_active", table_name="tickets")
    if "uq_tickets_user_concert" in ticket_constraints:
        op.drop_constraint("uq_tickets_user_concert", "tickets", type_="unique")
