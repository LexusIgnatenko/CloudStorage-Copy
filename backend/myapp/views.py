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

def index(request):
    return render(request, 'index.html')

class IsOwnerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        return bool(
            request.user.is_admin or
            obj.owner == request.user
        )


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# @method_decorator(ensure_csrf_cookie, name='dispatch')
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'detail': 'CSRF cookie set'})

    @method_decorator(csrf_protect)
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'user_id': user.id,
                'username': user.username
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    Response({'error': 'Ошибка обработки данных.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        # Этот метод нужен только для установки CSRF-койки фронтендом
        return Response({'detail': 'CSRF cookie set'})

    @method_decorator(csrf_protect)
    def post(self, request):
        """
        Аутентификация пользователя по username/password.
        Использует LoginSerializer для валидации.
        """
        serializer = LoginSerializer(data=request.data, context={'request': request})
        
        # Метод is_valid(True) автоматически вызовет исключение,
        # если данные неверны, и вернет правильный статус ошибки (например, 400).
        # Если данные валидны, он просто продолжит выполнение.
        serializer.is_valid(raise_exception=True) 

        # Если мы дошли до этой строки, значит пользователь успешно прошел проверку.
        user = serializer.validated_data['user']
        login(request, user)

        return Response({
            'user_id': user.id,
            'username': user.username,
            'is_admin': user.is_admin
        })

    @api_view(['POST'])
    @permission_classes([IsAuthenticated])
    @ensure_csrf_cookie
    def logout_view(request):
        try:
            logout(request)
            return Response({'message': 'Успешный выход из системы'})
        except Exception as e:
            logger.info(f"Успешный выход из системы: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class IsAdminUser(BasePermission):

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_admin


class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]

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


class FileListView(APIView):
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_object(self, pk):
        return FileStorage.objects.get(pk=pk)

    def get(self, request, pk):
        file_storage = self.get_object(pk)
        serializer = FileStorageSerializer(file_storage, context={'request': request})
        return Response(serializer.data)

    def delete(self, request, pk):
        file_storage = self.get_object(pk)
        file_storage.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class FileDownloadView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin] 

    def get_object(self, pk):
        return get_object_or_404(FileStorage, pk=pk)

    def get(self, request, pk):
        file_storage = self.get_object(pk)
        file_storage.update_last_download()
        
        # Проверяем наличие параметра preview
        is_preview = request.query_params.get('preview', None)
        
        # Готовим файл для отправки
        full_path = file_storage.file.path
        content_type, _ = mimetypes.guess_type(full_path)
        
        if is_preview:
            # Вернуть файл для просмотра в браузере
            return FileResponse(open(full_path, 'rb'), content_type=content_type)
        else:
            # Вернуть файл для скачивания
            response = FileResponse(open(full_path, 'rb'), content_type=content_type)
            response['Content-Disposition'] = f'attachment; filename="{file_storage.original_name}"'
            return response

class FileShareView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
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
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

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


class SharedFileView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, share_link):
        try:
            # Преобразуем share_link из строки в UUID
            share_link_uuid = uuid.UUID(str(share_link))
            
            file_storage = FileStorage.objects.get(share_link=share_link_uuid)
            
            if file_storage.share_link_expiry and file_storage.share_link_expiry < timezone.now():
                return Response({'error': 'Ссылка истекла'}, status=400)

            # Обновляем только дату последнего скачивания
            file_storage.last_download = timezone.now()
            file_storage.save(update_fields=['last_download'])

            response = FileResponse(file_storage.file, as_attachment=False)
            response['Content-Disposition'] = f'inline; filename="{file_storage.original_name}"'
            return response
        except FileStorage.DoesNotExist:
            return Response({'error': 'Файл не найден'}, status=404)
        except ValueError as e:
            return Response({'error': 'Неверный формат ссылки'}, status=400)
        except Exception as e:
            return Response({'error': str(e)}, status=500) 
        

# @method_decorator(ensure_csrf_cookie, name='dispatch')
# class LoginView(APIView):
#     permission_classes = [AllowAny]

#     def get(self, request):
#         # Установка CSRF-токена в cookie
#         response = Response({'detail': 'CSRF cookie set'})
#         response['X-CSRFToken'] = request.META.get('CSRF_COOKIE', '')
#         return response

#     @method_decorator(csrf_protect)
#     def post(self, request):
#         try:
#             serializer = LoginSerializer(data=request.data)
#             if serializer.is_valid():
#                 user = serializer.validated_data['user']
#                 login(request, user)
#                 response = Response({
#                     'user_id': user.id,
#                     'username': user.username,
#                     'is_admin': user.is_admin
#                 })
#                 # Обновляем CSRF токен в ответе
#                 response['X-CSRFToken'] = request.META.get('CSRF_COOKIE', '')
#                 return response
#             return Response({
#                 'error': 'Неверное имя пользователя или пароль'
#             }, status=status.HTTP_401_UNAUTHORIZED)
#         except Exception as e:
#             logger.error(f"Ошибка при авторизации: {str(e)}")
#             return Response({
#                 'error': str(e)
#             }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)       


# class LoginView(APIView):
#     permission_classes = [AllowAny]

#     def get(self, request):
#         # Установка CSRF-токена в cookie
#         response = Response({'detail': 'CSRF cookie set'})
#         return response

#     @method_decorator(csrf_protect)
#     def post(self, request):
#         # Используем сериализатор для валидации
#         serializer = LoginSerializer(data=request.data)

#         # Проверяем, валидны ли данные (например, все ли поля на месте)
#         if not serializer.is_valid():
#             # Если данные невалидны, возвращаем 400 Bad Request с подробностями
#             return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

#         # Если данные валидны, пытаемся аутентифицировать пользователя
#         try:
#             user = serializer.validated_data['user']
#             login(request, user)
#             return Response({
#                 'user_id': user.id,
#                 'username': user.username,
#                 'is_admin': user.is_admin
#             })
#         except KeyError:
#             # На случай, если в сериализаторе что-то пошло не так
#             return