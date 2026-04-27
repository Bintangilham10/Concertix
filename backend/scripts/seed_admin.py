"""
Seed script to create an admin user in the Concertix database.

Usage:
    cd backend
    python -m scripts.seed_admin

This script reads DATABASE_URL from backend/.env and creates an admin
user if one doesn't already exist.
"""

import sys
import os

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.user import User
from app.services.auth_service import hash_password
from app.config import get_settings

# ── Configuration ──────────────────────────────────────────────
ADMIN_EMAIL = os.getenv("DEMO_ADMIN_EMAIL", "admin@concertix.com")
ADMIN_PASSWORD = os.getenv("DEMO_ADMIN_PASSWORD", "Admin@123")
ADMIN_NAME = os.getenv("DEMO_ADMIN_NAME", "Admin Concertix")


def seed_admin():
    """Create the admin user if it doesn't exist."""
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL)

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()

        if existing:
            print(f"[!] Admin user already exists: {ADMIN_EMAIL} (role={existing.role})")
            if existing.role != "admin":
                existing.role = "admin"
                db.commit()
                print(f"[OK] Updated role to 'admin' for {ADMIN_EMAIL}")
            return

        admin = User(
            email=ADMIN_EMAIL,
            full_name=ADMIN_NAME,
            password_hash=hash_password(ADMIN_PASSWORD),
            role="admin",
        )
        db.add(admin)
        db.commit()
        print(f"[OK] Admin user created successfully!")
        print(f"   Email:    {ADMIN_EMAIL}")
        print("   Password: configured via DEMO_ADMIN_PASSWORD")
        print(f"   Role:     admin")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error creating admin: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
