from django.shortcuts import render, get_object_or_404, redirect
from django.conf import settings
from django.http import JsonResponse, HttpResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.core.paginator import Paginator
from django.core.mail import EmailMessage
from decimal import Decimal, InvalidOperation
from .models import Event, Booking, Ticket, Payment, Inquiry
from .ticket_generator import generate_ticket_pdf
import json
import uuid
from datetime import datetime
import os
import requests
import qrcode
from io import BytesIO

def generate_qr_code(data):
    """Generate a QR code for ticket data"""
    try:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        # Ensure data is a string and encode special characters
        if isinstance(data, dict):
            data = json.dumps(data)
        qr.add_data(str(data))
        qr.make(fit=True)
        
        # Create an image from the QR Code
        qr_image = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to bytes
        buffer = BytesIO()
        qr_image.save(buffer, format='PNG')
        buffer.seek(0)
        return buffer.getvalue()
    except Exception as e:
        print(f"Error generating QR code: {e}")
        # Return a simple black square as fallback
        from PIL import Image
        fallback = Image.new('RGB', (200, 200), color='white')
        buffer = BytesIO()
        fallback.save(buffer, format='PNG')
        buffer.seek(0)
        return buffer.getvalue()


def home(request):
    """Homepage with featured events"""
    featured_events = Event.objects.filter(is_active=True, date__gte=timezone.now())[:3]
    context = {
        'featured_events': featured_events,
        'page_title': 'Home - Palmwine Merchants & Flames'
    }
    return render(request, 'index.html', context)


def about(request):
    """About page"""
    context = {
        'page_title': 'About Us - Palmwine Merchants & Flames'
    }
    return render(request, 'about.html', context)


def events(request):
    """Events listing page"""
    events_list = Event.objects.filter(is_active=True, date__gte=timezone.now())
    paginator = Paginator(events_list, 6)  # Show 6 events per page
    page_number = request.GET.get('page')
    events = paginator.get_page(page_number)
    
    context = {
        'events': events,
        'page_title': 'Events - Palmwine Merchants & Flames'
    }
    return render(request, 'events.html', context)


def booking(request):
    """Booking page with quote form"""
    context = {
        'page_title': 'Book Your Experience - Palmwine Merchants & Flames'
    }
    return render(request, 'booking.html', context)


def contact(request):
    """Contact page"""
    context = {
        'page_title': 'Contact Us - Palmwine Merchants & Flames'
    }
    return render(request, 'contact.html', context)


def menu(request):
    return render(request, 'menu.html')


def verify_tickets(request):
    """Ticket verification page"""
    context = {
        'page_title': 'Verify Tickets - Palmwine Merchants & Flames'
    }
    return render(request, 'verify.html', context)

def verify_ticket_page(request, code):
    """Individual ticket verification page"""
    try:
        ticket = get_object_or_404(Ticket, ticket_id=code)
        context = {
            'page_title': f'Ticket Details - {code}',
            'ticket': {
                'code': ticket.ticket_id,
                'customer_name': ticket.customer_name,
                'event_name': ticket.event.name if ticket.event else 'Unknown Event',
                'event_location': ticket.event.location if ticket.event else '',
                'event_date': ticket.event.date.isoformat() if ticket.event else '',
                'email': ticket.customer_email,
                'amount': float(ticket.amount_paid) if ticket.amount_paid else 0,
                'purchase_date': ticket.purchase_date.isoformat() if ticket.purchase_date else '',
                'verified': ticket.verified,
                'verified_at': ticket.verified_at.isoformat() if ticket.verified_at else None,
                'quantity': ticket.quantity or 1,
                'order_reference': ticket.order_reference
            }
        }
        return render(request, 'ticket_details.html', context)
    except Ticket.DoesNotExist:
        return HttpResponse('Invalid ticket code', status=404)

@require_http_methods(["GET"])
def download_ticket(request, code):
    """Download ticket PDF"""
    try:
        ticket = get_object_or_404(Ticket, ticket_id=code)
        
        # Format event date
        event_date = ''
        if ticket.event and ticket.event.date:
            try:
                event_date = ticket.event.date.strftime("%A, %B %d, %Y • %I:%M %p")
            except Exception:
                event_date = str(ticket.event.date)
        
        # Prepare ticket data for PDF generation
        # Determine ticket type based on amount (>= 100,000 is Premium)
        ticket_type = 'Premium' if (ticket.amount_paid or 0) >= 100000 else 'Regular'

        ticket_data = {
            'code': ticket.ticket_id,
            'reference': ticket.order_reference or 'N/A',
            'customer_name': ticket.customer_name,
            'quantity': ticket.quantity or 1,
            'is_premium': (ticket.amount_paid or 0) >= 100000,
            'ticket_type': ticket_type,
            'amount': float(ticket.amount_paid) if ticket.amount_paid else 0,
            'event': {
                'name': ticket.event.name if ticket.event else 'Bush Party',
                'date': event_date,
                'location': ticket.event.location if ticket.event else 'Lagos beachfront'
            }
        }
        
        try:
            # Generate PDF
            pdf_buffer = generate_ticket_pdf(ticket_data)
            
            # Return PDF file
            response = HttpResponse(pdf_buffer.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="ticket-{code}.pdf"'
            return response
            
        except Exception as pdf_error:
            print(f"PDF Generation Error: {str(pdf_error)}")
            return JsonResponse({
                'success': False,
                'message': 'Error generating ticket PDF. Please try again or contact support.'
            }, status=500)
        
    except Ticket.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Ticket not found'
        }, status=404)
        
    except Exception as e:
        print(f"Unexpected Error: {str(e)}")
        return JsonResponse({
            'success': False,
            'message': 'An unexpected error occurred. Please try again.'
        }, status=500)


# API Views for AJAX functionality

@csrf_exempt
@require_http_methods(["POST"])
def submit_inquiry(request):
    """Handle contact form submissions"""
    try:
        data = json.loads(request.body)
        
        inquiry = Inquiry.objects.create(
            name=data.get('name'),
            contact=data.get('contact'),
            inquiry_type=data.get('inquiry_type', 'general'),
            message=data.get('message'),
            newsletter_signup=data.get('newsletter_signup', False),
            whatsapp_updates=data.get('whatsapp_updates', False)
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Thank you for your inquiry! We\'ll respond within 24 hours.',
            'inquiry_id': str(inquiry.id)
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': 'Sorry, there was an error submitting your inquiry. Please try again.'
        }, status=400)


from django.contrib.auth.decorators import login_required

@login_required(login_url='/login/')
def dashboard(request):
    """Unified management dashboard"""
    context = {
        'page_title': 'Dashboard - Palmwine Merchants & Flames',
        'user': request.user
    }
    return render(request, 'dashboard.html', context)

def management(request):
    """Redirect old management URL to new dashboard"""
    return redirect('pw_website:dashboard')


@csrf_exempt
@require_http_methods(["GET", "POST", "PUT", "DELETE"])
def bookings_api(request, booking_id=None):
    """API endpoint for booking CRUD operations"""
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            
            # Calculate costs based on guests and package type
            base_rates = {
                'palmwine': 15000,
                'cocktails': 25000,
                'flame': 35000,
                'full': 50000
            }
            
            guests = int(data.get('guests', 50))
            package_type = data.get('package_type', 'palmwine')
            
            # Calculate costs
            base_cost = base_rates.get(package_type, 15000)
            subtotal = base_cost * guests
            tax = subtotal * 0.075  # 7.5% VAT
            total = subtotal + tax
            deposit_required = total * 0.5  # 50% deposit
            
            # Create booking
            booking = Booking.objects.create(
                quote_id=data.get('quote_id'),
                client_name=data.get('client_name'),
                phone=data.get('phone'),
                email=data.get('email', ''),
                event_type=data.get('event_type'),
                event_date=datetime.strptime(data.get('event_date'), '%Y-%m-%d').date(),
                venue=data.get('venue'),
                guests=guests,
                package_type=package_type,
                subtotal=subtotal,
                tax=tax,
                total=total,
                deposit_required=deposit_required,
                status='confirmed'
            )
            
            # Create payment record
            payment = Payment.objects.create(
                booking=booking,
                payer_name=data.get('client_name'),
                phone=data.get('phone'),
                email=data.get('email', ''),
                amount=data.get('payment_amount'),
                payment_method='paystack',
                transaction_reference=data.get('payment_reference'),
                payment_date=timezone.now(),
                status='completed'
            )
            
            return JsonResponse({
                'success': True,
                'booking_id': str(booking.id),
                'quote_id': booking.quote_id,
                'status': booking.status
            })
            
        except Exception as e:
            print('Error creating booking:', str(e))
            return JsonResponse({
                'success': False,
                'message': str(e)
            }, status=400)
            
    elif request.method == "GET":
        if booking_id:
            booking = get_object_or_404(Booking, id=booking_id)
            data = {
                'id': str(booking.id),
                'quote_id': booking.quote_id,
                'client_name': booking.client_name,
                'phone': booking.phone,
                'email': booking.email,
                'event_type': booking.event_type,
                'event_date': booking.event_date.isoformat(),
                'venue': booking.venue,
                'guests': booking.guests,
                'package_type': booking.package_type,
                'subtotal': float(booking.subtotal),
                'delivery_cost': float(booking.delivery_cost),
                'tax': float(booking.tax),
                'total': float(booking.total),
                'deposit_required': float(booking.deposit_required),
                'status': booking.status,
                'created_at': booking.created_at.isoformat()
            }
            return JsonResponse(data)
    bookings = Booking.objects.all().order_by('-created_at')
    data = [{
        'id': str(booking.id),
        'quote_id': booking.quote_id,
        'client_name': booking.client_name,
        'phone': booking.phone,
        'email': booking.email,
        'event_type': booking.event_type,
        'event_date': booking.event_date.isoformat(),
        'venue': booking.venue,
        'guests': booking.guests,
        'package_type': booking.package_type,
        'subtotal': float(booking.subtotal),
        'delivery_cost': float(booking.delivery_cost),
        'tax': float(booking.tax),
        'total': float(booking.total),
        'deposit_required': float(booking.deposit_required),
        'status': booking.status,
        'created_at': booking.created_at.isoformat()
    } for booking in bookings]
    return JsonResponse(data, safe=False)


@csrf_exempt
@require_http_methods(["POST"])
def update_booking_status(request, booking_id):
    """Update booking status"""
    try:
        data = json.loads(request.body)
        new_status = data.get('status')
        if not new_status:
            return JsonResponse({'success': False, 'message': 'No status provided'}, status=400)

        booking = get_object_or_404(Booking, id=booking_id)
        booking.status = new_status
        booking.save()

        return JsonResponse({
            'success': True,
            'booking_id': str(booking.id),
            'new_status': booking.status
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def create_booking_quote(request):
    """Generate booking quote"""
    try:
        data = json.loads(request.body)
        
        # Calculate pricing based on package and guests
        base_rates = {
            'palmwine': 15000,
            'cocktails': 25000,
            'flame': 35000,
            'full': 50000
        }
        
        package_type = data.get('package_type', 'palmwine')
        guests = int(data.get('guests', 50))
        distance_km = int(data.get('distance_km', 0))
        
        # Calculate costs
        base_cost = base_rates.get(package_type, 15000)
        subtotal = base_cost * guests
        delivery_cost = distance_km * 500 if distance_km > 10 else 0
        tax = subtotal * 0.075  # 7.5% VAT
        total = subtotal + delivery_cost + tax
        deposit_required = total * 0.5  # 50% deposit
        
        # Generate quote ID
        quote_id = f"PW{datetime.now().strftime('%Y%m%d')}{str(uuid.uuid4())[:6].upper()}"
        
        # Create booking record
        booking = Booking.objects.create(
            quote_id=quote_id,
            client_name=data.get('client_name'),
            phone=data.get('phone'),
            email=data.get('email', ''),
            event_type=data.get('event_type'),
            event_date=datetime.strptime(data.get('event_date'), '%Y-%m-%d').date(),
            venue=data.get('venue'),
            guests=guests,
            package_type=package_type,
            distance_km=distance_km,
            subtotal=subtotal,
            delivery_cost=delivery_cost,
            tax=tax,
            total=total,
            deposit_required=deposit_required
        )
        
        return JsonResponse({
            'success': True,
            'quote_id': quote_id,
            'pricing': {
                'subtotal': float(subtotal),
                'delivery_cost': float(delivery_cost),
                'tax': float(tax),
                'total': float(total),
                'deposit_required': float(deposit_required)
            },
            'booking_id': str(booking.id)
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': 'Error generating quote. Please check your details and try again.'
        }, status=400)


@require_http_methods(["GET", "POST", "PUT", "DELETE"])
def events_api(request, event_id=None):
    """API endpoint for event CRUD operations"""
    if request.method == "GET":
        if event_id:
            event = get_object_or_404(Event, id=event_id)
            data = {
                'id': str(event.id),
                'name': event.name,
                'description': event.description,
                'event_type': event.event_type,
                'date': event.date.isoformat(),
                'location': event.location,
                'price_per_ticket': float(event.price_per_ticket),
                'tickets_available': event.tickets_available,
                'featured_image': event.featured_image.url if event.featured_image else None
            }
            return JsonResponse(data)
        else:
            events = Event.objects.all()
            events_data = [{
                'id': str(ev.id),
                'name': ev.name,
                'description': ev.description,
                'event_type': ev.event_type,
                'date': ev.date.isoformat(),
                'location': ev.location,
                'max_capacity': ev.max_capacity,
                'price_per_ticket': float(ev.price_per_ticket),
                'tickets_available': ev.tickets_available,
                'featured_image': ev.featured_image.url if ev.featured_image else None
            } for ev in events]
            return JsonResponse(events_data, safe=False)
    
    elif request.method == "POST":
        try:
            data = json.loads(request.body)
            event = Event.objects.create(
                name=data['name'],
                description=data['description'],
                event_type=data['event_type'],
                date=datetime.fromisoformat(data['date']),
                location=data['location'],
                max_capacity=data['max_capacity'],
                price_per_ticket=data['price_per_ticket']
            )
            return JsonResponse({
                'success': True,
                'id': str(event.id),
                'message': 'Event created successfully'
            })
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': str(e)
            }, status=400)
    
    elif request.method == "PUT":
        try:
            event = get_object_or_404(Event, id=event_id)
            data = json.loads(request.body)
            
            event.name = data.get('name', event.name)
            event.description = data.get('description', event.description)
            event.event_type = data.get('event_type', event.event_type)
            if 'date' in data:
                event.date = datetime.fromisoformat(data['date'])
            event.location = data.get('location', event.location)
            event.max_capacity = data.get('max_capacity', event.max_capacity)
            event.price_per_ticket = data.get('price_per_ticket', event.price_per_ticket)
            event.is_active = data.get('is_active', event.is_active)
            
            event.save()
            return JsonResponse({
                'success': True,
                'message': 'Event updated successfully'
            })
        except Event.DoesNotExist:
            return JsonResponse({
                'success': False,
                'message': 'Event not found'
            }, status=404)
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': str(e)
            }, status=400)
    
    elif request.method == "DELETE":
        try:
            event = get_object_or_404(Event, id=event_id)
            event.delete()
            return JsonResponse({
                'success': True,
                'message': 'Event deleted successfully'
            })
        except Event.DoesNotExist:
            return JsonResponse({
                'success': False,
                'message': 'Event not found'
            }, status=404)


def ticket_management(request):
    """Render the admin-like ticket management page."""
    return render(request, 'ticket_management.html')


@csrf_exempt
@require_http_methods(["POST"])
def verify_ticket_api(request):
    """API endpoint for ticket verification"""
    try:
        data = json.loads(request.body)
        print(f"DEBUG: Raw request data: {data}")
        
        # Accept either 'ticket_id' or 'code' (used by frontend)
        ticket_id = data.get('ticket_id') or data.get('code') or data.get('qrData')
        
        # If ticket_id is a string containing JSON, try to parse it
        if isinstance(ticket_id, str) and '{' in ticket_id:
            try:
                json_data = json.loads(ticket_id)
                ticket_id = json_data.get('code')
            except json.JSONDecodeError:
                pass
                
        print(f"DEBUG: Final ticket_id to verify: {ticket_id}")
        
        if not ticket_id:
            return JsonResponse({
                'success': False,
                'valid': False,
                'message': 'Ticket ID is required'
            }, status=400)
        
        try:
            ticket = Ticket.objects.get(ticket_id=ticket_id)
            
            # For debugging:
            print(f"DEBUG: Current ticket state - verified: {ticket.verified}, verified_at: {ticket.verified_at}, verified_by: {ticket.verified_by}")
            
            # Prefer the stored quantity as the source of truth
            total_tickets = ticket.quantity or 1
            
            # Reset verification if requested
            reset_verification = data.get('reset_verification', False)
            
            if reset_verification:
                # Reset verification status
                ticket.verified = False
                ticket.verified_at = None
                ticket.verified_by = None
                ticket.save()
                return JsonResponse({
                    'success': True,
                    'message': 'Verification status reset successfully',
                    'ticket_info': {
                        'code': ticket.ticket_id,
                        'verified': False,
                        'verified_at': None
                    }
                })
                
            # Check verification status
            # Only consider a ticket verified if both verified=True AND verified_at has a value
            if ticket.verified and ticket.verified_at:
                verification_time = ticket.verified_at.strftime('%Y-%m-%d %H:%M:%S')
                return JsonResponse({
                    'success': True,
                    'valid': True,
                    'already_verified': True,
                    'message': f'Ticket was already verified on {verification_time} by {ticket.verified_by or "System"}',
                    'ticket_info': {
                        'code': ticket.ticket_id,
                        'customer_name': ticket.customer_name,
                        'event_name': ticket.event.name if ticket.event else 'Unknown Event',
                        'event_location': ticket.event.location if ticket.event else '',
                        'event_date': ticket.event.date.isoformat() if ticket.event else '',
                        'email': ticket.customer_email,
                        'amount': float(ticket.amount_paid) if ticket.amount_paid else 0,
                        'purchase_date': ticket.purchase_date.isoformat() if ticket.purchase_date else '',
                        'verified_at': ticket.verified_at.isoformat(),
                        'verified_by': ticket.verified_by,
                        'ticket_quantity': total_tickets,
                        'order_reference': ticket.order_reference
                    }
                })
                
            # If we reach here, the ticket is not verified or has inconsistent state
            # Fix any inconsistent state
            if ticket.verified and not ticket.verified_at:
                ticket.verified = False
            elif not ticket.verified and ticket.verified_at:
                ticket.verified_at = None
                ticket.verified_by = None
            ticket.save()
            
            # Set both verified flags and timestamps
            ticket.verified = True
            ticket.verified_at = timezone.now()
            ticket.verified_by = request.user.username if request.user.is_authenticated else 'System'
            ticket.save()
            
            # For debugging:
            print(f"DEBUG: Updated ticket state - verified: {ticket.verified}, verified_at: {ticket.verified_at}, verified_by: {ticket.verified_by}")
            
            return JsonResponse({
                'success': True,
                'valid': True,
                'already_verified': False,
                'message': 'Ticket verified successfully',
                'ticket_info': {
                    'code': ticket.ticket_id,
                    'customer_name': ticket.customer_name,
                    'event_name': ticket.event.name if ticket.event else 'Unknown Event',
                    'event_location': ticket.event.location if ticket.event else '',
                    'event_date': ticket.event.date.isoformat() if ticket.event else '',
                    'email': ticket.customer_email,
                    'amount': float(ticket.amount_paid) if ticket.amount_paid else 0,
                    'purchase_date': ticket.purchase_date.isoformat() if ticket.purchase_date else '',
                    'verified_at': ticket.verified_at.isoformat(),
                    'verified_by': ticket.verified_by,
                    'ticket_quantity': total_tickets,
                    'order_reference': ticket.order_reference
                }
            })
            
        except Ticket.DoesNotExist:
            return JsonResponse({
                'success': False,
                'valid': False,
                'message': f'Invalid ticket ID: {ticket_id}'
            }, status=404)
            
    except json.JSONDecodeError as e:
        return JsonResponse({
            'success': False,
            'valid': False,
            'message': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        print(f"ERROR in verify_ticket_api: {str(e)}")
        return JsonResponse({
            'success': False,
            'valid': False,
            'message': 'Error verifying ticket'
        }, status=500)


@csrf_exempt
@require_http_methods(["GET", "POST", "PUT", "DELETE"])
def tickets_api(request, ticket_id=None):
    """API endpoint for ticket CRUD operations"""
    if request.method == 'GET':
        tickets = Ticket.objects.select_related('event').order_by('-purchase_date')
        data = [{
            'id': str(t.id),
            'ticket_id': t.ticket_id,
            'event': {
                'id': str(t.event.id),
                'name': t.event.name,
                'date': t.event.date.isoformat(),
                'location': t.event.location,
            } if t.event else None,
            'customer_name': t.customer_name,
            'customer_email': t.customer_email,
            'verified': t.verified,
            'purchased_at': t.purchase_date.isoformat(),
            'verified_at': t.verified_at.isoformat() if t.verified_at else None,
        } for t in tickets]
        return JsonResponse(data, safe=False)

    # POST
    try:
        data = json.loads(request.body or b"{}")
        event_id = (data.get('event') or '').strip()
        if not event_id:
            return JsonResponse({ 'success': False, 'message': 'Missing event id' }, status=400)
        try:
            ev = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            return JsonResponse({ 'success': False, 'message': 'Invalid event id' }, status=404)

        ticket_id = (data.get('ticket_id') or '').strip() or f"PMF-{uuid.uuid4().hex[:8].upper()}"
        t = Ticket.objects.create(
            ticket_id=ticket_id,
            event=ev,
            customer_name=(data.get('customer_name') or '').strip(),
            customer_email=(data.get('customer_email') or '').strip(),
            phone=(data.get('phone') or '').strip(),
            amount_paid=data.get('amount_paid') or 0,
        )
        return JsonResponse({
            'id': str(t.id),
            'ticket_id': t.ticket_id,
            'event': { 'id': str(ev.id), 'name': ev.name },
            'customer_name': t.customer_name,
            'customer_email': t.customer_email,
            'verified': t.verified,
            'purchased_at': t.purchase_date.isoformat(),
        })
    except Exception as e:
        return JsonResponse({ 'success': False, 'message': 'Invalid JSON' }, status=400)


@require_http_methods(["GET"])
def event_stats_api(request, event_id=None):
    """API endpoint for event statistics"""
    try:
        if event_id:
            # Get stats for specific event
            event = get_object_or_404(Event, id=event_id)
            total_tickets = Ticket.objects.filter(event=event).count()
            verified_tickets = Ticket.objects.filter(event=event, verified=True).count()
            
            return JsonResponse({
                'event_name': event.name,
                'event_date': event.date.isoformat(),
                'total_tickets': total_tickets,
                'verified_tickets': verified_tickets,
                'unverified_tickets': total_tickets - verified_tickets,
                'verification_rate': round((verified_tickets / total_tickets * 100) if total_tickets > 0 else 0, 1)
            })
        else:
            # Get overall stats
            total_events = Event.objects.filter(is_active=True).count()
            upcoming_events = Event.objects.filter(is_active=True, date__gte=timezone.now()).count()
            total_tickets = Ticket.objects.count()
            verified_tickets = Ticket.objects.filter(verified=True).count()
            
            return JsonResponse({
                'total_events': total_events,
                'upcoming_events': upcoming_events,
                'total_tickets': total_tickets,
                'verified_tickets': verified_tickets,
                'verification_rate': round((verified_tickets / total_tickets * 100) if total_tickets > 0 else 0, 1)
            })
        
    except Exception as e:
        print(f"Error in event_stats_api: {str(e)}")
        return JsonResponse({
            'success': False,
            'message': 'Error fetching statistics'
        }, status=500)


# ---- Payments ----

@csrf_exempt
@require_http_methods(["POST"])
def verify_paystack_payment(request):
    """Verify a Paystack transaction reference via Paystack's API.

    Request body JSON: { "reference": "<paystack_ref>" }
    Response JSON: { "verified": bool, "reference": str, "amount": int, "currency": str, "paid_at": str, "status": str }
    """
    try:
        data = json.loads(request.body or b"{}")
        reference = (data.get('reference') or '').strip()
        if not reference:
            return JsonResponse({ 'success': False, 'message': 'Missing reference' }, status=400)

        secret_key = (getattr(settings, 'PAYSTACK_SECRET_KEY', '') or '').strip()
        if not secret_key:
            return JsonResponse({ 'success': False, 'message': 'Server not configured with PAYSTACK_SECRET_KEY' }, status=500)

        url = f"https://api.paystack.co/transaction/verify/{reference}"
        headers = {
            'Authorization': f'Bearer {secret_key}',
            'Accept': 'application/json'
        }
        r = requests.get(url, headers=headers, timeout=20)
        if r.status_code != 200:
            return JsonResponse({ 'success': False, 'message': 'Paystack verification failed', 'code': r.status_code }, status=400)

        body = r.json() if r.content else {}
        data_obj = (body or {}).get('data') or {}
        status = (data_obj.get('status') or '').lower()
        verified = status == 'success'
        amount_kobo = data_obj.get('amount') or 0
        # Convert kobo to naira to match frontend display/validation
        amount = int((amount_kobo or 0) // 100)
        currency = data_obj.get('currency') or 'NGN'
        paid_at = data_obj.get('paid_at') or data_obj.get('transaction_date') or ''
        ref = data_obj.get('reference') or reference

        return JsonResponse({
            'success': True,
            'gateway': 'paystack',
            'verified': verified,
            'reference': ref,
            'amount': amount,
            'currency': currency,
            'paid_at': paid_at,
            'status': status,
        })

    except requests.Timeout:
        return JsonResponse({ 'success': False, 'message': 'Verification timed out' }, status=504)
    except Exception as e:
        return JsonResponse({ 'success': False, 'message': 'Unexpected error verifying payment' }, status=500)


# ---- Replacements for legacy Netlify functions ----

@csrf_exempt
@require_http_methods(["POST"])
def send_ticket_email(request):
    """Send ticket confirmation via Django email backend.

    Expects JSON: {
      email, customerName, code, amount, eventDetails: { name, date, location }, validUntil, imageUrl
    }
    """
    try:
        data = json.loads(request.body or b"{}")
        print(f"Email data received: {data}")
        
        to_email = (data.get('email') or '').strip()
        if not to_email:
            return JsonResponse({ 'success': False, 'message': 'Missing recipient email' }, status=400)

        name = data.get('customerName') or 'Customer'
        code = data.get('code') or ''
        # Try different amount fields in the payload
        amount = data.get('amount_paid') or data.get('amount') or data.get('amountPaid') or 0
        print(f"Amount extracted: {amount} (type: {type(amount)})")
        ev = data.get('eventDetails') or data.get('event') or {}
        ev_name = ev.get('name') or ev.get('event') or 'Event Ticket'
        ev_date = ev.get('date') or ''
        ev_location = ev.get('location') or ''
        valid_until = data.get('validUntil') or ''

        # Generate and attach the PDF ticket
        ticket = get_object_or_404(Ticket, ticket_id=code)
        event_date = ''
        if ticket.event and ticket.event.date:
            try:
                event_date = ticket.event.date.strftime("%A, %B %d, %Y • %I:%M %p")
            except Exception:
                event_date = str(ticket.event.date)

        ticket_data = {
            'code': ticket.ticket_id,
            'reference': ticket.order_reference or 'N/A',
            'customer_name': ticket.customer_name,
            'quantity': ticket.quantity or 1,
            'is_premium': ticket.amount_paid >= 100000 if ticket.amount_paid else False,
            'amount': float(ticket.amount_paid) if ticket.amount_paid else 0,
            'event': {
                'name': ticket.event.name if ticket.event else 'Bush Party',
                'date': event_date,
                'location': ticket.event.location if ticket.event else 'Lagos beachfront'
            }
        }

        # Generate QR code
        qr_data = {
            'code': code,
            'event': ev_name,
            'date': ev_date,
            'customer': name
        }
        qr_image = generate_qr_code(qr_data)

        subject = f"Your Ticket for {ev_name}"
        # Format amount properly
        try:
            # Convert amount to float first, handling both string and numeric inputs
            amount_float = float(str(amount).replace(',', ''))
            amount_str = f"{amount_float:,.2f}"
        except (ValueError, TypeError) as e:
            print(f"Amount formatting error: {e}, amount value: {amount}, type: {type(amount)}")
            amount_str = str(amount)

        body_lines = [
                f"Hello {name},",
                "",
                "Thank you for your purchase! Your ticket details are below:",
                f"Confirmation Code: {code}",
                f"Ticket Type: {data.get('ticket_type', 'Regular')}",
                f"Number of Tickets: {data.get('quantity', 1)}",
                f"Amount: ₦{amount_str}",
                f"Event: {ev_name}",
                f"Date: {ev_date}",
                f"Location: {ev_location}",
                "",
                "Please find your ticket attached as a PDF.",
                "You can present either the PDF or the QR code at the event entrance for verification.",
                "",
                "Important Notes:",
                f"1. Save your ticket code: {code}",
                f"2. If you can't find the PDF, visit: {request.build_absolute_uri(f'/verify/{code}/')}",
                "3. For any issues, contact us via WhatsApp: +234 803 949 0349",
                "",
                "We look forward to seeing you!",
                "",
                "Best regards,",
                "Palmwine Merchants & Flames",
            ]        # Create the email
        from_email = settings.DEFAULT_FROM_EMAIL
        email = EmailMessage(
            subject=subject,
            body="\n".join(body_lines),
            from_email=from_email,
            to=[to_email],
            reply_to=['info@palmwinemerchants.com']
        )

        # Attach the QR code
        email.attach(f'ticket-qr-{code}.png', qr_image, 'image/png')

        # Generate and attach the PDF ticket
        try:
            pdf_buffer = generate_ticket_pdf(ticket_data)
            email.attach(f'ticket-{code}.pdf', pdf_buffer.read(), 'application/pdf')
        except Exception as pdf_error:
            print(f"Warning: Could not attach PDF ticket: {pdf_error}")

        # Send the email
        try:
            email.send(fail_silently=False)
            print(f"Email sent successfully to {to_email}")
            return JsonResponse({ 'success': True, 'message': 'Email sent successfully.' })
        except Exception as email_error:
            print(f"Error sending email: {email_error}")
            return JsonResponse({ 
                'success': False, 
                'message': 'Could not send email. Please save your ticket code and check your ticket at our website.'
            }, status=500)

    except Exception as e:
        print(f"Unexpected error in send_ticket_email: {e}")
        return JsonResponse({ 
            'success': False, 
            'message': 'An unexpected error occurred. Your ticket is saved, but email could not be sent.'
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def generate_ticket_pdf_api(request):
    """Generate a PDF ticket and return it for download
    
    Expected JSON payload:
    {
        "code": "PMF-...",
        "reference": "...",
        "customerName": "...",
        "email": "...",
        "amount": 1234,
        "quantity": 1,
        "premiumTables": 0,
        "regularTickets": 1,
        "event": {
            "name": "...",
            "date": "...",
            "location": "..."
        }
    }
    """
    try:
        data = json.loads(request.body)
        
        # Determine ticket type from payload
        payload_ticket_type = (data.get('ticket_type') or '').strip()
        if not payload_ticket_type:
            payload_ticket_type = 'Premium' if (data.get('premiumTables') or 0) > 0 else 'Regular'

        # Prepare ticket data for PDF generation
        ticket_data = {
            'code': data['code'],
            'reference': data['reference'],
            'customer_name': data['customerName'],
            'quantity': data.get('quantity', 1),
            'is_premium': data.get('premiumTables', 0) > 0,
            'ticket_type': payload_ticket_type,
            'amount': float(data['amount']),
            'event': {
                'name': data['event']['name'],
                'date': data['event']['date'],
                'location': data['event']['location']
            }
        }
        
        # Generate PDF
        pdf_buffer = generate_ticket_pdf(ticket_data)
        
        # Return PDF file
        response = HttpResponse(pdf_buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="ticket-{ticket_data["code"]}.pdf"'
        return response
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error generating ticket PDF: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def store_ticket(request):
    """Persist ticket/payment details when possible.

    Expected JSON example (from frontend):
    {
      "code": "PMF-PAY-XXXXXX",
      "ref": "PAYSTACK_REF",
      "customerName": "...",
      "phone": "...",
      "email": "...",
      "amount": "5000",
      "eventDetails": { "name": "Event Name", "date": "...", "location": "..." }
    }
    """
    try:
        print(f"Raw request body: {request.body}")
        d = json.loads(request.body or b"{}")
        print(f"Parsed JSON data: {d}")
        
        # Basic extraction
        code = (d.get('code') or '').strip()
        ref = (d.get('ref') or d.get('reference') or '').strip()
        name = (d.get('customerName') or d.get('name') or '').strip()
        phone = (d.get('phone') or '').strip()
        email = (d.get('email') or '').strip() or 'no-email@local'
        # Amount normalization (accept numbers or numeric strings with commas). Allow 'amount_paid' too
        raw_amount = d.get('amount') or d.get('amountPaid') or d.get('amount_paid') or 0
        try:
            amount = Decimal(str(raw_amount).replace(',', '').strip() or '0')
        except (InvalidOperation, AttributeError):
            amount = Decimal('0')
        # Quantity: trust the payload when present (single-type orders)
        try:
            payload_quantity = int(d.get('quantity') or 0)
        except (TypeError, ValueError):
            payload_quantity = 0
        # Accept both legacy 'eventDetails' and new 'event' payloads
        ev = d.get('eventDetails') or d.get('event') or {}
        ev_name = (ev.get('name') or ev.get('event') or '').strip()
        ev_id = (d.get('event_id') or ev.get('id') or '').strip()
        
        print(f"Extracted values - code: '{code}', ref: '{ref}', name: '{name}', amount: {amount}, ev_name: '{ev_name}'")

        stored = False
        event_obj = None
        if ev_id:
            try:
                # Check if ev_id looks like a UUID (36 chars with hyphens)
                import re
                uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                if re.match(uuid_pattern, ev_id.lower()):
                    # Try as UUID
                    event_obj = Event.objects.get(id=ev_id)
                else:
                    # Not a UUID format, skip UUID lookup
                    event_obj = None
            except (Event.DoesNotExist, ValueError, TypeError):
                # If not a valid UUID or not found, continue to name lookup
                event_obj = None
        
        # Always try to find by name if we don't have an event yet
        if not event_obj and ev_name:
            event_obj = Event.objects.filter(name__iexact=ev_name).order_by('-date').first()
        # If still not found, create a minimal Event so we can store the ticket
        if not event_obj and ev_name:
            try:
                when = timezone.now()
                loc = (ev.get('location') or '').strip() or 'TBD'
                price = Decimal('0')
                event_obj = Event.objects.create(
                    name=ev_name,
                    description=ev.get('description') or ev_name,
                    event_type='bush_party',
                    date=when,
                    location=loc,
                    max_capacity=1000,
                    price_per_ticket=price,
                    is_active=True,
                )
            except Exception:
                event_obj = None

        # Debug logging to identify missing fields
        print(f"Debug - event_obj: {event_obj}, code: '{code}', name: '{name}', amount: {amount}")
        
        # Initialize variables
        ticket = None
        payment = None
        
        if event_obj and code and name and amount:
            # Use provided quantity if available; otherwise fall back to 1
            ticket_quantity = max(1, int(payload_quantity or 1))
            # Sanity checks
            if ticket_quantity < 1:
                return JsonResponse({ 'success': False, 'message': 'Quantity must be at least 1' }, status=400)
            # If we have a valid price on the event, validate amount >= price * quantity with tolerance
            try:
                price_val = float(event_obj.price_per_ticket or 0)
            except Exception:
                price_val = 0.0
            if price_val > 0:
                expected = price_val * ticket_quantity
                tolerance_ratio = 0.98  # allow up to 2% lower (fees/rounding)
                tolerance_abs = 1.0     # or ₦1 absolute tolerance
                amount_val = float(amount)
                if amount_val + tolerance_abs < expected * tolerance_ratio:
                    return JsonResponse({
                        'success': False,
                        'message': 'Amount paid is less than expected for the selected quantity',
                        'details': {
                            'expected_min': expected,
                            'amount_paid': amount_val,
                            'quantity': ticket_quantity,
                            'price_per_ticket': price_val
                        }
                    }, status=400)
            
            # Create or update Ticket
            ticket, created = Ticket.objects.get_or_create(ticket_id=code, defaults={
                'event': event_obj,
                'customer_name': name,
                'customer_email': email,
                'phone': phone,
                'quantity': ticket_quantity,
                'amount_paid': amount,
                'order_reference': ref,
            })
            if not created:
                # Update fields if ticket already exists (idempotent writes)
                ticket.event = ticket.event or event_obj
                ticket.customer_name = ticket.customer_name or name
                ticket.customer_email = ticket.customer_email or email
                ticket.phone = ticket.phone or phone
                ticket.quantity = ticket_quantity
                ticket.amount_paid = amount
                ticket.order_reference = ticket.order_reference or ref
                ticket.save()
            # Optionally attach a Payment record (avoid duplicates by reference)
            try:
                if ref:
                    payment, _ = Payment.objects.get_or_create(
                        transaction_reference=ref,
                        defaults={
                            'ticket': ticket,
                            'payer_name': name,
                            'phone': phone,
                            'email': email,
                            'amount': amount,
                            'payment_method': 'paystack',
                            'payment_date': timezone.now(),
                            'status': 'completed',
                            'notes': 'Stored via API /api/store-ticket/'
                        }
                    )
                    # Ensure linkage to ticket if created without it
                    if payment.ticket_id != ticket.id:
                        payment.ticket = ticket
                        payment.save()
                else:
                    payment = Payment.objects.create(
                        ticket=ticket,
                        payer_name=name,
                        phone=phone,
                        email=email,
                        amount=amount,
                        payment_method='paystack',
                        transaction_reference=ref,
                        payment_date=timezone.now(),
                        status='completed',
                        notes='Stored via API /api/store-ticket/'
                    )
            except Exception as pe:
                print(f"Payment creation error: {pe}")
                payment = None
            stored = True
        else:
            print(f"Storage conditions not met - Missing: event_obj={not event_obj}, code={not code}, name={not name}, amount={not amount}")

        return JsonResponse({
            'success': True,
            'stored': stored,
            'ticket': {
                'id': str(ticket.id) if ticket else None,
                'ticket_id': ticket.ticket_id if ticket else None,
                'event': {'id': str(event_obj.id), 'name': event_obj.name} if event_obj else None,
                'customer_name': name,
                'customer_email': email,
                'amount_paid': float(amount),
                'order_reference': ref,
            } if stored else None,
            'payment': {
                'id': str(payment.id),
                'amount': float(payment.amount),
                'reference': payment.transaction_reference,
                'status': payment.status,
            } if payment else None
        })
    except Exception as e:
        # Surface the error to help debug why the request failed
        return JsonResponse({ 'success': False, 'message': 'Store failed', 'error': str(e) }, status=400)


