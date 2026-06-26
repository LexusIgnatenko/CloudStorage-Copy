from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from myapp import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('myapp.urls')),
    path('', views.index, name='home'),
    path('favicon.ico', RedirectView.as_view(url='/static/vite.svg')), 
    re_path(r'^(?P<path>.*)/$', views.index),
]

# Добавление маршрутов для статических и медиа-файлов
# ТОЛЬКО в режиме разработки (DEBUG = True)
if settings.DEBUG:
    # Обслуживание статических файлов (CSS, JavaScript, изображения)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

    # Обслуживание загруженных пользователем файлов (медиа)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)