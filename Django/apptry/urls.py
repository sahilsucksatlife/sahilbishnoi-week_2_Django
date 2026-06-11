
from django.urls import path, include
from . import views

localhost:8000/apptry
# localhost:8000/apptry/order

urlpatterns = [
    path('', views.all_app , name='all_chai'),
    # path('order/', views.order, name='order'),
]
