
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r'expenses', views.TransactionViewSet, basename='expense')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', views.UserRegisterView.as_view(), name='register'),
    path('token/', views.MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('analysis', views.AnalyticsView.as_view(), name='analysis'),
]


