# Palmwine Merchants & Flames

A professional Django-based website for Lagos' premier Afrocentric lifestyle brand celebrating palmwine, open-flame cuisine, and cultural experiences.

## Features

- **Responsive Design**: Modern, mobile-first design with smooth animations
- **Event Management**: Showcase upcoming events and Bush Parties
- **Booking System**: Interactive quote calculator with payment integration
- **Menu Display**: Elegant presentation of palmwine cocktails and cuisine
- **Contact Forms**: Professional inquiry handling with WhatsApp integration
- **Ticket Verification**: QR code scanning and bulk verification system
- **Security**: Production-ready security configurations

## Tech Stack

- **Backend**: Django 4.2.16
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Database**: SQLite (development) / PostgreSQL (production)
- **Payment**: Paystack integration
- **Styling**: Custom CSS with CSS Grid and Flexbox
- **Icons**: Font Awesome 6

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pw_merchants
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Database setup**
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

6. **Collect static files**
   ```bash
   python manage.py collectstatic
   ```

7. **Run development server**
   ```bash
   python manage.py runserver
   ```

## Environment Variables

Create a `.env` file based on `.env.example`:

- `DJANGO_SECRET_KEY`: Django secret key for production
- `DEBUG`: Set to `False` for production
- `ALLOWED_HOSTS`: Comma-separated list of allowed hosts
- `DATABASE_URL`: Database connection string
- `PAYSTACK_PUBLIC_KEY`: Paystack public key
- `PAYSTACK_SECRET_KEY`: Paystack secret key

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

## API Endpoints

- `/api/events/` - Event listings
- `/api/tickets/` - Ticket management
- `/api/verify-ticket/` - Ticket verification
- `/api/event-stats/` - Event statistics

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
