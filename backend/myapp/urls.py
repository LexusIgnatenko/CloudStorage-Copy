from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserProfileView, RegisterView, LoginView, logout_view,
    AdminUserViewSet, FileListView, FileUploadView, FileDetailView,
    FileDownloadView, FileShareView, FileRenameView, SharedFileView
)

router = DefaultRouter()
router.register(r'users', AdminUserViewSet, basename='admin-user')

urlpatterns = [
    # Аутентификация
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', logout_view, name='logout'),
    
    # Профиль пользователя
    path('profile/', UserProfileView.as_view(), name='profile'),
    
    # Файловое хранилище
    path('files/', FileListView.as_view(), name='file-list'),
    path('files/upload/', FileUploadView.as_view(), name='file-upload'),
    path('files/<uuid:pk>/', FileDetailView.as_view(), name='file-detail'),
    path('files/<uuid:pk>/download/', FileDownloadView.as_view(), name='file-download'),
    path('files/<uuid:pk>/share/', FileShareView.as_view(), name='file-share'),
    path('files/<uuid:pk>/rename/', FileRenameView.as_view(), name='file-rename'),
    
    # Общий доступ к файлам - обновляем путь
    path('shared/<uuid:share_link>/', SharedFileView.as_view(), name='shared-file'),
    
    # Административный интерфейс
    path('', include(router.urls)),
] 