---
title: "Django Authentication"
sidebar_label: "Auth"
sidebar_position: 24
---

# Django Authentication

Django's built-in auth system — users, login/logout, permissions, custom user models, and password management.


---

## Built-in Auth Setup

```python
# settings.py — already included by default
INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    ...
]

# urls.py — add built-in auth views
urlpatterns = [
    path("accounts/", include("django.contrib.auth.urls")),
    # Provides:
    # accounts/login/          → login
    # accounts/logout/         → logout
    # accounts/password_change/ → password change
    # accounts/password_reset/  → password reset email
]

# settings.py — redirect after login/logout
LOGIN_URL           = "/accounts/login/"
LOGIN_REDIRECT_URL  = "/"         # after successful login
LOGOUT_REDIRECT_URL = "/"         # after logout
```

---

## Custom User Model (do this from the start!)

```python
# accounts/models.py — extend AbstractUser or AbstractBaseUser
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """Custom user with extra fields."""
    email       = models.EmailField(unique=True)   # make email unique
    bio         = models.TextField(blank=True)
    avatar      = models.ImageField(upload_to="avatars/", blank=True, null=True)
    birth_date  = models.DateField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)

    # Use email as the login field instead of username
    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["username"]   # asked in createsuperuser

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self):
        return self.email

# settings.py — tell Django to use your custom model
AUTH_USER_MODEL = "accounts.User"

# admin.py
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display  = ["email", "username", "is_staff", "is_verified"]
    list_filter   = ["is_staff", "is_verified"]
    search_fields = ["email", "username"]

    fieldsets = UserAdmin.fieldsets + (
        ("Profile", {"fields": ["bio", "avatar", "birth_date", "is_verified"]}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("Profile", {"fields": ["bio"]}),
    )
```

---

## Login and Logout Views

```python
# accounts/views.py
from django.contrib.auth import login, logout, authenticate, update_session_auth_hash
from django.contrib.auth.forms import AuthenticationForm, PasswordChangeForm
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.contrib import messages
from .forms import SignupForm

def signup_view(request):
    if request.user.is_authenticated:
        return redirect("home")

    if request.method == "POST":
        form = SignupForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)   # log in immediately after signup
            messages.success(request, "Account created! Welcome!")
            return redirect("home")
    else:
        form = SignupForm()

    return render(request, "accounts/signup.html", {"form": form})

def login_view(request):
    if request.user.is_authenticated:
        return redirect("home")

    if request.method == "POST":
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            # Redirect to 'next' param or home
            next_url = request.GET.get("next", "home")
            return redirect(next_url)
        else:
            messages.error(request, "Invalid username or password.")
    else:
        form = AuthenticationForm()

    return render(request, "accounts/login.html", {"form": form})

def logout_view(request):
    logout(request)
    messages.info(request, "You have been logged out.")
    return redirect("home")

@login_required
def change_password_view(request):
    if request.method == "POST":
        form = PasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)  # keep user logged in
            messages.success(request, "Password changed successfully!")
            return redirect("accounts:profile")
    else:
        form = PasswordChangeForm(request.user)

    return render(request, "accounts/change_password.html", {"form": form})
```

---

## Signup Form

```python
# accounts/forms.py
from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import UserCreationForm

User = get_user_model()

class SignupForm(UserCreationForm):
    email      = forms.EmailField(required=True)
    first_name = forms.CharField(max_length=50)
    last_name  = forms.CharField(max_length=50)

    class Meta:
        model  = User
        fields = ["username", "email", "first_name", "last_name",
                  "password1", "password2"]

    def clean_email(self):
        email = self.cleaned_data["email"]
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError("Email address already in use.")
        return email.lower()

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email      = self.cleaned_data["email"]
        user.first_name = self.cleaned_data["first_name"]
        user.last_name  = self.cleaned_data["last_name"]
        if commit:
            user.save()
        return user
```

---

## Protecting Views

```python
from django.contrib.auth.decorators import (
    login_required, permission_required, user_passes_test
)
from django.contrib.auth.mixins import (
    LoginRequiredMixin, PermissionRequiredMixin, UserPassesTestMixin
)

# Decorator for FBVs
@login_required                              # redirect to LOGIN_URL if not logged in
def dashboard(request): ...

@login_required(login_url="/custom/login/") # custom login URL
def dashboard(request): ...

@permission_required("blog.add_post")        # must have permission
def create_post(request): ...

@permission_required("blog.add_post", raise_exception=True)  # 403 instead of redirect

@user_passes_test(lambda u: u.is_staff)     # custom test
def staff_only(request): ...

# Mixins for CBVs
class DashboardView(LoginRequiredMixin, TemplateView):
    template_name = "dashboard.html"
    login_url     = "/accounts/login/"      # override
    redirect_field_name = "next"

class PostCreateView(PermissionRequiredMixin, CreateView):
    permission_required = "blog.add_post"
    raise_exception     = True              # 403 instead of redirect

class PostEditView(UserPassesTestMixin, UpdateView):
    def test_func(self):
        post = self.get_object()
        return self.request.user == post.author or self.request.user.is_staff

    def handle_no_permission(self):
        messages.error(self.request, "You can only edit your own posts.")
        return redirect("blog:list")

# Manual check in view
def my_view(request):
    if not request.user.is_authenticated:
        return redirect("login")
    if not request.user.has_perm("blog.delete_post"):
        return HttpResponseForbidden("Access denied")
```

---

## Permissions

```python
# Django auto-creates 4 permissions per model:
# blog.add_post, blog.view_post, blog.change_post, blog.delete_post

# Checking permissions
request.user.has_perm("blog.add_post")           # single
request.user.has_perms(["blog.add_post", "blog.change_post"])  # multiple

# In templates
{% if perms.blog.add_post %}
    <a href="{% url 'blog:create' %}">New Post</a>
{% endif %}

{% if perms.blog %}   {# user has any blog permission #}
    ...
{% endif %}

# Custom permissions
class Post(models.Model):
    class Meta:
        permissions = [
            ("publish_post", "Can publish posts"),
            ("feature_post", "Can feature posts on homepage"),
        ]

# Assign permissions to a user
from django.contrib.auth.models import Permission
perm = Permission.objects.get(codename="publish_post")
user.user_permissions.add(perm)
user.user_permissions.remove(perm)
user.has_perm("blog.publish_post")

# Groups — assign permissions to a group; add users to the group
from django.contrib.auth.models import Group
editors = Group.objects.create(name="Editors")
editors.permissions.add(perm)
user.groups.add(editors)
user.has_perm("blog.publish_post")   # inherits via group
```

---

## Password Reset

```python
# urls.py — built-in password reset views
from django.contrib.auth import views as auth_views

urlpatterns = [
    path("password-reset/",
         auth_views.PasswordResetView.as_view(
             template_name="accounts/password_reset.html",
             email_template_name="accounts/password_reset_email.html",
             success_url="/password-reset/done/",
         ),
         name="password_reset"),

    path("password-reset/done/",
         auth_views.PasswordResetDoneView.as_view(
             template_name="accounts/password_reset_done.html"
         ),
         name="password_reset_done"),

    path("password-reset/<uidb64>/<token>/",
         auth_views.PasswordResetConfirmView.as_view(
             template_name="accounts/password_reset_confirm.html",
             success_url="/password-reset/complete/",
         ),
         name="password_reset_confirm"),

    path("password-reset/complete/",
         auth_views.PasswordResetCompleteView.as_view(
             template_name="accounts/password_reset_complete.html"
         ),
         name="password_reset_complete"),
]

# settings.py — configure email for password reset
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
DEFAULT_FROM_EMAIL = "noreply@mysite.com"
```

---

## Social Auth (django-allauth)

```python
# pip install django-allauth
# settings.py
INSTALLED_APPS += [
    "django.contrib.sites",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "allauth.socialaccount.providers.github",
]

SITE_ID = 1
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

# allauth settings
ACCOUNT_EMAIL_REQUIRED       = True
ACCOUNT_EMAIL_VERIFICATION   = "mandatory"   # "optional" or "none"
ACCOUNT_AUTHENTICATION_METHOD = "email"      # login with email
ACCOUNT_USERNAME_REQUIRED    = False
SOCIALACCOUNT_AUTO_SIGNUP    = True

# urls.py
urlpatterns += [path("accounts/", include("allauth.urls"))]

# Configure Google OAuth:
# Django admin → Sites → Social Applications → Add
# Provider: Google, Client ID + Secret from Google Cloud Console
```

---

## User Profile Pattern

```python
# One-to-one profile model (when you can't modify the User model)
class Profile(models.Model):
    user   = models.OneToOneField(User, on_delete=models.CASCADE,
                                  related_name="profile")
    bio    = models.TextField(blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True)

# Auto-create profile when user is created
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_profile(sender, instance, **kwargs):
    instance.profile.save()

# Access
user.profile.bio
user.profile.avatar
```

---

## Tips

- Define `AUTH_USER_MODEL` before your first migration — changing it later requires deleting and recreating the database.
- `update_session_auth_hash(request, user)` after password change keeps the user logged in — without it they're logged out.
- Use `get_user_model()` to reference the User model in code — never import `django.contrib.auth.models.User` directly.
- `@login_required` redirects to `LOGIN_URL` with a `?next=` param — use `request.GET.get("next", "/")` in your login view to honour it.
- Use `django-allauth` for social auth — it handles Google, GitHub, Facebook, etc. with minimal configuration.

---

## Summary

- Django provides a full auth system: users, passwords, sessions, permissions, groups.
- Always define a custom user model at project start (`AUTH_USER_MODEL = "accounts.User"`).
- `@login_required` / `LoginRequiredMixin` redirect unauthenticated users; `@permission_required` checks specific permissions.
- `login(request, user)` / `logout(request)` — the two core auth functions.
- Built-in password reset flow: 4 views, 4 templates, one email — all provided out of the box.
- For social auth (Google, GitHub), use `django-allauth`.
