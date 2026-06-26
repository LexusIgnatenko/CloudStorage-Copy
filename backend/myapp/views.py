import os
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, login, logout
from rest_framework.response import Response
from rest_framework import status, viewsets
from django.http import FileResponse, Http404
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views import View
from django.utils import timezone
from django.utils.timezone import now
from django.core.files.storage import default_storage
from datetime import timedelta
from .models import CustomUser, FileStorage
from .serializers import (
    RegisterSerializer, LoginSerializer, UserProfileSerializer,
    UserUpdateSerializer, AdminUserSerializer, FileStorageUploadSerializer,
    FileStorageSerializer
)
import uuid
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
from django.conf import settings
from rest_framework.renderers import JSONRenderer
import mimetypes
import logging

logger = logging.getLogger(__name__)

class IsOwnerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        return bool(
            request.user.is_admin or
            obj.owner == request.user
        )

class UserProfileView(APIView):
    # permission_classes = (IsAuthenticated,)
    permission_classes = (AllowAny,)

    def get(self, request):
        # Если пользователь залогинен — отдаем его данные (статус 200)
        if request.user and request.user.is_authenticated:
            serializer = UserProfileSerializer(request.user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        # serializer = UserProfileSerializer(request.user)
        # return Response(serializer.data)
        #  ИСПРАВЛЕНО: Если это гость — отдаем пустой ответ со статусом 200 вместо 403!
        return Response(None, status=status.HTTP_200_OK)
    
    def put(self, request):
        # Для редактирования профиля оставляем строгую проверку авторизации вручную
        if not request.user or not request.user.is_authenticated:
            return Response({'error': 'Авторизуйтесь'}, status=status.HTTP_401_UNAUTHORIZED)
        
        serializer = UserUpdateSerializer(request.user, data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(ensure_csrf_cookie, name='dispatch')
class RegisterView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        return Response({'detail': 'CSRF cookie set'})

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'user_id': user.id,
                'username': user.username
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(ensure_csrf_cookie, name='dispatch')
class LoginView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        # Теперь этот метод гарантированно установит куку csrftoken на фронтенде
        return Response({'detail': 'CSRF cookie set'})

    # DRF автоматически проверяет CSRF для сессионной аутентификации.
    def post(self, request):
        """
        Аутентификация пользователя по username/password.
        Использует LoginSerializer для валидации.
        """
        print("--- DEBUG: Входящий запрос на логин ---")
        print(f"Тело запроса (request.data): {request.data}")

        # Проверяем, пришел ли токен вообще на бэкенд (для отладки в консоли)
        print(f"CSRF заголовок из браузера: {request.META.get('HTTP_X_CSRFTOKEN')}")
        print(f"CSRF кука в запросе: {request.COOKIES.get('csrftoken')}")

        serializer = LoginSerializer(data=request.data, context={'request': request})
        
        try:
            serializer.is_valid(raise_exception=True) 

            user = serializer.validated_data.get('user')
            
            if not user:
                return Response({'error': 'Неверные учетные данные.'}, status=status.HTTP_401_UNAUTHORIZED)

            login(request, user)

            print(f"--- DEBUG: Пользователь {user.username} успешно вошел ---")

            return Response({
                'user_id': user.id,
                'username': user.username,
                'is_admin': user.is_admin
            })

        except Exception as e:
            # Если сериализатор выкинул ошибку валидации (например, ValidationError от DRF)
            if hasattr(e, 'detail'):
                return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
                
            import traceback
            print("--- DEBUG: Неожиданная ошибка при логине ---")
            print(f"Тип ошибки: {type(e)}")
            print(f"Сообщение: {e}")
            traceback.print_exc()

            return Response(
                {'error': 'Произошла внутренняя ошибка сервера.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class IsAdminUser(BasePermission):

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_admin

class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = (IsAdminUser,)

    def list(self, request):
        try:
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Ошибка при получении списка пользователей: {str(e)}")
            return Response(
                {'error': f'Ошибка при получении списка пользователей: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request, pk=None):
        try:
            user = self.get_object()
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Ошибка при получении пользователя {pk}: {str(e)}")
            return Response(
                {'error': f'Ошибка при получении пользователя: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def toggle_admin(self, request, pk=None):
        try:
            user = self.get_object()
            user.is_admin = not user.is_admin
            user.save()
            return Response({'status': 'success', 'is_admin': user.is_admin})
        except Exception as e:
            logger.error(f"Ошибка при изменении прав администратора для пользователя {pk}: {str(e)}")
            return Response(
                {'error': f'Ошибка при изменении прав администратора: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def storage_info(self, request, pk=None):
        try:
            user = self.get_object()
            return Response(user.get_storage_info())
        except Exception as e:
            logger.error(f"Ошибка при получении информации о хранилище пользователя {pk}: {str(e)}")
            return Response(
                {'error': f'Ошибка при получении информации о хранилище: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    # Переопределяем метод удаления, чтобы зачистить физический диск сервера
    def perform_destroy(self, instance):
        # Находим все файлы, принадлежащие удаляемому пользователю
        user_files = FileStorage.objects.filter(owner=instance)
        for f in user_files:
            if f.file and default_storage.exists(f.file.name):
                default_storage.delete(f.file.name) # Стираем файлы из media/
        
        # Стираем самого пользователя из базы
        instance.delete()
        
class FileListView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        # Проверяем, если в запросе указан user_id и текущий пользователь - админ
        user_id = request.query_params.get('user_id')
        
        if user_id and request.user.is_admin:
            try:
                user = CustomUser.objects.get(id=user_id)
                files = FileStorage.objects.filter(owner=user)
            except CustomUser.DoesNotExist:
                return Response(
                    {'error': 'Пользователь не найден'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        elif request.user.is_admin:
            files = FileStorage.objects.all()
        else:
            files = FileStorage.objects.filter(owner=request.user)
        
        serializer = FileStorageSerializer(files, many=True, context={'request': request})
        return Response(serializer.data)

class FileUploadView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        try:
            file_obj = request.FILES.get('file')
            comment = request.data.get('comment', '')
            
            if not file_obj:
                return Response(
                    {'error': 'Файл не был предоставлен'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Создаем объект FileStorage
            file_storage = FileStorage(
                original_name=file_obj.name,
                file=file_obj,
                comment=comment,
                size=file_obj.size,
                owner=request.user
            )
            file_storage.save()

            serializer = FileStorageSerializer(file_storage, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class FileDetailView(APIView):
    permission_classes = (IsAuthenticated, IsOwnerOrAdmin)

    def get_object(self, pk):
        return FileStorage.objects.get(pk=pk)

    def get(self, request, pk):
        file_storage = self.get_object(pk)
        serializer = FileStorageSerializer(file_storage, context={'request': request})
        return Response(serializer.data)
    
    def patch(self, request, pk):
        try:
            # Находим файл в базе данных по его UUID
            file_obj = get_object_or_404(FileStorage, pk=pk)
            
            # Проверяем права доступа (владелец или админ)
            self.check_object_permissions(request, file_obj)

            # Получаем новое имя из тела JSON-запроса фронтенда
            new_name = request.data.get('name')

            if not new_name or not new_name.strip():
                return Response(
                    {'error': 'Имя файла не может быть пустым'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 1. Сохраняем расширение старого файла, чтобы пользователь случайно его не затер
            # (Например, если файл был "отчет.pdf", а пользователь написал "отчет_новый")
            _, ext = os.path.splitext(file_obj.original_name)
            
            # Если пользователь сам не указал расширение, принудительно возвращаем его
            if not new_name.endswith(ext):
                new_name = new_name.strip() + ext
            else:
                new_name = new_name.strip()

            # 2. Обновляем имя в базе данных
            file_obj.original_name = new_name
            file_obj.save()

            return Response({
                'message': 'Файл успешно переименован',
                'id': file_obj.id,
                'original_name': file_obj.original_name
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Ошибка при переименовании файла {pk}: {str(e)}")
            return Response(
                {'error': f'Не удалось переименовать файл: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request, pk):
        try:
            # Находим файл в базе данных
            file_obj = get_object_or_404(FileStorage, pk=pk)
            
            # Проверяем права через кастомный класс (вызывается вручную для APIView)
            self.check_object_permissions(request, file_obj)
            
            # 1. Удаляем физический файл с жесткого диска/хранилища Django
            if file_obj.file and default_storage.exists(file_obj.file.name):
                default_storage.delete(file_obj.file.name)
            
            # 2. Удаляем запись из базы данных
            file_obj.delete()
            
            # Возвращаем информацию об успехе. Бэкенд автоматически 
            # пересчитает место при следующем запросе профиля/хранилища
            return Response(
                {'message': 'Файл успешно удален', 'status': 'success'}, 
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Ошибка при удалении файла {pk}: {str(e)}")
            return Response(
                {'error': f'Не удалось удалить файл: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class FileDownloadView(APIView):
    permission_classes = (IsAuthenticated, IsOwnerOrAdmin)

    def get(self, request, pk):
        # Находим файл в базе данных по его UUID
        file_obj = get_object_or_404(FileStorage, pk=pk)
        
        # Проверяем права доступа к объекту
        self.check_object_permissions(request, file_obj)

        # Проверяем, существует ли физический файл на диске
        if not file_obj.file or not os.path.exists(file_obj.file.path):
            return Response(
                {'error': 'Файл физически отсутствует на сервере'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Фиксируем время последнего скачивания
        file_obj.last_download = timezone.now()
        file_obj.save()

        # Открываем файл в бинарном режиме для чтения (rb)
        response = FileResponse(open(file_obj.file.path, 'rb'), as_attachment=True)
        
        # Передаем оригинальное имя файла фронтенду в заголовках ответа
        response['Content-Disposition'] = f'attachment; filename="{file_obj.original_name}"'
        
        return response

class FileShareView(APIView):
    permission_classes = (IsAuthenticated, IsOwnerOrAdmin)
    renderer_classes = [JSONRenderer]  # Явно указываем, что возвращаем только JSON

    def get_object(self, pk):
        try:
            return FileStorage.objects.get(pk=pk)
        except FileStorage.DoesNotExist:
            raise Http404("Файл не найден")

    def get(self, request, pk):
        try:
            file_storage = self.get_object(pk)

            if not file_storage.share_link:
                file_storage.share_link = uuid.uuid4()
                file_storage.share_link_expiry = timezone.now() + timedelta(days=7)
                file_storage.save()
            
            share_link = str(file_storage.share_link)
            return Response({'share_link': share_link})
        
        except Http404 as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_404_NOT_FOUND,
                content_type='application/json'
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content_type='application/json'
            )

class FileRenameView(APIView):
    permission_classes = (IsAuthenticated, IsOwnerOrAdmin)

    def get_object(self, pk):
        return FileStorage.objects.get(pk=pk)

    def patch(self, request, pk):
        file_storage = self.get_object(pk)
        new_name = request.data.get('name')
        
        if not new_name:
            return Response(
                {'error': 'Новое имя файла не указано'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file_storage.original_name = new_name
        file_storage.save()
        
        serializer = FileStorageSerializer(file_storage, context={'request': request})
        return Response(serializer.data)

# class SharedFileView(APIView):
#     permission_classes = (AllowAny,)

#     def get(self, request, share_link):
#         try:
#             # Преобразуем share_link из строки в UUID
#             share_link_uuid = uuid.UUID(str(share_link))
            
#             file_storage = FileStorage.objects.get(share_link=share_link_uuid)
            
#             if file_storage.share_link_expiry and file_storage.share_link_expiry < timezone.now():
#                 return Response({'error': 'Ссылка истекла'}, status=400)

#             # Обновляем только дату последнего скачивания
#             file_storage.last_download = timezone.now()
#             file_storage.save(update_fields=['last_download'])

#             response = FileResponse(file_storage.file, as_attachment=False)
#             response['Content-Disposition'] = f'inline; filename="{file_storage.original_name}"'
#             return response
#         except FileStorage.DoesNotExist:
#             return Response({'error': 'Файл не найден'}, status=404)
#         except ValueError as e:
#             return Response({'error': 'Неверный формат ссылки'}, status=400)
#         except Exception as e:
#             return Response({'error': str(e)}, status=500) 

@api_view(['POST']) # Обязательно ПЕРВЫЙ декоратор
@permission_classes([IsAuthenticated]) # Исправлено: в DRF классы передаются списком []
@csrf_protect # Защищает метод POST от CSRF-атак
def logout_view(request):
    try:
        logout(request)
        return Response({'message': 'Успешный выход из системы'}, status=status.HTTP_200_OK)
    except Exception as e:
        # Исправлен лог на ошибку
        logger.error(f"Ошибка при выходе из системы: {str(e)}")
        return Response({'error': 'Не удалось выйти из системы'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SharedFileView(APIView):
    # ВАЖНО: Разрешаем доступ ВСЕМ пользователям, даже неавторизованным
    permission_classes = (AllowAny,) 

    def get(self, request, pk):
        # Находим файл по его уникальному UUID
        file_obj = get_object_or_404(FileStorage, pk=pk)

        # Проверяем физическое наличие файла на диске
        if not file_obj.file or not os.path.exists(file_obj.file.path):
            return Response(
                {'error': 'Файл физически отсутствует на сервере'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Фиксируем время последнего скачивания
        file_obj.last_download = timezone.now()
        file_obj.save()

        # Отдаем файл как бинарное вложение
        response = FileResponse(open(file_obj.file.path, 'rb'), as_attachment=True)
        response['Content-Disposition'] = f'attachment; filename="{file_obj.original_name}"'
        return response

def index(request, **kwargs):
    # Если мы разрабатываем проект локально (DEBUG = True)
    if settings.DEBUG:
        # Принудительно отдаем наш уникальный шаблон разработки,
        # передавая флаг 'debug': True в контекст страницы
        return render(request, 'vite_dev.html', {'debug': True})
    
    # В продакшене (DEBUG = False) отдаем стандартный собранный index.html
    return render(request, 'index.html', {'debug': False})
