from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

app_name = 'pw_website'

urlpatterns = [
    # API endpoints (put these first to avoid path conflicts)
    path('api/verify-ticket/', views.verify_ticket_api, name='verify_ticket_api'),
    path('api/inquiry/', views.submit_inquiry, name='submit_inquiry'),
    path('api/booking-quote/', views.create_booking_quote, name='create_booking_quote'),
    path('api/download-ticket/<str:code>/', views.download_ticket, name='download_ticket'),
    path('api/verify-payment/', views.verify_paystack_payment, name='verify_paystack_payment'),
    path('api/send-ticket-email/', views.send_ticket_email, name='send_ticket_email'),
    path('api/store-ticket/', views.store_ticket, name='store_ticket'),
    path('api/store-ticket', views.store_ticket, name='store_ticket_no_slash'),
    path('api/generate-ticket-pdf/', views.generate_ticket_pdf_api, name='generate_ticket_pdf'),
    path('api/event-stats/', views.event_stats_api, name='event_stats_api'),
    path('api/event-stats/<uuid:event_id>/', views.event_stats_api, name='event_specific_stats_api'),
    path('api/bookings/', views.bookings_api, name='bookings_api'),
    path('api/bookings/<uuid:booking_id>/', views.bookings_api, name='booking_detail_api'),
    path('api/bookings/<uuid:booking_id>/status/', views.update_booking_status, name='update_booking_status'),
    path('api/events/', views.events_api, name='events_api'),
    path('api/events/<uuid:event_id>/', views.events_api, name='event_detail_api'),
    path('api/tickets/', views.tickets_api, name='tickets_api'),
    path('api/tickets/<uuid:ticket_id>/', views.tickets_api, name='ticket_detail_api'),

    # Authentication URLs
    path('login/', auth_views.LoginView.as_view(template_name='login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='/'), name='logout'),
    
    # Main pages
    path('', views.home, name='home'),
    path('about/', views.about, name='about'),
    path('events/', views.events, name='events'),
    path('menu/', views.menu, name='menu'),
    path('booking/', views.booking, name='booking'),
    path('contact/', views.contact, name='contact'),
    path('verify/', views.verify_tickets, name='verify_tickets'),
    path('verify/<str:code>/', views.verify_ticket_page, name='verify_ticket_page'),
    path('ticket-management/', views.ticket_management, name='ticket_management'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('management/', views.management, name='management'),  # Redirect old URL
]
