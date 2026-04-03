# Concertix —  Website Pembelian Tiket Konser

Platform digital untuk pembelian tiket konser secara online.
Sistem mencakup autentikasi pengguna (JWT), pemesanan tiket, pembayaran via Midtrans, dan verifikasi integritas tiket berbasis blockchain.

**Tim:** Bintang Ilham & Juanda Sitorus  
**Institusi:** FTE, Telkom University  
**Metodologi:** DevSecOps

---

## Tech Stack

| Layer        | Teknologi                              |
| ------------ | -------------------------------------- |
| **Frontend** | Next.js, TypeScript, Tailwind CSS      |
| **Backend**  | FastAPI, Pydantic, SQLAlchemy          |
| **Database** | PostgreSQL                             |
| **Cache**    | Redis                                  |
| **Auth**     | JWT (access + refresh token)           |
| **Payment**  | Midtrans                               |
| **CI/CD**    | GitHub, Jenkins, Docker              |
| **Security** | OWASP ZAP, SonarQube, Dependency-Check |

---

## Project Structure

```text
Concertix/
+-- frontend/                  # Next.js + TypeScript
+-- backend/                   # FastAPI + Python
+-- docker-compose.yml         # Orchestration
+-- Jenkinsfile                # CI/CD Pipeline
+-- sonar-project.properties   # SonarQube config
+-- locustfile.py              # Load testing scenario
+-- README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 15+

### Setup

1. **Clone repository**

   ```bash
   git clone https://github.com/Bintangilham10/Concertix.git
   cd Concertix
   ```

2. **Copy environment variables**

   ```bash
   cp .env.example .env
   ```

3. **Run with Docker Compose**

   ```bash
   docker compose up --build
   ```

4. **Or run manually**

   **Frontend**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   **Backend**

   ```bash
   cd backend
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # Linux/Mac
   # source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

---

## API Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Metrics: `http://localhost:8000/metrics`

### Endpoint Penting

- Auth: `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`
- Concerts: `/concerts`
- Tickets: `/tickets/order`, `/tickets/my-tickets`, `/tickets/{ticket_id}/verify`
- Payments: `/payments/create`, `/payments/webhook`
- Blockchain: `/blockchain/info`, `/blockchain/verify`, `/blockchain/ticket/{ticket_id}/validate`

---

## Security & DevSecOps Highlights

- Rate limiting login (`5/minute`) untuk mitigasi brute-force.
- RBAC (`require_role`) untuk endpoint admin.
- Validasi signature Midtrans webhook.
- Token blacklist di Redis saat logout.
- Strict CORS whitelist untuk origin frontend.
- Integrasi SAST/DAST/Dependency scan di pipeline Jenkins.

---

## Roles

| Role         | Fitur                                                                  |
| ------------ | ---------------------------------------------------------------------- |
| **Customer** | Registrasi, login, lihat konser, pesan tiket, bayar, verifikasi tiket |
| **Admin**    | Kelola data konser dan validasi tiket                                  |

---

## License

This project is developed for academic purposes at Telkom University.
