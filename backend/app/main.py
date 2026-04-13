from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, concerts, tickets, payments
from app.middleware.rate_limiter import setup_rate_limiter

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API untuk platform pembelian tiket konser Concertix",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── T7 Mitigation: Strict CORS ──────────────────────────────────────────────
# In production, replace with actual domain(s)
ALLOWED_ORIGINS = [
    "http://localhost:3000",       # Next.js dev
    "http://concertix-frontend:3000",  # Docker internal
]

# Read production origin from env if set
if hasattr(settings, "CORS_ALLOWED_ORIGIN") and settings.CORS_ALLOWED_ORIGIN:
    # Handle comma-separated list of origins
    origins = [origin.strip() for origin in settings.CORS_ALLOWED_ORIGIN.split(",") if origin.strip()]
    ALLOWED_ORIGINS.extend(origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── T4 Mitigation: Rate Limiting ────────────────────────────────────────────
setup_rate_limiter(app)

# ── Prometheus Metrics Instrumentation (Week 2) ─────────────────────────────
try:
    from prometheus_fastapi_instrumentator import Instrumentator

    Instrumentator().instrument(app).expose(app, endpoint="/metrics")
except ImportError:
    pass  # prometheus_fastapi_instrumentator not installed yet

# ── Register Routers ────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(concerts.router, prefix="/concerts", tags=["Concerts"])
app.include_router(tickets.router, prefix="/tickets", tags=["Tickets"])
app.include_router(payments.router, prefix="/payments", tags=["Payments"])

# Blockchain router (Week 3) — registered dynamically if available
try:
    from app.routers import blockchain
    app.include_router(blockchain.router, prefix="/blockchain", tags=["Blockchain"])
except ImportError:
    pass


@app.get("/", tags=["Root"])
async def root():
    """Health check endpoint."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }
