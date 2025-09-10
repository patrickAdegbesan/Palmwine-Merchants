# Palmwine Merchants & Flames

A professional Django-based website for Lagos' premier Afrocentric lifestyle brand celebrating palmwine, open-flame cuisine, and cultural experiences.

## Features

- **Event Management**
  - Bush Party event organization with dynamic ticket sales
  - Event statistics and attendance tracking
  - Interactive event gallery with lightbox
  - Next event on October 19th, 2025
  - Automatic ticket generation and verification

- **Service Packages**
  - Classic Palmwine Service (₦2,500/guest)
  - Premium Cocktail Service (₦4,000/guest)
  - Signature cocktails including:
    - Elémí Botanika (Herbalist's Choice)
    - Zestina (Tropical Blend)
    - PALMPOP (Most Popular)
    - Pępęsweet (Spicy Fusion)
    - Shapa (Party Starter)
    - Salewa (Fresh & Cool)

- **Booking System**
  - Real-time quote calculator
  - Distance-based pricing
  - Group discounts (15% off for groups of 5)
  - Automated email confirmations
  - WhatsApp integration for inquiries

- **Payment Integration**
  - Secure Paystack payment gateway
  - Multiple payment methods
  - Real-time transaction verification
  - Automated receipt generation

- **Admin Features**
  - Comprehensive dashboard
  - Ticket management system
  - Booking oversight
  - Event statistics
  - Customer inquiry handling

## Tech Stack

### Backend
- **Framework**: Django 4.2.16
  - Custom model architecture
  - Class-based views
  - Django Admin customization
  - REST-like API endpoints
  - Template inheritance system

### Frontend
- **Core Technologies**
  - HTML5 with semantic markup
  - CSS3 with modern features:
    - CSS Grid and Flexbox
    - Custom properties (variables)
    - Animations and transitions
  - JavaScript (ES6+)
    - Async/Await patterns
    - Module system
    - DOM manipulation
    - Event handling

- **UI Components**
  - Interactive forms with real-time validation
  - Dynamic pricing calculator
  - Modal dialogs
  - Image lightbox gallery
  - Responsive navigation
  - Toast notifications

### Database
- **Development**: SQLite3
- **Production**: PostgreSQL
- **Features**:
  - UUID primary keys
  - Foreign key relationships
  - Custom model managers
  - Database constraints
  - Indexes for optimization

### Integration & Services
- **Payment Processing**
  - Paystack payment gateway
  - Real-time transaction verification
  - Multiple payment methods support
  - Secure payment handling

- **Email Service**
  - SMTP integration
  - HTML email templates
  - Automated notifications
  - Transaction receipts

### DevOps & Deployment
- **Version Control**: Git
- **Platform**: Heroku
- **Static Files**: WhiteNoise
- **Environment**: python-decouple

### Design & Assets
- **Icons**: Font Awesome 6
- **Typography**: Custom web fonts
- **Images**: Optimized media handling
- **Design System**: Custom CSS architecture with:
  - BEM methodology
  - Responsive design patterns
  - Dark/Light mode support

## Installation & Setup Guide

### Prerequisites
- Python 3.11 or higher
- pip (Python package installer)
- Git
- Node.js (for frontend asset compilation)
- PostgreSQL (for production)

### Development Setup

1. **Clone & Navigate**
   ```bash
   git clone <repository-url>
   cd pw_merchants
   ```

2. **Virtual Environment**
   ```bash
   # Create virtual environment
   python -m venv venv

   # Activate virtual environment
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Dependencies**
   ```bash
   # Core dependencies
   pip install -r requirements.txt

   # Development dependencies (optional)
   pip install -r requirements-dev.txt
   ```

4. **Environment Configuration**
   ```bash
   # Copy environment template
   cp .env.example .env

   # Edit .env with your settings:
   # - Generate a new secret key
   # - Configure database settings
   # - Set up email credentials
   # - Add Paystack API keys
   ```

5. **Database Initialization**
   ```bash
   # Apply migrations
   python manage.py migrate

   # Create admin user
   python manage.py createsuperuser

   # Load initial data (optional)
   python manage.py loaddata initial_data.json
   ```

6. **Static Files & Media**
   ```bash
   # Collect static files
   python manage.py collectstatic --no-input

   # Create media directory
   mkdir -p media/events media/uploads
   ```

7. **Development Server**
   ```bash
   # Start Django development server
   python manage.py runserver

   # Access the site at http://127.0.0.1:8000/
   # Admin interface at http://127.0.0.1:8000/admin/
   ```

### Additional Setup

- **Email Testing**
  ```bash
  # Start development email server
  python -m smtpd -n -c DebuggingServer localhost:1025
  ```

- **Frontend Development**
  ```bash
  # Install frontend dependencies
  npm install

  # Start asset compilation in watch mode
  npm run watch
  ```

## Configuration Guide

### Environment Variables

Create a `.env` file based on `.env.example`. Below are the key configurations:

#### Core Settings
```ini
# Django Configuration
DJANGO_SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Static Files
STATIC_URL=/static/
MEDIA_URL=/media/
```

#### Email Configuration
```ini
# Email Settings
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=Palmwine Merchants <noreply@palmwinemerchants.com>
```

#### Payment Integration
```ini
# Paystack Configuration
PAYSTACK_PUBLIC_KEY=pk_test_xxx
PAYSTACK_SECRET_KEY=sk_test_xxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxx
```

#### Security Settings
```ini
# Security Configuration
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
```

#### Optional Features
```ini
# Feature Flags
ENABLE_ANALYTICS=True
EMAIL_LOGGING=True
MAINTENANCE_MODE=False

# Cache Configuration
REDIS_URL=redis://localhost:6379/1
```

## Project Structure

```
pw_merchants/
├── pw_merchants/          # Django project settings
├── pw_website/           # Main Django app
├── templates/            # HTML templates
├── static/              # Static files (CSS, JS, images)
├── media/               # User uploaded files
├── requirements.txt     # Python dependencies
├── .env.example        # Environment variables template
├── .gitignore          # Git ignore rules
└── manage.py           # Django management script
```

## Data Models

- **Event**
  - Event management with customizable types (Bush Party, Corporate, Private, Wedding, Festival)
  - Capacity tracking
  - Featured image support
  - Active status management

- **Booking**
  - Package types (Palmwine Service, Cocktails, Flame Cuisine, Full Experience)
  - Quote generation with pricing components
  - Distance-based delivery calculations
  - Status tracking (Pending, Confirmed, Cancelled, Completed)

- **Ticket**
  - Unique ticket identification
  - QR code generation
  - Verification status tracking
  - Customer information storage
  - Event association

- **Payment**
  - Multiple payment methods support
  - Transaction reference tracking
  - Status monitoring
  - Booking/Ticket association

- **Inquiry**
  - Multiple inquiry types (Event Booking, Corporate, Private Party, etc.)
  - Newsletter signup tracking
  - WhatsApp updates opt-in
  - Status progression (New, In Progress, Resolved, Closed)

## Security Features

- Environment-based configuration
- CSRF protection
- XSS protection
- HTTPS enforcement (production)
- Secure cookies
- Content type nosniff
- HSTS headers

## Deployment

### Production Checklist

1. Set `DEBUG=False` in environment
2. Configure `ALLOWED_HOSTS`
3. Set up proper database (PostgreSQL recommended)
4. Configure static file serving (WhiteNoise included)
5. Set up SSL/TLS certificates
6. Configure email backend
7. Set up monitoring and logging

### Heroku Deployment

1. Install Heroku CLI
2. Create Heroku app: `heroku create your-app-name`
3. Set environment variables: `heroku config:set DJANGO_SECRET_KEY=your-key`
4. Deploy: `git push heroku main`
5. Run migrations: `heroku run python manage.py migrate`

## API Documentation

### Event Management
```http
GET    /api/events/                # List all events
POST   /api/events/                # Create new event
GET    /api/events/<uuid:id>/      # Get event details
PUT    /api/events/<uuid:id>/      # Update event
DELETE /api/events/<uuid:id>/      # Delete event
GET    /api/event-stats/           # Get event statistics
```

### Ticket System
```http
GET    /api/tickets/               # List all tickets
POST   /api/tickets/               # Create new ticket
GET    /api/tickets/<uuid:id>/     # Get ticket details
PUT    /api/tickets/<uuid:id>/     # Update ticket
POST   /api/verify-ticket/         # Verify ticket
GET    /api/download-ticket/<str>/ # Download ticket PDF
```

### Booking Management
```http
GET    /api/bookings/              # List all bookings
POST   /api/booking-quote/         # Generate booking quote
PUT    /api/bookings/<uuid:id>/    # Update booking
POST   /api/bookings/<id>/status/  # Update booking status
```

### Payment Processing
```http
POST   /api/verify-payment/        # Verify Paystack payment
POST   /api/store-ticket/          # Store ticket after payment
POST   /api/send-ticket-email/     # Send ticket via email
```

### Customer Support
```http
POST   /api/inquiry/               # Submit customer inquiry
GET    /api/generate-ticket-pdf/   # Generate ticket PDF
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

© 2024 Palmwine Merchants & Flames. All rights reserved.

## Contact

- **Website**: [palmwinemerchants.com](https://palmwinemerchants.com)
- **Email**: Palmwinemerchants@gmail.com
- **Phone**: +234 803 949 0349
- **WhatsApp**: [Chat with us](https://wa.me/2348039490349)
- **Instagram**: [@palmwinemerchants](https://instagram.com/palmwinemerchants)

## Support

For technical support or questions about the codebase, please create an issue in the repository or contact the development team.
