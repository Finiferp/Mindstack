---
title: "Django Forms"
sidebar_label: "Forms"
sidebar_position: 23
---

# Django Forms

Forms, ModelForms, validation, widgets, and file uploads.

---

## Basic Forms

```python
# blog/forms.py
from django import forms
from django.core.exceptions import ValidationError
from django.utils.text import slugify
from .models import Post, Comment, Category

# Form class — not tied to a model
class ContactForm(forms.Form):
    name    = forms.CharField(max_length=100, label="Your Name")
    email   = forms.EmailField(label="Your Email")
    subject = forms.CharField(max_length=200)
    message = forms.CharField(widget=forms.Textarea(attrs={"rows": 5}))
    rating  = forms.ChoiceField(choices=[(i, i) for i in range(1, 6)])
    send_copy = forms.BooleanField(required=False, label="Send me a copy")

    # Field-level validation
    def clean_email(self):
        email = self.cleaned_data["email"]
        if "spam" in email:
            raise ValidationError("Invalid email address.")
        return email.lower()

    # Cross-field validation
    def clean(self):
        cleaned_data = super().clean()
        name    = cleaned_data.get("name")
        message = cleaned_data.get("message")
        if name and message and name in message:
            raise ValidationError("Message cannot contain your name.")
        return cleaned_data

# Using the form in a view
def contact_view(request):
    if request.method == "POST":
        form = ContactForm(request.POST)
        if form.is_valid():
            # form.cleaned_data is a dict of validated values
            name    = form.cleaned_data["name"]
            email   = form.cleaned_data["email"]
            message = form.cleaned_data["message"]
            send_email(name, email, message)
            return redirect("contact-success")
    else:
        form = ContactForm()   # unbound form
        # or pre-fill: form = ContactForm(initial={"name": request.user.get_full_name()})

    return render(request, "contact.html", {"form": form})
```

---

## ModelForms

```python
from django import forms
from .models import Post, Comment

class PostForm(forms.ModelForm):
    class Meta:
        model   = Post
        fields  = ["title", "content", "excerpt", "image", "status", "categories"]
        # or: exclude = ["author", "views", "created_at"]

        widgets = {
            "title":   forms.TextInput(attrs={"class": "form-control", "placeholder": "Post title"}),
            "content": forms.Textarea(attrs={"class": "form-control", "rows": 15}),
            "excerpt": forms.Textarea(attrs={"class": "form-control", "rows": 3}),
            "status":  forms.Select(attrs={"class": "form-select"}),
            "categories": forms.CheckboxSelectMultiple(),
        }

        labels = {
            "title":   "Post Title",
            "content": "Content",
        }

        help_texts = {
            "excerpt": "A brief summary (max 500 characters).",
        }

        error_messages = {
            "title": {
                "required": "Please enter a title for your post.",
                "max_length": "Title must be 200 characters or fewer.",
            }
        }

    # Add extra fields not in the model
    confirm = forms.BooleanField(
        required=True,
        label="I confirm this post is ready to publish"
    )

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop("user", None)   # custom kwarg
        super().__init__(*args, **kwargs)
        # Dynamically modify fields
        if self.user and not self.user.is_staff:
            self.fields["status"].choices = [("draft", "Draft")]
        # Make excerpt optional
        self.fields["excerpt"].required = False

    def clean_title(self):
        title = self.cleaned_data["title"]
        slug  = slugify(title)
        qs = Post.objects.filter(slug=slug)
        if self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise ValidationError("A post with this title already exists.")
        return title

    def save(self, commit=True):
        post = super().save(commit=False)
        post.slug = slugify(post.title)
        if commit:
            post.save()
            self.save_m2m()   # save M2M (categories)
        return post

class CommentForm(forms.ModelForm):
    class Meta:
        model  = Comment
        fields = ["name", "email", "content"]
        widgets = {
            "content": forms.Textarea(attrs={"rows": 4}),
        }
```

---

## Widgets Reference

```python
# Text inputs
forms.TextInput(attrs={"class": "form-control"})
forms.Textarea(attrs={"rows": 5, "cols": 40})
forms.PasswordInput(render_value=False)
forms.HiddenInput()
forms.EmailInput()
forms.URLInput()
forms.NumberInput(attrs={"min": 0, "max": 100, "step": 1})
forms.DateInput(attrs={"type": "date"})
forms.DateTimeInput(attrs={"type": "datetime-local"})
forms.TimeInput(attrs={"type": "time"})
forms.SearchInput()
forms.TelInput()
forms.ColorInput()

# Choice widgets
forms.Select(attrs={"class": "form-select"})
forms.SelectMultiple()
forms.RadioSelect()
forms.CheckboxSelectMultiple()
forms.CheckboxInput()

# File widgets
forms.FileInput()
forms.ClearableFileInput()   # shows current file + clear checkbox

# Split widgets
forms.SplitDateTimeWidget()
forms.SelectDateWidget(years=range(1900, 2030))

# Attrs shortcut on the field
class MyForm(forms.Form):
    name = forms.CharField(
        widget=forms.TextInput(attrs={
            "class": "form-control",
            "placeholder": "Enter name",
            "autofocus": True,
            "data-validation": "required",
        })
    )
```

---

## Form Fields Reference

```python
# Text
forms.CharField(max_length=200, min_length=2, strip=True)
forms.EmailField()
forms.URLField()
forms.SlugField()
forms.UUIDField()
forms.GenericIPAddressField()
forms.RegexField(regex=r"^\d{5}$", error_messages={"invalid": "Enter a 5-digit ZIP code."})

# Numbers
forms.IntegerField(min_value=0, max_value=100)
forms.FloatField()
forms.DecimalField(max_digits=10, decimal_places=2)

# Boolean
forms.BooleanField(required=True)   # must be checked
forms.NullBooleanField()            # True/False/None

# Date/time
forms.DateField(input_formats=["%Y-%m-%d", "%d/%m/%Y"])
forms.TimeField()
forms.DateTimeField()
forms.DurationField()

# Choice
forms.ChoiceField(choices=[("a", "Option A"), ("b", "Option B")])
forms.MultipleChoiceField(choices=[...])
forms.TypedChoiceField(choices=[...], coerce=int)

# Files
forms.FileField(max_length=100, allow_empty_file=False)
forms.ImageField()   # validates it's an image (requires Pillow)
forms.MultipleFileField()   # Django 4.2+

# Model
forms.ModelChoiceField(queryset=Category.objects.all())
forms.ModelMultipleChoiceField(queryset=Category.objects.all())

# Common field options
forms.CharField(
    required=True,
    label="Full Name",
    help_text="Enter your first and last name.",
    initial="",
    error_messages={"required": "This field is required."},
    validators=[my_validator],
    disabled=False,
)
```

---

## Validation

```python
from django.core.validators import (
    MinValueValidator, MaxValueValidator,
    MinLengthValidator, MaxLengthValidator,
    RegexValidator, EmailValidator,
    URLValidator, validate_email,
)

# Built-in validators
age = forms.IntegerField(validators=[MinValueValidator(18), MaxValueValidator(120)])
username = forms.CharField(validators=[
    MinLengthValidator(3),
    RegexValidator(r"^[a-zA-Z0-9_]+$", "Only letters, numbers and underscores."),
])

# Custom validator function
def validate_no_spam(value):
    spam_words = ["spam", "scam", "free money"]
    for word in spam_words:
        if word in value.lower():
            raise ValidationError(f"Content contains prohibited word: {word}")

content = forms.CharField(validators=[validate_no_spam])

# Custom validator class
class ProhibitedWordsValidator:
    def __init__(self, words):
        self.words = words

    def __call__(self, value):
        for word in self.words:
            if word in value.lower():
                raise ValidationError(f"Prohibited word: {word}")

    def __eq__(self, other):
        return isinstance(other, self.__class__) and self.words == other.words

# Form-level validation
class SignupForm(forms.Form):
    password1 = forms.CharField(widget=forms.PasswordInput)
    password2 = forms.CharField(widget=forms.PasswordInput)

    def clean(self):
        cleaned = super().clean()
        p1 = cleaned.get("password1")
        p2 = cleaned.get("password2")
        if p1 and p2 and p1 != p2:
            raise ValidationError({"password2": "Passwords do not match."})
        return cleaned
```

---

## Rendering Forms in Templates

```html
<!-- Automatic rendering -->
<form method="post" enctype="multipart/form-data">
    {% csrf_token %}
    {{ form.as_p }}        <!-- each field in <p> tags -->
    {{ form.as_table }}    <!-- table rows (no <table> wrapper) -->
    {{ form.as_ul }}       <!-- <li> elements -->
    {{ form.as_div }}      <!-- <div> elements (Django 4.1+) -->
    <button type="submit">Submit</button>
</form>

<!-- Manual rendering (full control) -->
<form method="post" enctype="multipart/form-data">
    {% csrf_token %}
    {% for field in form %}
        <div class="form-group {% if field.errors %}has-error{% endif %}">
            {{ field.label_tag }}
            {{ field }}
            {% if field.help_text %}
                <small class="help-text">{{ field.help_text }}</small>
            {% endif %}
            {% for error in field.errors %}
                <span class="error">{{ error }}</span>
            {% endfor %}
        </div>
    {% endfor %}

    <!-- Non-field errors -->
    {% if form.non_field_errors %}
        <div class="alert alert-danger">
            {% for error in form.non_field_errors %}
                <p>{{ error }}</p>
            {% endfor %}
        </div>
    {% endif %}

    <button type="submit">Submit</button>
</form>

<!-- Individual field rendering -->
<div class="mb-3">
    <label for="{{ form.title.id_for_label }}">{{ form.title.label }}</label>
    {{ form.title }}
    {{ form.title.errors }}
</div>
```

---

## File Uploads

```python
# settings.py — must be set
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# urls.py — serve media in development
from django.conf import settings
from django.conf.urls.static import static
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Model
class Post(models.Model):
    image = models.ImageField(upload_to="posts/%Y/%m/", blank=True, null=True)

# Form — no special config needed; handled by ModelForm automatically
class PostForm(forms.ModelForm):
    class Meta:
        model  = Post
        fields = ["title", "image"]

# View — pass request.FILES for file uploads
def post_create(request):
    if request.method == "POST":
        form = PostForm(request.POST, request.FILES)  # request.FILES required!
        if form.is_valid():
            form.save()

# Template — enctype required for file uploads
# <form method="post" enctype="multipart/form-data">

# Accessing the file
post = Post.objects.get(pk=1)
if post.image:
    print(post.image.url)       # "/media/posts/2024/01/image.jpg"
    print(post.image.name)      # "posts/2024/01/image.jpg"
    print(post.image.path)      # "/home/user/project/media/posts/..."
    print(post.image.size)      # file size in bytes

# Resize images on upload (Pillow)
from PIL import Image

class Post(models.Model):
    image = models.ImageField(upload_to="posts/")

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.image:
            img = Image.open(self.image.path)
            if img.height > 800 or img.width > 800:
                img.thumbnail((800, 800))
                img.save(self.image.path)
```

---

## Tips

- `form = PostForm(request.POST, request.FILES, instance=post)` for editing an existing object — pass `instance`.
- `form.save(commit=False)` returns the model instance without saving — lets you set extra fields before saving.
- Always add `enctype="multipart/form-data"` to any form with file uploads — without it, files are never sent.
- Use `forms.ModelForm` instead of `forms.Form` whenever your form maps to a model — eliminates duplication.
- `{% csrf_token %}` is required in every POST form — Django raises `403 Forbidden` without it.

---

## Summary

- `forms.Form` — standalone form not tied to a model; `forms.ModelForm` — auto-generates from a model.
- `form.is_valid()` triggers validation; `form.cleaned_data` holds the validated values.
- Field-level: `clean_fieldname()`; cross-field: `clean()` — raise `ValidationError` to report errors.
- Widgets control HTML rendering; `attrs={}` passes HTML attributes.
- File uploads need `request.FILES` in the view and `enctype="multipart/form-data"` in the template.
