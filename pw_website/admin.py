from django.contrib import admin
from .models import Event, Booking, Ticket, Payment, Inquiry


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['name', 'event_type', 'date', 'location', 'tickets_sold', 'tickets_available', 'is_active']
    list_filter = ['event_type', 'is_active', 'date']
    search_fields = ['name', 'location', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at', 'tickets_sold', 'tickets_available']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'event_type', 'featured_image')
        }),
        ('Event Details', {
            'fields': ('date', 'location', 'max_capacity', 'price_per_ticket', 'is_active')
        }),
        ('Statistics', {
            'fields': ('tickets_sold', 'tickets_available'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['quote_id', 'client_name', 'event_type', 'event_date', 'guests', 'total', 'status']
    list_filter = ['status', 'package_type', 'event_date']
    search_fields = ['quote_id', 'client_name', 'phone', 'email']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Client Information', {
            'fields': ('quote_id', 'client_name', 'phone', 'email')
        }),
        ('Event Details', {
            'fields': ('event_type', 'event_date', 'venue', 'guests', 'package_type', 'distance_km')
        }),
        ('Pricing', {
            'fields': ('subtotal', 'delivery_cost', 'tax', 'total', 'deposit_required')
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ['ticket_id', 'event', 'customer_name', 'quantity', 'amount_paid', 'verified', 'purchase_date']
    list_filter = ['verified', 'event', 'purchase_date', 'quantity']
    search_fields = ['ticket_id', 'customer_name', 'customer_email', 'order_reference']
    readonly_fields = ['id', 'purchase_date', 'verified_at']
    actions = ['mark_as_verified']
    
    def mark_as_verified(self, request, queryset):
        for ticket in queryset:
            ticket.verify_ticket(verified_by=request.user.username)
        self.message_user(request, f"{queryset.count()} tickets marked as verified.")
    mark_as_verified.short_description = "Mark selected tickets as verified"


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['payer_name', 'amount', 'payment_method', 'status', 'payment_date']
    list_filter = ['payment_method', 'status', 'payment_date']
    search_fields = ['payer_name', 'transaction_reference', 'phone', 'email']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(Inquiry)
class InquiryAdmin(admin.ModelAdmin):
    list_display = ['name', 'inquiry_type', 'status', 'created_at']
    list_filter = ['inquiry_type', 'status', 'newsletter_signup', 'whatsapp_updates']
    search_fields = ['name', 'contact', 'message']
    readonly_fields = ['id', 'created_at', 'updated_at']
    actions = ['mark_as_resolved']
    
    def mark_as_resolved(self, request, queryset):
        queryset.update(status='resolved')
        self.message_user(request, f"{queryset.count()} inquiries marked as resolved.")
    mark_as_resolved.short_description = "Mark selected inquiries as resolved"
