"""
URL configuration for pw_merchants project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.views.generic.base import RedirectView

urlpatterns = [
    path('admin/', admin.site.urls),
    # Legacy .html redirects (for old links or bookmarks)
    path('index.html', RedirectView.as_view(url='/', permanent=True)),
    path('about.html', RedirectView.as_view(url='/about/', permanent=True)),
    path('events.html', RedirectView.as_view(url='/events/', permanent=True)),
    path('menu.html', RedirectView.as_view(url='/menu/', permanent=True)),
    path('booking.html', RedirectView.as_view(url='/booking/', permanent=True)),
    path('contact.html', RedirectView.as_view(url='/contact/', permanent=True)),
    path('verify.html', RedirectView.as_view(url='/verify/', permanent=True)),
    path('', include('pw_website.urls')),
]

# Serve media files during development
if settings.DEBUG:
    # Serve app and project-level static files discovered by staticfiles finders
    urlpatterns += staticfiles_urlpatterns()
    # Serve media uploads in development
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
