"""
PDF E-Ticket Generation Service.

Generates a professional PDF ticket with QR code for verified tickets.
Uses ReportLab for PDF rendering and qrcode library for QR generation.
"""

import io
import qrcode
from reportlab.lib.pagesizes import A5, landscape
from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


def generate_ticket_pdf(
    ticket_id: str,
    concert_name: str,
    concert_artist: str,
    concert_venue: str,
    concert_date: str,
    concert_time: str,
    concert_price: float,
    buyer_name: str,
    buyer_email: str,
    ticket_status: str,
) -> bytes:
    """
    Generate a PDF e-ticket.

    Returns:
        bytes: The PDF file content.
    """
    buffer = io.BytesIO()
    page_width, page_height = landscape(A5)
    c = canvas.Canvas(buffer, pagesize=landscape(A5))

    # ── Background ──
    c.setFillColor(HexColor("#0f0f1a"))
    c.rect(0, 0, page_width, page_height, fill=True, stroke=False)

    # Accent bar left
    c.setFillColor(HexColor("#7c3aed"))
    c.rect(0, 0, 8 * mm, page_height, fill=True, stroke=False)

    # ── Header band ──
    c.setFillColor(HexColor("#1a1a2e"))
    c.roundRect(12 * mm, page_height - 42 * mm, page_width - 16 * mm, 36 * mm, 8, fill=True, stroke=False)

    # Logo text
    c.setFillColor(HexColor("#c084fc"))
    c.setFont("Helvetica-Bold", 18)
    c.drawString(18 * mm, page_height - 18 * mm, "CONCERTIX")

    # Subtitle
    c.setFillColor(HexColor("#9ca3af"))
    c.setFont("Helvetica", 8)
    c.drawString(18 * mm, page_height - 24 * mm, "E-TICKET  •  TIKET ELEKTRONIK RESMI")

    # Status badge
    status_colors = {
        "paid": ("#10b981", "LUNAS"),
        "used": ("#6b7280", "SUDAH DIGUNAKAN"),
        "pending": ("#f59e0b", "MENUNGGU BAYAR"),
        "cancelled": ("#ef4444", "DIBATALKAN"),
    }
    badge_color, badge_text = status_colors.get(ticket_status, ("#9ca3af", ticket_status.upper()))
    c.setFillColor(HexColor(badge_color))
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(page_width - 14 * mm, page_height - 18 * mm, badge_text)

    # ── Concert Info ──
    y_start = page_height - 56 * mm

    c.setFillColor(HexColor("#ffffff"))
    c.setFont("Helvetica-Bold", 16)
    c.drawString(18 * mm, y_start, concert_name)

    c.setFillColor(HexColor("#c084fc"))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(18 * mm, y_start - 8 * mm, concert_artist)

    # Details grid
    details = [
        ("VENUE", concert_venue),
        ("TANGGAL", concert_date),
        ("WAKTU", concert_time),
        ("HARGA", f"Rp {concert_price:,.0f}"),
    ]

    y = y_start - 22 * mm
    for label, value in details:
        c.setFillColor(HexColor("#6b7280"))
        c.setFont("Helvetica", 7)
        c.drawString(18 * mm, y, label)
        c.setFillColor(HexColor("#d1d5db"))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(18 * mm, y - 4 * mm, value)
        y -= 14 * mm

    # ── Buyer Info ──
    c.setFillColor(HexColor("#6b7280"))
    c.setFont("Helvetica", 7)
    c.drawString(18 * mm, 18 * mm, "PEMEGANG TIKET")
    c.setFillColor(HexColor("#ffffff"))
    c.setFont("Helvetica-Bold", 9)
    c.drawString(18 * mm, 13 * mm, buyer_name)
    c.setFillColor(HexColor("#9ca3af"))
    c.setFont("Helvetica", 8)
    c.drawString(18 * mm, 8 * mm, buyer_email)

    # ── QR Code (right side) ──
    # Dashed separator
    c.setStrokeColor(HexColor("#374151"))
    c.setDash(3, 3)
    separator_x = page_width - 70 * mm
    c.line(separator_x, 10 * mm, separator_x, page_height - 10 * mm)
    c.setDash()

    # Generate QR code
    qr_data = f"CONCERTIX-VERIFY:{ticket_id}"
    qr = qrcode.QRCode(version=1, box_size=10, border=1)
    qr.add_data(qr_data)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#ffffff", back_color="#0f0f1a")

    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)
    qr_reader = ImageReader(qr_buffer)

    qr_size = 42 * mm
    qr_x = separator_x + (70 * mm - qr_size) / 2
    qr_y = page_height / 2 - qr_size / 2 + 8 * mm
    c.drawImage(qr_reader, qr_x, qr_y, width=qr_size, height=qr_size)

    # QR label
    c.setFillColor(HexColor("#9ca3af"))
    c.setFont("Helvetica", 7)
    qr_label_x = separator_x + 35 * mm
    c.drawCentredString(qr_label_x, qr_y - 6 * mm, "Scan untuk verifikasi")

    # Ticket ID
    c.setFillColor(HexColor("#6b7280"))
    c.setFont("Helvetica", 6)
    short_id = ticket_id[:8] if len(ticket_id) > 8 else ticket_id
    c.drawCentredString(qr_label_x, 10 * mm, f"ID: {short_id}...")

    # ── Footer line ──
    c.setStrokeColor(HexColor("#374151"))
    c.setLineWidth(0.5)
    c.line(12 * mm, 5 * mm, separator_x - 4 * mm, 5 * mm)

    c.setFillColor(HexColor("#4b5563"))
    c.setFont("Helvetica", 5)
    c.drawString(12 * mm, 2 * mm, "Concertix — Platform Tiket Konser Resmi  •  Didukung oleh teknologi Blockchain")

    c.save()
    buffer.seek(0)
    return buffer.getvalue()
