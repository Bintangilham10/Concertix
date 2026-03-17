# 🎵 Concertix — Website Pembelian Tiket Konser

Platform digital untuk pembelian tiket konser secara online. Sistem mencakup autentikasi pengguna (JWT), pemesanan tiket, pembayaran via Midtrans, penerbitan tiket digital QR code, dan rancangan validasi integritas tiket menggunakan blockchain (planned).

**Tim:** Bintangilham10 · Juanda Sitorus
**Institusi:** FTE, Telkom University 
**Metodologi:** DevSecOps

---

## 🛠️ Tech Stack

| Layer        | Teknologi                                    |
| ------------ | -------------------------------------------- |
| **Frontend** | Next.js, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend**  | FastAPI, Pydantic, SQLAlchemy                |
| **Database** | PostgreSQL                                   |
| **Auth**     | JWT (access + refresh token)                 |
| **Payment**  | Midtrans                                     |
| **CI/CD**    | GitHub → Jenkins → Docker                    |
| **Security** | OWASP ZAP, SonarQube, Dependency-Check       |

---

## 📁 Project Structure

```
Concertix/
├── frontend/          # Next.js + TypeScript
├── backend/           # FastAPI + Python
├── docker-compose.yml # Orchestration
├── Jenkinsfile        # CI/CD Pipeline
└── CLAUDE.md          # Project specification
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 15+

### Setup

1. **Clone repository**

   ```bash
   git clone https://github.com/<your-username>/Concertix.git
   cd Concertix
   ```

2. **Copy environment variables**

   ```bash
   cp .env.example .env
   ```

3. **Run with Docker Compose**

   ```bash
   docker-compose up --build
   ```

4. **Or run manually:**

   **Frontend:**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   **Backend:**

   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

---

## 👥 Roles

| Role         | Kemampuan                                                            |
| ------------ | -------------------------------------------------------------------- |
| **Customer** | Registrasi, login, lihat konser, pesan tiket, bayar, terima QR tiket |
| **Admin**    | Kelola data konser, monitoring transaksi, lihat laporan              |

---

## 📄 License

This project is developed for academic purposes at Telkom University.
