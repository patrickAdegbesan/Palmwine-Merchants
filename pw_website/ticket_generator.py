import os
from io import BytesIO
import qrcode
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from PIL import Image
import barcode
from barcode.writer import ImageWriter

def generate_barcode(code):
    """Generate Code128 barcode as PNG image"""
    code128 = barcode.get_barcode_class('code128')
    rv = BytesIO()
    code128(code, writer=ImageWriter()).write(rv)
    return rv.getvalue()

def generate_qr_code(data):
    """Generate QR code as PNG image"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to bytes
    img_byte_arr = BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    return img_byte_arr.getvalue()

def generate_ticket_pdf(ticket_data):
    """Generate a PDF ticket with barcode and QR code
    
    Args:
        ticket_data (dict): Dictionary containing ticket information:
            - code: Ticket code
            - customer_name: Name of customer
            - event: Dict containing event details (name, date, location)
            - amount: Amount paid
            - quantity: Number of tickets
            - reference: Payment reference
    
    Returns:
        BytesIO: PDF file as bytes
    """
    buffer = BytesIO()
    
    # Create the PDF object, using the BytesIO object as its "file."
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4  # Keep track of the usable dimensions

    # Register fonts if not already registered
    try:
        pdfmetrics.getFont('Helvetica')
    except:
        # If Helvetica isn't available, fall back to built-in fonts
        pdfmetrics.registerFont(TTFont('CustomFont', os.path.join(os.path.dirname(__file__), 'fonts', 'Arial.ttf')))
        # Replace all Helvetica references with CustomFont
        p._fontname = 'CustomFont'
    
    # Add company logo/header
    logo_path = os.path.join(os.path.dirname(__file__), '..', 'static', 'img', 'comp_logo.png')
    if os.path.exists(logo_path):
        p.drawImage(logo_path, width/2 - 100, height - 150, width=200, preserveAspectRatio=True)
    
    # Title
    p.setFont("Helvetica-Bold", 24)
    p.drawCentredString(width/2, height - 100, "EVENT TICKET")
    
    # Event Details
    p.setFont("Helvetica-Bold", 18)
    p.drawString(50, height - 150, ticket_data['event']['name'])
    
    p.setFont("Helvetica", 14)
    p.drawString(50, height - 170, f"Date: {ticket_data['event']['date']}")
    p.drawString(50, height - 190, f"Location: {ticket_data['event']['location']}")
    
    # Customer Details
    p.setFont("Helvetica-Bold", 14)
    p.drawString(50, height - 230, "TICKET HOLDER")
    p.setFont("Helvetica", 12)
    p.drawString(50, height - 250, f"Name: {ticket_data['customer_name']}")
    # Ticket type: prefer explicit value if provided
    ticket_type = ticket_data.get('ticket_type')
    if not ticket_type:
        ticket_type = 'Premium Table' if ticket_data.get('is_premium') else 'Regular'
    p.drawString(50, height - 270, f"Ticket Type: {ticket_type}")
    p.drawString(50, height - 290, f"Quantity: {ticket_data['quantity']} {'tickets' if ticket_data['quantity'] > 1 else 'ticket'}")
    p.drawString(50, height - 310, f"Amount Paid: ₦{ticket_data['amount']:,.2f}")
    
    # Generate and add QR code
    qr_data = {
        'code': ticket_data['code'],
        'ref': ticket_data['reference'],
        'quantity': ticket_data['quantity']
    }
    qr_image = generate_qr_code(str(qr_data))
    qr_reader = ImageReader(BytesIO(qr_image))
    p.drawImage(qr_reader, width - 200, height - 400, width=150, height=150)
    
    # Add barcode
    barcode_image = generate_barcode(ticket_data['code'])
    barcode_reader = ImageReader(BytesIO(barcode_image))
    p.drawImage(barcode_reader, 50, height - 400, width=300, height=50)
    
    # Add ticket code
    p.setFont("Helvetica-Bold", 12)
    p.drawString(50, height - 420, f"Ticket Code: {ticket_data['code']}")
    p.drawString(50, height - 440, f"Reference: {ticket_data['reference']}")
    
    # Terms and conditions
    p.setFont("Helvetica", 8)
    p.drawString(50, 50, "Terms & Conditions:")
    p.drawString(50, 40, "1. This ticket must be presented at the event entrance.")
    p.drawString(50, 30, "2. The QR code will be scanned for verification.")
    p.drawString(50, 20, "3. Not transferable. Valid only for the named ticket holder.")
    
    # Save the PDF
    p.showPage()
    p.save()
    
    # Move to the beginning of the BytesIO buffer
    buffer.seek(0)
    return buffer
