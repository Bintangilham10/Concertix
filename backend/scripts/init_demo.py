"""
Initialize the local Docker demo database.

This script is intentionally idempotent: it creates missing tables, adds one
admin account, and inserts realistic concert rows only when they do not exist.
It is meant for local DevSecOps demos, not as a production migration system.
"""

import os
import sys
from datetime import datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.config import get_settings
from app.database import Base
from app.models import Block, Concert, Ticket, Transaction, User  # noqa: F401
from app.services.auth_service import hash_password


ADMIN_EMAIL = os.getenv("DEMO_ADMIN_EMAIL", "admin@concertix.com")
ADMIN_PASSWORD = os.getenv("DEMO_ADMIN_PASSWORD", "Admin@123")
ADMIN_NAME = os.getenv("DEMO_ADMIN_NAME", "Admin Concertix")

DEMO_CONCERTS = [
    {
        "name": "Jakarta Summer Beat 2026",
        "artist": "Raisa & Friends",
        "description": "Festival pop malam minggu dengan line-up lokal populer.",
        "venue": "ICE BSD, Tangerang",
        "date": datetime(2026, 7, 11, 19, 0, 0),
        "time": "19:00 WIB",
        "price": 500,
        "quota": 1200,
        "available_tickets": 1200,
        "image_url": "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3",
    },
    {
        "name": "Indie Lights Festival 2026",
        "artist": "Hindia, Kunto Aji, Feast",
        "description": "Konser indie multi-artist dengan area kuliner dan merch booth.",
        "venue": "Ecopark Ancol, Jakarta",
        "date": datetime(2026, 8, 2, 18, 30, 0),
        "time": "18:30 WIB",
        "price": 500,
        "quota": 1500,
        "available_tickets": 1500,
        "image_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
    },
    {
        "name": "Symphony Night Bandung 2026",
        "artist": "Tulus Orchestra Experience",
        "description": "Pertunjukan orkestra modern dengan tata cahaya immersive.",
        "venue": "Sasana Budaya Ganesha, Bandung",
        "date": datetime(2026, 9, 5, 20, 0, 0),
        "time": "20:00 WIB",
        "price": 500,
        "quota": 900,
        "available_tickets": 900,
        "image_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
    },
]


def init_demo() -> None:
    """Create tables and seed demo data for local Docker runs."""
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

    Base.metadata.create_all(bind=engine)

    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        admin = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if admin is None:
            admin = User(
                email=ADMIN_EMAIL,
                full_name=ADMIN_NAME,
                password_hash=hash_password(ADMIN_PASSWORD),
                role="admin",
            )
            db.add(admin)
            print(f"[init-demo] Created admin user: {ADMIN_EMAIL}")
        elif admin.role != "admin":
            admin.role = "admin"
            print(f"[init-demo] Updated user role to admin: {ADMIN_EMAIL}")

        inserted = 0
        for concert_data in DEMO_CONCERTS:
            existing = (
                db.query(Concert)
                .filter(Concert.name == concert_data["name"])
                .first()
            )
            if existing is None:
                db.add(Concert(**concert_data))
                inserted += 1

        db.commit()
        print(
            "[init-demo] Database ready. "
            f"Inserted {inserted} concerts. Admin login email: {ADMIN_EMAIL}"
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_demo()
