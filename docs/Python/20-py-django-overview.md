---
title: "Django — Overview and Setup"
sidebar_label: "Django Overview"
sidebar_position: 20
---

# Django — Overview and Setup

Django is a "batteries-included" web framework — it ships with ORM, admin panel, auth, forms, templating, and more out of the box.

---

## What Django Is

```
Django follows the MTV pattern:
  Model      — data layer (database tables as Python classes)
  Template   — presentation layer (HTML with template tags)
  View       — logic layer (handles requests, returns responses)

Request lifecycle:
  Browser → URL dispatcher → View → Model (DB) → Template → Response

"Batteries included" features:
  ORM (database abstraction)      Admin interface (auto-generated)
  Authentication system           Form handling and validation
  Template engine                 Security middleware (CSRF, XSS)
  Static files handling           Internationalisation (i18n)
  Email sending                   Caching framework
  Testing utilities               Management commands
```

---

## Installation and Project Setup

```bash
pip install django
pip install django psycopg2-binary   # with PostgreSQL
pip install django mysqlclient       # with MySQL

django-admin startproject myproject .    # . = current directory
# OR
django-admin startproject myproject      # creates myproject/ subdirectory

cd myproject
python manage.py startapp blog           # create an app
python manage.py startapp accounts

python manage.py runserver               # dev server at http://127.0.0.1:8000
python manage.py runserver 0.0.0.0:8000  # accessible on network

# Database
python manage.py makemigrations          # create migration files
python manage.py migrate                 # apply migrations
python manage.py createsuperuser         # create admin user
python manage.py shell                   # Django shell (with ORM available)
python manage.py dbshell                 # raw DB shell

# Static files (production)
python manage.py collectstatic

# Management commands
python manage.py check                   # check for errors
python manage.py showmigrations          # list migrations
python manage.py sqlmigrate blog 0001    # show SQL for migration
```

---

## Project Structure

```
myproject/                    ← project root
├── manage.py                 ← CLI entry point
├── requirements.txt
├── myproject/                ← project package
│   ├── __init__.py
│   ├── settings.py           ← ALL configuration
│   ├── urls.py               ← root URL routing
│   ├── wsgi.py               ← WSGI server entry point
│   └── asgi.py               ← ASGI server entry point
├── blog/                     ← an app
│   ├── __init__.py
│   ├── admin.py              ← admin site registration
│   ├── apps.py               ← app config
│   ├── models.py             ← database models
│   ├── views.py              ← request handlers
│   ├── urls.py               ← app URL routing
│   ├── forms.py              ← forms
│   ├── serializers.py        ← DRF serializers (if using API)
│   ├── tests.py              ← tests
│   ├── migrations/           ← database migrations
│   │   └── 0001_initial.py
│   └── templates/
│       └── blog/             ← app templates
│           ├── list.html
│           └── detail.html
└── templates/                ← project-wide templates
└── static/                   ← static files (CSS, JS, images)
```

---

## Settings

```python
# myproject/settings.py
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key")
DEBUG = os.environ.get("DEBUG", "True") == "True"
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "localhost").split(",")

# Installed apps — always add yours here
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Your apps:
    "blog",
    "accounts",
    # Third-party:
    "rest_framework",
    "corsheaders",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",   # must be before CommonMiddleware
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "myproject.urls"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [BASE_DIR / "templates"],   # project-wide templates
    "APP_DIRS": True,                    # look in app/templates/
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.debug",
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

# Database
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# PostgreSQL:
# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.postgresql",
#         "NAME": os.environ.get("DB_NAME", "mydb"),
#         "USER": os.environ.get("DB_USER", "postgres"),
#         "PASSWORD": os.environ.get("DB_PASSWORD", ""),
#         "HOST": os.environ.get("DB_HOST", "localhost"),
#         "PORT": os.environ.get("DB_PORT", "5432"),
#     }
# }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True   # always True — store dates in UTC

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"  # for collectstatic
STATICFILES_DIRS = [BASE_DIR / "static"]

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"   # user-uploaded files

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Email (dev)
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
# Email (production)
# EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
# EMAIL_HOST = "smtp.gmail.com"
# EMAIL_PORT = 587
# EMAIL_USE_TLS = True
# EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER")
# EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD")

# Cache (Redis)
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",
    }
}

# Session
SESSION_ENGINE = "django.contrib.sessions.backends.cache"  # cache-backed sessions

# Logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
        "file": {
            "class": "logging.FileHandler",
            "filename": BASE_DIR / "django.log",
        },
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django.db.backends": {
            "handlers": ["console"],
            "level": "DEBUG",   # log all SQL queries
            "propagate": False,
        },
    },
}
```

---

## URLs

```python
# myproject/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("blog/", include("blog.urls")),
    path("api/", include("blog.api_urls")),
    path("accounts/", include("django.contrib.auth.urls")),
    path("", include("blog.urls")),   # home
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# blog/urls.py
from django.urls import path
from . import views

app_name = "blog"   # namespace — use as blog:list, blog:detail

urlpatterns = [
    path("", views.PostListView.as_view(), name="list"),
    path("<int:pk>/", views.PostDetailView.as_view(), name="detail"),
    path("<int:pk>/edit/", views.PostUpdateView.as_view(), name="edit"),
    path("create/", views.PostCreateView.as_view(), name="create"),
    path("<int:pk>/delete/", views.PostDeleteView.as_view(), name="delete"),
    path("<slug:slug>/", views.post_by_slug, name="post-by-slug"),
]

# URL patterns
path("articles/<int:year>/<int:month>/", views.archive)   # int
path("users/<str:username>/", views.profile)              # str
path("files/<path:file_path>/", views.serve_file)         # path (includes /)
path("items/<uuid:item_id>/", views.item_detail)          # uuid
path("posts/<slug:slug>/", views.post_detail)             # slug

# Reverse URL — generate URL from name
from django.urls import reverse
url = reverse("blog:detail", kwargs={"pk": 42})   # "/blog/42/"

# In templates:
# {% url "blog:detail" pk=post.pk %}
```

---

## Admin Site

```python
# blog/admin.py
from django.contrib import admin
from .models import Post, Comment, Category

# Simple registration
admin.site.register(Post)

# Customised admin
@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "status", "created_at"]
    list_filter  = ["status", "created_at", "author"]
    search_fields = ["title", "content"]
    prepopulated_fields = {"slug": ("title",)}
    raw_id_fields = ["author"]         # replaces dropdown with search
    date_hierarchy = "created_at"
    ordering = ["-created_at"]
    list_editable = ["status"]         # edit directly in list view
    list_per_page = 25

    fieldsets = [
        (None, {"fields": ["title", "slug", "author"]}),
        ("Content", {"fields": ["content", "image"]}),
        ("Publishing", {
            "fields": ["status", "published_at"],
            "classes": ["collapse"],   # collapsible section
        }),
    ]

    # Custom action
    @admin.action(description="Mark as published")
    def make_published(self, request, queryset):
        queryset.update(status="published")
    actions = ["make_published"]

    # Custom columns
    def short_content(self, obj):
        return obj.content[:50] + "..."
    short_content.short_description = "Preview"

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["author", "post", "created_at", "approved"]
    list_filter = ["approved"]
    actions = ["approve_comments"]

    @admin.action(description="Approve selected comments")
    def approve_comments(self, request, queryset):
        queryset.update(approved=True)

# Inline admin — edit related objects on parent's page
class CommentInline(admin.TabularInline):   # or admin.StackedInline
    model = Comment
    extra = 1   # number of empty forms shown

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    inlines = [CommentInline]

admin.site.site_header = "My Blog Admin"
admin.site.site_title = "Blog Admin"
admin.site.index_title = "Welcome to Blog Admin"
```

---

## Tips

- Split settings into `settings/base.py`, `settings/dev.py`, `settings/prod.py` — use `DJANGO_SETTINGS_MODULE` env var to select.
- Always use `os.environ.get()` for secrets — never hardcode `SECRET_KEY` or database passwords.
- `USE_TZ = True` is the correct default — all datetimes stored in UTC, converted to local time in templates.
- The `app_name` namespace in `urls.py` prevents URL name collisions between apps — always set it.
- `python manage.py check --deploy` shows security warnings before going to production.

---

## Summary

- Django is MTV: Model (ORM) + Template (HTML) + View (logic).
- `django-admin startproject` + `python manage.py startapp` create the initial structure.
- `settings.py`: `INSTALLED_APPS`, `DATABASES`, `TEMPLATES`, `MIDDLEWARE` are the core settings.
- `urls.py`: `path()` maps URL patterns to views; `include()` delegates to app URL files; `reverse()` generates URLs by name.
- Admin site: `@admin.register(Model)` with `ModelAdmin` customisation — one of Django's killer features.
