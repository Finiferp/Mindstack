---
title: "Django Views and Templates"
sidebar_label: "Views & Templates"
sidebar_position: 22
---

# Django Views and Templates

Function-based views, class-based views, the template language, and context processors.

---

## Function-Based Views (FBV)

```python
# blog/views.py
from django.shortcuts import render, get_object_or_404, redirect
from django.http import HttpResponse, JsonResponse, Http404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods, require_POST
from django.contrib import messages
from django.core.paginator import Paginator
from django.db.models import Q
from .models import Post, Comment
from .forms import PostForm, CommentForm

def post_list(request):
    """List all published posts with search and pagination."""
    posts = Post.objects.filter(status="published").select_related("author")

    # Search
    query = request.GET.get("q")
    if query:
        posts = posts.filter(
            Q(title__icontains=query) | Q(content__icontains=query)
        )

    # Pagination
    paginator = Paginator(posts, per_page=10)
    page_number = request.GET.get("page")
    page_obj = paginator.get_page(page_number)

    return render(request, "blog/list.html", {
        "page_obj": page_obj,
        "query": query,
    })

def post_detail(request, pk):
    """Show a single post and handle comment submission."""
    post = get_object_or_404(Post, pk=pk, status="published")

    # Increment view count
    Post.objects.filter(pk=pk).update(views=F("views") + 1)

    # Comments
    comments = post.comments.filter(approved=True)
    comment_form = CommentForm()

    if request.method == "POST":
        comment_form = CommentForm(request.POST)
        if comment_form.is_valid():
            comment = comment_form.save(commit=False)
            comment.post = post
            if request.user.is_authenticated:
                comment.author = request.user
            comment.save()
            messages.success(request, "Comment submitted for review.")
            return redirect("blog:detail", pk=pk)

    return render(request, "blog/detail.html", {
        "post": post,
        "comments": comments,
        "comment_form": comment_form,
    })

@login_required
def post_create(request):
    if request.method == "POST":
        form = PostForm(request.POST, request.FILES)
        if form.is_valid():
            post = form.save(commit=False)
            post.author = request.user
            post.save()
            form.save_m2m()   # save M2M fields after setting author
            messages.success(request, "Post created!")
            return redirect(post.get_absolute_url())
    else:
        form = PostForm()

    return render(request, "blog/form.html", {"form": form, "action": "Create"})

@login_required
def post_delete(request, pk):
    post = get_object_or_404(Post, pk=pk, author=request.user)
    if request.method == "POST":
        post.delete()
        messages.success(request, "Post deleted.")
        return redirect("blog:list")
    return render(request, "blog/confirm_delete.html", {"post": post})

# JSON response
def api_posts(request):
    posts = Post.objects.filter(status="published").values(
        "id", "title", "slug", "created_at"
    )
    return JsonResponse({"posts": list(posts)})

# HTTP method restriction
@require_http_methods(["GET", "POST"])
def my_view(request): ...

@require_POST
def process_only_post(request): ...
```

---

## Class-Based Views (CBV)

```python
from django.views.generic import (
    ListView, DetailView, CreateView, UpdateView, DeleteView, TemplateView, View
)
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.urls import reverse_lazy

# ListView
class PostListView(ListView):
    model = Post
    template_name = "blog/list.html"
    context_object_name = "posts"   # default: object_list
    paginate_by = 10
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = super().get_queryset().filter(status="published")
        query = self.request.GET.get("q")
        if query:
            qs = qs.filter(Q(title__icontains=query))
        return qs.select_related("author")

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["query"] = self.request.GET.get("q", "")
        return ctx

# DetailView
class PostDetailView(DetailView):
    model = Post
    template_name = "blog/detail.html"
    context_object_name = "post"

    def get_queryset(self):
        return super().get_queryset().filter(status="published")

# CreateView
class PostCreateView(LoginRequiredMixin, CreateView):
    model = Post
    form_class = PostForm
    template_name = "blog/form.html"
    success_url = reverse_lazy("blog:list")  # reverse_lazy for class attributes

    def form_valid(self, form):
        form.instance.author = self.request.user
        messages.success(self.request, "Post created!")
        return super().form_valid(form)

# UpdateView
class PostUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Post
    form_class = PostForm
    template_name = "blog/form.html"

    def test_func(self):
        return self.get_object().author == self.request.user

    def form_valid(self, form):
        messages.success(self.request, "Post updated!")
        return super().form_valid(form)

# DeleteView
class PostDeleteView(LoginRequiredMixin, UserPassesTestMixin, DeleteView):
    model = Post
    template_name = "blog/confirm_delete.html"
    success_url = reverse_lazy("blog:list")

    def test_func(self):
        return self.get_object().author == self.request.user

# TemplateView — just render a template
class AboutView(TemplateView):
    template_name = "blog/about.html"

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["title"] = "About Us"
        return ctx

# Generic View for custom logic
class PostSearchView(View):
    def get(self, request):
        query = request.GET.get("q", "")
        posts = Post.objects.filter(title__icontains=query) if query else []
        return render(request, "blog/search.html", {"posts": posts, "query": query})

    def post(self, request):
        # Handle POST
        ...
```

---

## Templates

```html
<!-- templates/blog/base.html -->
<!DOCTYPE html>
<html>
<head>
    <title>{% block title %}My Blog{% endblock %}</title>
    {% load static %}
    <link rel="stylesheet" href="{% static 'css/style.css' %}">
</head>
<body>
    <nav>
        <a href="{% url 'blog:list' %}">Home</a>
        {% if user.is_authenticated %}
            <a href="{% url 'blog:create' %}">New Post</a>
            <a href="{% url 'logout' %}">Logout ({{ user.username }})</a>
        {% else %}
            <a href="{% url 'login' %}">Login</a>
        {% endif %}
    </nav>

    {% if messages %}
        {% for message in messages %}
            <div class="alert alert-{{ message.tags }}">{{ message }}</div>
        {% endfor %}
    {% endif %}

    <main>
        {% block content %}{% endblock %}
    </main>

    <footer>{% block footer %}{% endblock %}</footer>
    {% block scripts %}{% endblock %}
</body>
</html>
```

```html
<!-- templates/blog/list.html -->
{% extends "blog/base.html" %}

{% block title %}Posts — {{ block.super }}{% endblock %}

{% block content %}
<h1>Blog Posts</h1>

<!-- Search form -->
<form method="get">
    <input type="text" name="q" value="{{ query }}" placeholder="Search...">
    <button type="submit">Search</button>
</form>

<!-- Post list -->
{% for post in page_obj %}
    <article>
        <h2><a href="{{ post.get_absolute_url }}">{{ post.title }}</a></h2>
        <p>By {{ post.author.get_full_name|default:post.author.username }}
           on {{ post.created_at|date:"F j, Y" }}</p>
        <p>{{ post.excerpt|default:post.content|truncatewords:30 }}</p>
        <p>{{ post.views }} view{{ post.views|pluralize }}</p>
    </article>
{% empty %}
    <p>No posts found.</p>
{% endfor %}

<!-- Pagination -->
{% if page_obj.has_other_pages %}
<nav>
    {% if page_obj.has_previous %}
        <a href="?page={{ page_obj.previous_page_number }}{% if query %}&q={{ query }}{% endif %}">
            Previous
        </a>
    {% endif %}

    Page {{ page_obj.number }} of {{ page_obj.paginator.num_pages }}

    {% if page_obj.has_next %}
        <a href="?page={{ page_obj.next_page_number }}{% if query %}&q={{ query }}{% endif %}">
            Next
        </a>
    {% endif %}
</nav>
{% endif %}
{% endblock %}
```

---

## Template Language Reference

```django
{# This is a comment #}

{# Variables #}
{{ variable }}
{{ user.username }}
{{ post.author.get_full_name }}
{{ post.get_absolute_url }}

{# Filters #}
{{ name|lower }}
{{ name|upper }}
{{ name|title }}
{{ name|capfirst }}
{{ name|truncatewords:10 }}
{{ name|truncatechars:50 }}
{{ text|linebreaks }}            {# \n → <br> and <p> tags #}
{{ text|linebreaksbr }}          {# \n → <br> only #}
{{ text|striptags }}             {# remove HTML tags #}
{{ text|safe }}                  {# mark as safe HTML — use carefully! #}
{{ value|default:"N/A" }}
{{ value|default_if_none:"N/A" }}
{{ items|length }}
{{ items|first }}
{{ items|last }}
{{ items|join:", " }}
{{ items|slice:":3" }}
{{ number|floatformat:2 }}       {# 3.14159 → "3.14" #}
{{ number|intcomma }}            {# 1000000 → "1,000,000" #}
{{ bytes|filesizeformat }}       {# 1048576 → "1.0 MB" #}
{{ date|date:"F j, Y" }}         {# January 15, 2024 #}
{{ date|date:"Y-m-d" }}          {# 2024-01-15 #}
{{ date|timesince }}             {# "3 days ago" #}
{{ date|timeuntil }}             {# "2 hours" #}
{{ value|pluralize }}            {# "" or "s" #}
{{ value|pluralize:"y,ies" }}    {# "category" or "categories" #}
{{ value|yesno:"Yes,No,Maybe" }}
{{ value|add:10 }}
{{ url|urlencode }}
{{ text|urlize }}                {# convert URLs to links #}
{{ html|escape }}                {# HTML escape #}
{{ string|slugify }}
{{ value|divisibleby:3 }}

{# Tags #}
{% if condition %}...{% elif other %}...{% else %}...{% endif %}
{% for item in list %}
    {{ forloop.counter }}     {# 1-based counter #}
    {{ forloop.counter0 }}    {# 0-based counter #}
    {{ forloop.first }}       {# True on first iteration #}
    {{ forloop.last }}        {# True on last iteration #}
    {{ forloop.revcounter }}  {# reverse counter #}
    {{ forloop.parentloop }}  {# outer loop in nested loops #}
{% empty %}
    No items.
{% endfor %}

{% with full_name=user.get_full_name %}
    {{ full_name }}
{% endwith %}

{% url "blog:detail" pk=post.pk %}
{% url "blog:list" %}

{% static "css/style.css" %}        {# requires {% load static %} #}
{% load static %}
<img src="{% static 'img/logo.png' %}">

{% block name %}default{% endblock %}
{% extends "base.html" %}
{% include "partials/card.html" with post=post %}
{% include "partials/card.html" with post=post only %}  {# no parent context #}

{% csrf_token %}   {# required in all forms #}

{# Custom template tags — blog/templatetags/blog_tags.py #}
{% load blog_tags %}
{% get_recent_posts count=5 as recent_posts %}
{{ value|markdown }}
```

---

## Custom Template Tags and Filters

```python
# blog/templatetags/blog_tags.py
from django import template
from django.utils.safestring import mark_safe
import markdown as md

register = template.Library()

# Simple filter
@register.filter
def markdown(value):
    """Convert markdown to HTML."""
    return mark_safe(md.markdown(value, extensions=["fenced_code"]))

# Filter with argument
@register.filter
def truncate_chars(value, max_len):
    if len(value) <= max_len:
        return value
    return value[:max_len] + "..."

# Simple tag
@register.simple_tag
def get_site_name():
    return "My Blog"

# Tag with context
@register.simple_tag(takes_context=True)
def current_section(context):
    return context.get("section", "general")

# Inclusion tag — renders a template
@register.inclusion_tag("blog/partials/recent_posts.html")
def recent_posts(count=5):
    posts = Post.objects.filter(status="published")[:count]
    return {"posts": posts}

# Assignment tag
@register.simple_tag
def get_categories():
    return Category.objects.annotate(post_count=Count("posts")).order_by("name")
```

---

## Tips

- Prefer CBVs for standard CRUD operations — `ListView`, `CreateView`, `UpdateView`, `DeleteView` eliminate boilerplate.
- Use FBVs for complex logic that doesn't map cleanly to CRUD — they're easier to understand.
- `get_object_or_404()` is idiomatic — never manually `try: Model.objects.get()` / `except: raise Http404`.
- Always use `{% csrf_token %}` in every POST form — Django will reject the submission without it.
- `messages.success(request, "...")` + `{% for message in messages %}` in your base template gives free flash messages.

---

## Summary

- FBV: `def view(request): ... return render(request, "template.html", context)`.
- CBV: inherit from `ListView`, `DetailView`, `CreateView`, `UpdateView`, `DeleteView` — configure with class attributes.
- `LoginRequiredMixin` + `UserPassesTestMixin` handle authentication and authorisation in CBVs.
- Templates extend a base, use `{{ variable }}`, `{% tag %}`, and filters like `|date`, `|truncatewords`, `|default`.
- `{% url "app:name" pk=1 %}` generates URLs by name; `{% static "path" %}` for static files.
- Custom template tags/filters live in `app/templatetags/app_name.py` and are loaded with `{% load app_name %}`.
