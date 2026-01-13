from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

class EmailOrUsernameBackend(ModelBackend):
    """
    Custom authentication backend.

    Allows users to log in using their email address or username.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        try:
            # Try to fetch the user by searching the username field
            user = UserModel.objects.get(username=username)
        except UserModel.DoesNotExist:
            try:
                # If the user was not found, try searching the email field
                user = UserModel.objects.get(email=username)
            except UserModel.DoesNotExist:
                # If a user cannot be found, return None
                return None
        
        if user.check_password(password):
            return user
        return None

