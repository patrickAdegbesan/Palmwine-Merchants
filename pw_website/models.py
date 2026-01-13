from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class Event(models.Model):
    EVENT_TYPES = [
        ('bush_party', 'Bush Party'),
        ('corporate', 'Corporate Event'),
        ('private', 'Private Event'),
        ('wedding', 'Wedding'),
        ('festival', 'Festival'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField()
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES, default='bush_party')
    date = models.DateTimeField()
    location = models.CharField(max_length=300)
    max_capacity = models.PositiveIntegerField(default=100)
    is_active = models.BooleanField(default=True)
    featured_image = models.ImageField(upload_to='events/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.name} - {self.date.strftime('%Y-%m-%d')}"

    @property
    def tickets_sold(self):
        return self.tickets.filter(verified=True).count()

    @property
    def tickets_available(self):
        return self.max_capacity - self.tickets_sold
    
    @property
    def available_ticket_types(self):
        """Get available ticket types with their prices for this event"""
        from django.db import models
        ticket_types = self.tickets.values('ticket_type', 'price_per_ticket').annotate(
            available_count=models.Count('id')
        ).filter(customer_name='')
        
        # Group by ticket type and get the price
        types_dict = {}
        for ticket in ticket_types:
            ticket_type = ticket['ticket_type']
            if ticket_type not in types_dict:
                types_dict[ticket_type] = {
                    'type': ticket_type,
                    'price': float(ticket['price_per_ticket']),
                    'available': 0
                }
            types_dict[ticket_type]['available'] += ticket['available_count']
        
        return list(types_dict.values())
    
    @property
    def min_ticket_price(self):
        """Get the minimum ticket price for this event"""
        available_tickets = self.available_ticket_types
        if available_tickets:
            return min(ticket['price'] for ticket in available_tickets)
        return 0

    @property
    def available_ticket_types_json(self):
        """Get available ticket types as JSON string for template usage"""
        import json
        return json.dumps(self.available_ticket_types)


class Booking(models.Model):
    BOOKING_STATUS = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    ]
    
    PACKAGE_TYPES = [
        ('palmwine', 'Palmwine Service'),
        ('cocktails', 'Palmwine Cocktails'),
        ('flame', 'Open-Flame Cuisine'),
        ('full', 'Full Experience'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quote_id = models.CharField(max_length=50, unique=True)
    client_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    event_type = models.CharField(max_length=50)
    event_date = models.DateField()
    venue = models.TextField()
    guests = models.PositiveIntegerField(validators=[MinValueValidator(10)])
    package_type = models.CharField(max_length=20, choices=PACKAGE_TYPES)
    distance_km = models.PositiveIntegerField(default=0)
    
    # Pricing
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    delivery_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    deposit_required = models.DecimalField(max_digits=12, decimal_places=2)
    
    status = models.CharField(max_length=20, choices=BOOKING_STATUS, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.quote_id} - {self.client_name}"


class Ticket(models.Model):
    TICKET_TYPES = [
        ('normal', 'Normal'),
        ('regular', 'Regular'),
        ('premium', 'Premium'),
        ('vip', 'VIP'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket_id = models.CharField(max_length=50, unique=True)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='tickets')
    ticket_type = models.CharField(max_length=10, choices=TICKET_TYPES, default='normal')
    price_per_ticket = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    customer_name = models.CharField(max_length=200, blank=True)
    customer_email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    quantity = models.PositiveIntegerField(default=1, help_text="Number of tickets purchased")
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.CharField(max_length=100, blank=True)
    purchase_date = models.DateTimeField(auto_now_add=True)
    order_reference = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['-purchase_date']

    def __str__(self):
        return f"{self.ticket_id} - {self.customer_name}"

    def verify_ticket(self, verified_by=None):
        """Mark ticket as verified"""
        if not self.verified:
            self.verified = True
            self.verified_at = timezone.now()
            self.verified_by = verified_by or 'System'
            self.save()


class Payment(models.Model):
    PAYMENT_METHODS = [
        ('transfer', 'Bank Transfer'),
        ('paystack', 'Paystack'),
        ('pos', 'POS'),
        ('cash', 'Cash'),
        ('other', 'Other'),
    ]
    
    PAYMENT_STATUS = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='payments', null=True, blank=True)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='payments', null=True, blank=True)
    
    payer_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    transaction_reference = models.CharField(max_length=200, blank=True)
    payment_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-payment_date']

    def __str__(self):
        return f"Payment {self.amount} by {self.payer_name}"


class Inquiry(models.Model):
    INQUIRY_TYPES = [
        ('event-booking', 'Event Booking'),
        ('corporate', 'Corporate Event'),
        ('private-party', 'Private Party'),
        ('palmwine-supply', 'Palmwine Supply'),
        ('catering', 'Catering Services'),
        ('general', 'General Inquiry'),
    ]
    
    STATUS_CHOICES = [
        ('new', 'New'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    contact = models.CharField(max_length=200)  # Email or phone
    inquiry_type = models.CharField(max_length=20, choices=INQUIRY_TYPES)
    message = models.TextField()
    newsletter_signup = models.BooleanField(default=False)
    whatsapp_updates = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = "Inquiries"

    def __str__(self):
        return f"{self.name} - {self.inquiry_type}"
