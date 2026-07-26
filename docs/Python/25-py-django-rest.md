---
title: "Django REST Framework"
sidebar_label: "Django REST (DRF)"
sidebar_position: 25
---

# Django REST Framework (DRF)

Building REST APIs with DRF — serializers, viewsets, routers, authentication, and permissions.


---

## Setup

```bash
pip install djangorestframework djangorestframework-simplejwt django-cors-headers
```

```python
# settings.py
INSTALLED_APPS += ["rest_framework", "corsheaders"]

MIDDLEWARE.insert(2, "corsheaders.middleware.CorsMiddleware")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {"anon": "100/day", "user": "1000/day"},
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
}

CORS_ALLOWED_ORIGINS = ["http://localhost:3000", "https://myapp.com"]
CORS_ALLOW_CREDENTIALS = True

from datetime import timedelta
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME":  timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS":  True,
    "BLACKLIST_AFTER_ROTATION": True,
}
```

---

## Serializers

```python
# blog/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Post, Comment, Category

User = get_user_model()

# ModelSerializer — auto-generates fields from the model
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Category
        fields = ["id", "name", "slug"]

class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ["id", "username", "first_name", "last_name"]

class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)

    class Meta:
        model  = Comment
        fields = ["id", "author_name", "name", "content", "created_at"]
        read_only_fields = ["created_at"]

class PostSerializer(serializers.ModelSerializer):
    # Nested serializer (read-only)
    author     = AuthorSerializer(read_only=True)
    categories = CategorySerializer(many=True, read_only=True)

    # Write-only field for M2M by ID
    category_ids = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        many=True, write_only=True, source="categories"
    )

    # Computed field
    comment_count = serializers.IntegerField(
        source="comments.count", read_only=True
    )

    # SerializerMethodField — arbitrary computed value
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model  = Post
        fields = [
            "id", "title", "slug", "author", "categories", "category_ids",
            "content", "excerpt", "image", "status", "views",
            "comment_count", "is_owner", "created_at", "updated_at",
        ]
        read_only_fields = ["slug", "views", "created_at", "updated_at"]

    def get_is_owner(self, obj):
        request = self.context.get("request")
        return request and request.user == obj.author

    def validate_title(self, value):
        if len(value) < 5:
            raise serializers.ValidationError("Title must be at least 5 characters.")
        return value

    def validate(self, data):
        if data.get("status") == "published" and not data.get("content"):
            raise serializers.ValidationError("Published posts must have content.")
        return data

    def create(self, validated_data):
        categories = validated_data.pop("categories", [])
        post = Post.objects.create(**validated_data)
        post.categories.set(categories)
        return post

    def update(self, instance, validated_data):
        categories = validated_data.pop("categories", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if categories is not None:
            instance.categories.set(categories)
        return instance

# Non-model serializer
class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
```

---

## Views — APIView and Generics

```python
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Post
from .serializers import PostSerializer

# Function-based API view
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def post_list(request):
    if request.method == "GET":
        posts = Post.objects.filter(status="published")
        serializer = PostSerializer(posts, many=True, context={"request": request})
        return Response(serializer.data)

    elif request.method == "POST":
        serializer = PostSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save(author=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Class-based APIView
class PostDetailView(APIView):
    def get_object(self, pk):
        return get_object_or_404(Post, pk=pk)

    def get(self, request, pk):
        post = self.get_object(pk)
        serializer = PostSerializer(post, context={"request": request})
        return Response(serializer.data)

    def put(self, request, pk):
        post = self.get_object(pk)
        serializer = PostSerializer(post, data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk):
        post = self.get_object(pk)
        serializer = PostSerializer(post, data=request.data, partial=True,
                                    context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        post = self.get_object(pk)
        post.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

# Generic views — less boilerplate
class PostListCreateView(generics.ListCreateAPIView):
    serializer_class = PostSerializer

    def get_queryset(self):
        return Post.objects.filter(status="published").select_related("author")

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class PostRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Post.objects.all()
    serializer_class = PostSerializer

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
```

---

## ViewSets and Routers

```python
from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.response import Response

# ModelViewSet — full CRUD automatically
class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Post.objects.select_related("author").prefetch_related("categories")
        # Filter by query params
        status = self.request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(title__icontains=search)
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "list":
            return PostListSerializer    # lighter serializer for list
        return PostDetailSerializer     # full serializer for detail

    # Custom action — GET /posts/1/publish/
    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def publish(self, request, pk=None):
        post = self.get_object()
        if post.author != request.user:
            return Response({"error": "Not your post"}, status=403)
        post.publish()
        return Response({"status": "published"})

    # Custom action — GET /posts/featured/
    @action(detail=False, methods=["get"])
    def featured(self, request):
        featured = Post.objects.filter(status="published")[:5]
        serializer = self.get_serializer(featured, many=True)
        return Response(serializer.data)

# Read-only ViewSet
class CategoryViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin,
                       viewsets.GenericViewSet):
    queryset         = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

# Router — auto-generates URLs for ViewSets
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register("posts",      PostViewSet,     basename="post")
router.register("categories", CategoryViewSet, basename="category")

# blog/api_urls.py
from django.urls import path, include
urlpatterns = [
    path("", include(router.urls)),
]

# Generated URLs:
# GET    /posts/           → list
# POST   /posts/           → create
# GET    /posts/{id}/      → retrieve
# PUT    /posts/{id}/      → update
# PATCH  /posts/{id}/      → partial update
# DELETE /posts/{id}/      → destroy
# POST   /posts/{id}/publish/ → custom action
# GET    /posts/featured/  → custom action
```

---

## Permissions

```python
from rest_framework.permissions import BasePermission, IsAuthenticated, SAFE_METHODS

# Custom permission
class IsOwnerOrReadOnly(BasePermission):
    """Allow read to anyone; write only to the object's owner."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True   # GET, HEAD, OPTIONS
        return obj.author == request.user

class IsStaffOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_staff

# Apply globally
REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"]
}

# Apply per view
class PostViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
```

---

## JWT Authentication Endpoints

```python
# urls.py
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("api/token/",         TokenObtainPairView.as_view(),  name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(),     name="token_refresh"),
]

# POST /api/token/
# Body: {"email": "alice@example.com", "password": "secret"}
# Returns: {"access": "eyJ...", "refresh": "eyJ..."}

# Use token in requests:
# Authorization: Bearer eyJ...

# POST /api/token/refresh/
# Body: {"refresh": "eyJ..."}
# Returns: {"access": "eyJ..."}  (new access token)

# Custom JWT claims
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

class MyTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"]  = user.username
        token["email"]     = user.email
        token["is_staff"]  = user.is_staff
        return token

class MyTokenView(TokenObtainPairView):
    serializer_class = MyTokenSerializer
```

---

## Pagination, Filtering, Search

```python
# Custom pagination
from rest_framework.pagination import PageNumberPagination, CursorPagination

class StandardPagination(PageNumberPagination):
    page_size              = 20
    page_size_query_param  = "page_size"
    max_page_size          = 100
    page_query_param       = "page"

class CursorBasedPagination(CursorPagination):
    page_size  = 20
    ordering   = "-created_at"   # must be a unique, ordered field

# Filtering (pip install django-filter)
import django_filters
from .models import Post

class PostFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(choices=Post.STATUS_CHOICES)
    author = django_filters.CharFilter(field_name="author__username")
    min_views = django_filters.NumberFilter(field_name="views", lookup_expr="gte")
    created_after = django_filters.DateFilter(field_name="created_at__date", lookup_expr="gte")
    search = django_filters.CharFilter(method="search_filter")

    def search_filter(self, queryset, name, value):
        return queryset.filter(
            Q(title__icontains=value) | Q(content__icontains=value)
        )

    class Meta:
        model  = Post
        fields = ["status", "author"]

class PostViewSet(viewsets.ModelViewSet):
    filterset_class    = PostFilter
    search_fields      = ["title", "content", "author__username"]  # ?search=
    ordering_fields    = ["created_at", "views", "title"]          # ?ordering=-views
    ordering           = ["-created_at"]
```

---

## Tips

- Use `ViewSet` + `Router` for standard CRUD — far less URL configuration than individual views.
- Pass `context={"request": request}` to serializers when using `HyperlinkedModelSerializer` or `SerializerMethodField` that needs the request.
- `perform_create(serializer)` and `perform_update(serializer)` are the hooks for adding non-user-submitted data (like `author=request.user`).
- Use separate lightweight serializers for list vs detail views — list serializers should omit expensive nested relations.
- `IsOwnerOrReadOnly` is the most common custom permission — anyone can read, only the owner can write.

---

## Summary

- Serializers convert models ↔ JSON; `ModelSerializer` auto-generates from model; `validate_field()` for field-level validation.
- Generic views: `ListCreateAPIView`, `RetrieveUpdateDestroyAPIView` — minimal boilerplate.
- `ModelViewSet` + `DefaultRouter` = full CRUD with auto-generated URLs in ~10 lines.
- Custom `@action` decorators add extra endpoints to ViewSets (`/posts/1/publish/`, `/posts/featured/`).
- JWT auth: `TokenObtainPairView` (login), `TokenRefreshView` (refresh); send `Authorization: Bearer <token>`.
- Filtering: `django-filter` for structured filters; `SearchFilter` for `?search=`; `OrderingFilter` for `?ordering=`.
