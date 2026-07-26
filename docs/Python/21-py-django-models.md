---
title: "Django Models and ORM"
sidebar_label: "Models & ORM"
sidebar_position: 21
---

# Django Models and ORM

Defining models, field types, relationships, migrations, and querying with the Django ORM.

---

## Model Definition

```python
# blog/models.py
from django.db import models
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from django.utils.text import slugify

class Category(models.Model):
    name        = models.CharField(max_length=100, unique=True)
    slug        = models.SlugField(unique=True, blank=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Post(models.Model):
    STATUS_DRAFT     = "draft"
    STATUS_PUBLISHED = "published"
    STATUS_CHOICES   = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_PUBLISHED, "Published"),
    ]

    title        = models.CharField(max_length=200)
    slug         = models.SlugField(unique=True, max_length=200)
    author       = models.ForeignKey(User, on_delete=models.CASCADE,
                                     related_name="posts")
    categories   = models.ManyToManyField(Category, blank=True,
                                          related_name="posts")
    content      = models.TextField()
    excerpt      = models.TextField(blank=True, max_length=500)
    image        = models.ImageField(upload_to="posts/%Y/%m/",
                                     blank=True, null=True)
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES,
                                    default=STATUS_DRAFT)
    views        = models.PositiveIntegerField(default=0)
    created_at   = models.DateTimeField(auto_now_add=True)  # set once on create
    updated_at   = models.DateTimeField(auto_now=True)      # set on every save
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "published_at"]),
            models.Index(fields=["author", "status"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["author", "slug"],
                name="unique_author_slug"
            )
        ]

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return reverse("blog:detail", kwargs={"pk": self.pk})

    def publish(self):
        self.status = self.STATUS_PUBLISHED
        self.published_at = timezone.now()
        self.save()

    @property
    def is_published(self):
        return self.status == self.STATUS_PUBLISHED

class Comment(models.Model):
    post      = models.ForeignKey(Post, on_delete=models.CASCADE,
                                  related_name="comments")
    author    = models.ForeignKey(User, on_delete=models.CASCADE,
                                  null=True, blank=True)   # allow anonymous
    name      = models.CharField(max_length=80)
    email     = models.EmailField()
    content   = models.TextField()
    approved  = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment by {self.name} on {self.post}"
```

---

## Field Types Reference

```python
# Text
models.CharField(max_length=200)           # short text (required)
models.TextField()                          # long text (no max_length)
models.SlugField(max_length=50)            # URL-friendly text
models.EmailField(max_length=254)          # validated email
models.URLField(max_length=200)            # validated URL
models.UUIDField(default=uuid.uuid4)      # UUID
models.IPAddressField()                    # IPv4
models.GenericIPAddressField()             # IPv4 or IPv6

# Numbers
models.IntegerField()                      # -2^31 to 2^31-1
models.BigIntegerField()                   # -2^63 to 2^63-1
models.SmallIntegerField()                 # -32768 to 32767
models.PositiveIntegerField()              # 0 to 2^31-1
models.PositiveBigIntegerField()           # 0 to 2^63-1
models.FloatField()                        # Python float
models.DecimalField(max_digits=10, decimal_places=2)  # exact decimal

# Boolean
models.BooleanField(default=False)
models.NullBooleanField()                  # deprecated; use BooleanField(null=True)

# Date/time
models.DateField(auto_now_add=False)       # date only
models.TimeField()                          # time only
models.DateTimeField(auto_now_add=True)    # date + time; set on create
models.DateTimeField(auto_now=True)        # set on every save
models.DurationField()                     # timedelta

# File/binary
models.FileField(upload_to="files/")
models.ImageField(upload_to="images/%Y/%m/")   # requires Pillow
models.BinaryField()                            # raw bytes

# JSON (PostgreSQL, MySQL 5.7+, SQLite 3.38+)
models.JSONField(default=dict)
models.JSONField(default=list)

# Choice field pattern
class Status(models.TextChoices):
    DRAFT     = "draft",     "Draft"
    PUBLISHED = "published", "Published"
    ARCHIVED  = "archived",  "Archived"

status = models.CharField(max_length=20, choices=Status.choices,
                           default=Status.DRAFT)

# Common field options
models.CharField(
    max_length=200,
    blank=True,        # allow empty in forms (validation)
    null=True,         # allow NULL in database
    default="",        # default value
    unique=True,       # database UNIQUE constraint
    db_index=True,     # create DB index
    verbose_name="Post title",  # human-readable name
    help_text="Enter the title",
    editable=False,    # hide from forms and admin
    primary_key=True,  # this field is the PK (replaces auto id)
)
```

---

## Relationships

```python
# ForeignKey — many-to-one
author = models.ForeignKey(
    User,
    on_delete=models.CASCADE,      # delete post when user deleted
    # on_delete options:
    # CASCADE    — delete this when parent deleted
    # PROTECT    — prevent parent deletion if children exist (raises exception)
    # SET_NULL   — set to NULL (field must be nullable)
    # SET_DEFAULT — set to default value
    # DO_NOTHING — do nothing (may cause DB integrity errors)
    related_name="posts",          # User.posts.all() (reverse accessor)
    null=True, blank=True,
)

# ManyToManyField
categories = models.ManyToManyField(
    Category,
    related_name="posts",
    blank=True,
    through="PostCategory",   # custom through model (optional)
)

# Through model for extra data on M2M relationship
class PostCategory(models.Model):
    post     = models.ForeignKey(Post, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    order    = models.PositiveIntegerField(default=0)   # extra field

    class Meta:
        ordering = ["order"]

# OneToOneField
class Profile(models.Model):
    user   = models.OneToOneField(User, on_delete=models.CASCADE,
                                  related_name="profile")
    bio    = models.TextField(blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True)
    # Access: user.profile.bio; profile.user.username

# Self-referential (tree structure)
class Category(models.Model):
    parent = models.ForeignKey("self", on_delete=models.SET_NULL,
                                null=True, blank=True,
                                related_name="children")
```

---

## Migrations

```bash
# Workflow
python manage.py makemigrations              # detect model changes → create migration file
python manage.py makemigrations blog         # specific app only
python manage.py migrate                     # apply all pending migrations
python manage.py migrate blog 0002           # migrate to specific migration
python manage.py migrate blog zero           # unapply all blog migrations
python manage.py showmigrations              # list all migrations and status
python manage.py sqlmigrate blog 0001        # show SQL without applying
python manage.py squashmigrations blog 0001 0005  # squash 0001–0005 into one

# Data migration — modify data in a migration
from django.db import migrations

def forwards(apps, schema_editor):
    Post = apps.get_model("blog", "Post")
    for post in Post.objects.all():
        post.slug = post.title.lower().replace(" ", "-")
        post.save()

def backwards(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [("blog", "0002_add_slug")]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
```

---

## ORM Queries

```python
from blog.models import Post, Comment
from django.db.models import Q, F, Count, Sum, Avg, Max, Min, Prefetch
from django.utils import timezone

# ── Creating ──────────────────────────────────────────────────────────────────
post = Post(title="Hello", slug="hello", content="World")
post.save()

post = Post.objects.create(title="Hello", slug="hello", content="World")

Post.objects.bulk_create([
    Post(title="Post 1", slug="post-1", content="..."),
    Post(title="Post 2", slug="post-2", content="..."),
])

# ── Reading ───────────────────────────────────────────────────────────────────
all_posts = Post.objects.all()
post = Post.objects.get(pk=1)       # raises DoesNotExist if not found
post = Post.objects.get(slug="hello")  # raises MultipleObjectsReturned if multiple
post = Post.objects.filter(status="published").first()   # None if not found

# filter — returns QuerySet (lazy!)
published = Post.objects.filter(status="published")
recent    = Post.objects.filter(created_at__gte=timezone.now() - timedelta(days=7))
mine      = Post.objects.filter(author__username="alice")   # follow FK
with_tag  = Post.objects.filter(categories__name="Python")  # M2M

# Lookup types
Post.objects.filter(title__exact="Hello")        # = (default)
Post.objects.filter(title__iexact="hello")       # case-insensitive =
Post.objects.filter(title__contains="Hell")      # LIKE %Hell%
Post.objects.filter(title__icontains="hell")     # case-insensitive
Post.objects.filter(title__startswith="He")
Post.objects.filter(title__endswith="lo")
Post.objects.filter(views__gt=100)               # > greater than
Post.objects.filter(views__gte=100)              # >= greater than or equal
Post.objects.filter(views__lt=100)               # <
Post.objects.filter(views__lte=100)              # <=
Post.objects.filter(views__range=(50, 100))      # BETWEEN
Post.objects.filter(status__in=["draft", "published"])
Post.objects.filter(published_at__isnull=True)   # IS NULL
Post.objects.filter(published_at__year=2024)     # date parts
Post.objects.filter(published_at__month=1)
Post.objects.filter(published_at__date=date.today())

# Q objects — OR / NOT conditions
Post.objects.filter(Q(status="published") | Q(author=request.user))
Post.objects.filter(Q(status="published") & Q(views__gt=100))
Post.objects.filter(~Q(status="draft"))   # NOT

# exclude
Post.objects.exclude(status="draft")

# ── Ordering and Slicing ─────────────────────────────────────────────────────
Post.objects.order_by("created_at")         # ascending
Post.objects.order_by("-created_at")        # descending
Post.objects.order_by("author__username", "-created_at")

Post.objects.all()[:10]       # LIMIT 10
Post.objects.all()[10:20]     # LIMIT 10 OFFSET 10
Post.objects.all()[0]         # first item

# ── Aggregation ───────────────────────────────────────────────────────────────
from django.db.models import Count, Sum, Avg, Max, Min

Post.objects.count()
Post.objects.filter(status="published").count()

Post.objects.aggregate(
    total_views=Sum("views"),
    avg_views=Avg("views"),
    max_views=Max("views"),
)

# annotate — add computed field to each object
posts = Post.objects.annotate(
    comment_count=Count("comments"),
    has_image=models.ExpressionWrapper(
        ~Q(image=""), output_field=models.BooleanField()
    )
)
for post in posts:
    print(post.comment_count)   # available as attribute

# Group by — annotate on values
from django.db.models import Count
Post.objects.values("status").annotate(count=Count("id"))
# [{"status":"draft","count":3}, {"status":"published","count":10}]

# ── Updating ─────────────────────────────────────────────────────────────────
post.title = "New Title"
post.save()                          # UPDATE all fields
post.save(update_fields=["title"])   # UPDATE only specified fields (more efficient)

Post.objects.filter(status="draft").update(status="published")   # bulk update (no signals!)

# F expressions — reference field value (avoids race conditions)
Post.objects.filter(pk=1).update(views=F("views") + 1)

# ── Deleting ──────────────────────────────────────────────────────────────────
post.delete()
Post.objects.filter(status="draft", created_at__lt=timezone.now()-timedelta(days=90)).delete()

# ── Related object queries ────────────────────────────────────────────────────
# Forward FK
post.author           # User object
post.author.username

# Reverse FK (related_name)
user.posts.all()
user.posts.filter(status="published")
user.posts.count()

# M2M
post.categories.all()
post.categories.add(category)
post.categories.remove(category)
post.categories.set([cat1, cat2])
post.categories.clear()

# ── Performance — avoiding N+1 queries ────────────────────────────────────────
# select_related — JOIN for FK/OneToOne (one extra query becomes one query)
posts = Post.objects.select_related("author", "author__profile").all()
for post in posts:
    print(post.author.username)   # no extra query!

# prefetch_related — separate query for M2M / reverse FK
posts = Post.objects.prefetch_related("categories", "comments").all()
for post in posts:
    print(list(post.categories.all()))   # no extra query!
    print(list(post.comments.all()))

# Prefetch with filters
posts = Post.objects.prefetch_related(
    Prefetch("comments", queryset=Comment.objects.filter(approved=True),
             to_attr="approved_comments")
)
for post in posts:
    print(post.approved_comments)

# only / defer — limit fields fetched
Post.objects.only("title", "slug")    # fetch only these fields
Post.objects.defer("content")         # fetch all EXCEPT content

# values / values_list — return dicts or tuples (not model instances)
Post.objects.values("title", "status")           # list of dicts
Post.objects.values_list("title", flat=True)     # list of values
Post.objects.values_list("id", "title")          # list of tuples
```

---

## Custom Managers and QuerySets

```python
class PublishedManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(status="published")

    def recent(self, days=7):
        cutoff = timezone.now() - timedelta(days=days)
        return self.get_queryset().filter(published_at__gte=cutoff)

class Post(models.Model):
    objects   = models.Manager()          # default manager
    published = PublishedManager()        # custom manager

# Usage
Post.published.all()
Post.published.recent(days=30)
Post.published.filter(author=user)
```

---

## Tips

- Use `select_related()` for FK/OneToOne and `prefetch_related()` for M2M/reverse FK — the single biggest ORM performance improvement.
- `QuerySet`s are lazy — they hit the database only when iterated, sliced, or converted to a list. Chain filters freely.
- `bulk_create()` and `bulk_update()` are dramatically faster than looping `.save()` — use them for batch operations.
- `update()` doesn't trigger `save()` signals or call `save()` — use when performance matters and you don't need signals.
- Always add `db_index=True` (or `indexes` in `Meta`) to fields used in `filter()`, `order_by()`, and `join` conditions.

---

## Summary

- Models are Python classes inheriting from `models.Model` — each attribute is a database column.
- Field types: `CharField`, `TextField`, `IntegerField`, `DecimalField`, `DateTimeField`, `ForeignKey`, `ManyToManyField`, `JSONField`.
- Relationships: `ForeignKey` (M:1), `ManyToManyField` (M:M), `OneToOneField` (1:1) — always set `related_name`.
- ORM: `Model.objects.filter().exclude().order_by().select_related().prefetch_related()`.
- `Q()` for OR/NOT; `F()` for field references; `annotate()` for computed columns; `aggregate()` for totals.
- Migrations: `makemigrations` detects changes; `migrate` applies them; never edit migration files manually.
