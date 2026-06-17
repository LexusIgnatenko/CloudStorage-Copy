from django.contrib.auth.models import AbstractUser
from django.db import models
from .validators import validate_username, validate_email
import uuid
from django.utils import timezone
import os


# Расширение встроенной модели User
class CustomUser(AbstractUser):
    username = models.CharField(
        max_length=20,
        unique=True,
        validators=[validate_username],
        verbose_name='Логин'
    )
    email = models.EmailField(
        unique=True,
        validators=[validate_email],
        verbose_name='Email'
    )
    is_admin = models.BooleanField(default=False, verbose_name='Администратор')
    storage_path = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.username
    # Получаем информацию о хранилище пользователя
    def get_storage_info(self):
        files = self.files.all()
        return {
            'file_count': files.count(),
            'total_size': sum(file.size for file in files),
        }

    def save(self, *args, **kwargs):
        if not self.storage_path:
            self.storage_path = f'storage/{self.username}/'
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'


class FileStorage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_name = models.CharField(max_length=255, default='')
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to='files/')
    comment = models.TextField(blank=True, null=True)
    size = models.BigIntegerField()
    owner = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='files')
    upload_date = models.DateTimeField(auto_now_add=True)
    last_download = models.DateTimeField(null=True, blank=True)
    share_link = models.UUIDField(unique=True, null=True, blank=True)
    share_link_expiry = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.original_name} ({self.owner.username})"

    def save(self, *args, **kwargs):
        if not self.share_link:
            self.share_link = uuid.uuid4()
        if not self.share_link_expiry:
            self.share_link_expiry = timezone.now() + timezone.timedelta(days=7)
        
        # Генерируем уникальное имя файла только если оно еще не установлено
        if not self.name and self.file:
            file_ext = os.path.splitext(self.file.name)[1]
            self.name = f"{self.id}{file_ext}"
            # Сохраняем оригинальное имя файла
            self.original_name = self.file.name
        
        super().save(*args, **kwargs)

    def update_last_download(self):
        self.last_download = timezone.now()
        self.save()

    def get_file_path(self):
        return os.path.join(self.owner.storage_path, self.name)

    def delete(self, *args, **kwargs):
        if self.file:
            if os.path.isfile(self.file.path):
                os.remove(self.file.path)
        super().delete(*args, **kwargs) 