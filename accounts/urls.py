

from django.urls import path

from accounts.views import login_view, signup_view,logout_view


urlpatterns = [
    path('signup/', signup_view, name='signup'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
]
