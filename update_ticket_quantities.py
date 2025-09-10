#!/usr/bin/env python
import os
import sys
import django

# Setup Django environment
sys.path.append('c:\\Users\\seuna\\OneDrive - CUL Host\\Desktop\\pat-proj\\pw_merchants')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pw_merchants.settings')
django.setup()

from pw_website.models import Ticket

def update_ticket_quantities():
    """Update existing tickets with correct quantity values"""
    tickets = Ticket.objects.all()
    updated_count = 0
    
    print(f"Found {tickets.count()} tickets to update...")
    
    for ticket in tickets:
        # Calculate correct quantity
        quantity = 1  # default
        if ticket.event and ticket.event.price_per_ticket and ticket.amount_paid:
            ticket_price = float(ticket.event.price_per_ticket)
            amount_paid = float(ticket.amount_paid)
            if ticket_price > 0:
                quantity = max(1, int(amount_paid / ticket_price))
        
        # Update if different from current value
        if ticket.quantity != quantity:
            old_quantity = ticket.quantity
            ticket.quantity = quantity
            ticket.save()
            updated_count += 1
            print(f"Updated ticket {ticket.ticket_id}: {old_quantity} → {quantity} tickets (₦{ticket.amount_paid})")
    
    print(f"\nUpdated {updated_count} tickets with correct quantities.")

if __name__ == '__main__':
    update_ticket_quantities()
