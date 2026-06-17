from django.core.management.base import BaseCommand
from django.conf import settings
import os

class Command(BaseCommand):
    help = 'Создает необходимые директории для хранения файлов'

    def handle(self, *args, **options):
        # директории для хранения файлов
        storage_dirs = [
            settings.FILE_STORAGE_BASE_DIR,
            settings.MEDIA_ROOT,
        ]

        for directory in storage_dirs:
            if not os.path.exists(directory):
                os.makedirs(directory)
                self.stdout.write(
                    self.style.SUCCESS(f'Создана директория: {directory}')
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(f'Директория уже существует: {directory}')
                )

        # директории для каждого пользователя
        from myapp.models import CustomUser
        for user in CustomUser.objects.all():
            user_storage_path = os.path.join(settings.FILE_STORAGE_BASE_DIR, user.username)
            if not os.path.exists(user_storage_path):
                os.makedirs(user_storage_path)
                self.stdout.write(
                    self.style.SUCCESS(f'Создана директория пользователя: {user_storage_path}')
                ) 