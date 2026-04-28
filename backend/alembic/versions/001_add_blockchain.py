"""add blockchain table

Revision ID: 001_add_blockchain
Revises: (initial)
Create Date: 2026-03-31

Adds the 'blockchain' table.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '001_add_blockchain'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if 'blockchain' not in inspector.get_table_names():
        op.create_table(
            'blockchain',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('index', sa.Integer(), nullable=False, unique=True),
            sa.Column('timestamp', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('timestamp_raw', sa.String(), nullable=True),
            sa.Column('ticket_id', sa.String(), nullable=False, index=True),
            sa.Column('user_id', sa.String(), nullable=False),
            sa.Column('concert_id', sa.String(), nullable=False),
            sa.Column('action', sa.String(), nullable=False, server_default='ISSUED'),
            sa.Column('data_hash', sa.String(), nullable=False),
            sa.Column('previous_hash', sa.String(), nullable=False),
            sa.Column('hash', sa.String(), nullable=False, unique=True),
            sa.Column('nonce', sa.Integer(), nullable=False, server_default='0'),
        )

    indexes = {index['name'] for index in inspector.get_indexes('blockchain')}
    if 'ix_blockchain_ticket_id' not in indexes:
        op.create_index('ix_blockchain_ticket_id', 'blockchain', ['ticket_id'])


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if 'blockchain' in inspector.get_table_names():
        indexes = {index['name'] for index in inspector.get_indexes('blockchain')}
        if 'ix_blockchain_ticket_id' in indexes:
            op.drop_index('ix_blockchain_ticket_id', table_name='blockchain')
        op.drop_table('blockchain')
