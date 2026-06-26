from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import CustomUser, FileStorage
from .validators import validate_password


# class UserProfileSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = CustomUser
#         fields = ['id', 'username', 'email', 'is_admin']
#         read_only_fields = ('username',)

#     def validate_email(self, value):
#         user = self.context['request'].user
#         if CustomUser.objects.exclude(pk=user.pk).filter(email=value).exists():
#             raise serializers.ValidationError("Этот email уже используется!")
#         return value

#     def validate_username(self, value):
#         user = self.context['request'].user
#         if CustomUser.objects.exclude(pk=user.pk).filter(username=value).exists():
#             raise serializers.ValidationError("Это имя пользователя уже занято.")
#         return value

class UserProfileSerializer(serializers.ModelSerializer):
    # Добавляем динамические поля для подсчета памяти
    used_space = serializers.SerializerMethodField()
    storage_limit = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        # Добавляем fields новые поля используемые на фронтенде в Navbar
        fields = ['id', 'username', 'email', 'is_admin', 'used_space', 'storage_limit']
        read_only_fields = ('username',)

    # Метод считает суммарный размер всех файлов текущего пользователя
    def get_used_space(self, obj):
        # На бэкенде суммируем поле size всех записей FileStorage для данного юзера
        return sum(f.size for f in FileStorage.objects.filter(owner=obj))

    # Метод возвращает лимит пользователя
    def get_storage_limit(self, obj):
        # Если в вашей модели CustomUser есть реальное поле (например, storage_limit или max_size), 
        # верните его: return obj.storage_limit
        # Если его пока нет, возвращаем фиксированный дефолтный лимит, например, 100 МБ в байтах:
        return getattr(obj, 'storage_limit', 100 * 1024 * 1024)

    def validate_email(self, value):
        user = self.context['request'].user
        if CustomUser.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError("Этот email уже используется!")
        return value

    def validate_username(self, value):
        user = self.context['request'].user
        if CustomUser.objects.exclude(pk=user.pk).filter(username=value).exists():
            raise serializers.ValidationError("Это имя пользователя уже занято.")
        return value

class UserUpdateSerializer(serializers.ModelSerializer):
    current_password = serializers.CharField(write_only=True, required=False)
    new_password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'current_password', 'new_password')

    def validate(self, data):
        if 'current_password' in data or 'new_password' in data:
            if not data.get('current_password'):
                raise serializers.ValidationError({
                    'current_password': 'Необходимо указать текущий пароль'
                })
            if not data.get('new_password'):
                raise serializers.ValidationError({
                    'new_password': 'Необходимо указать новый пароль'
                })
            if not self.instance.check_password(data.get('current_password')):
                raise serializers.ValidationError({
                    'current_password': 'Неверный текущий пароль'
                })
        return data

    def update(self, instance, validated_data):
        if 'new_password' in validated_data:
            instance.set_password(validated_data['new_password'])
            validated_data.pop('new_password')
        validated_data.pop('current_password', None)
        return super().update(instance, validated_data)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'password', 'password_confirm')

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Пароли не совпадают'})
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = CustomUser.objects.create_user(**validated_data)
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            # Не вызываем raise, а добавляем ошибку к полю 'username'
            # Это стандартный способ сообщить о проблеме валидации
            raise serializers.ValidationError("Неверное имя пользователя или пароль", code='authorization')
        
        # Если пользователь найден, сохраняем его в validated_data
        data['user'] = user
        return data

class FileStorageSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    is_owner = serializers.SerializerMethodField()
    original_name = serializers.CharField(read_only=True)

    class Meta:
        model = FileStorage
        fields = ('id', 'original_name', 'name', 'comment', 'size', 'owner', 'owner_username', 
                 'upload_date', 'last_download', 'share_link', 'is_owner')
        read_only_fields = ('id', 'size', 'owner', 'upload_date', 'last_download', 'share_link')

    def get_is_owner(self, obj):
        request = self.context.get('request')
        return request and request.user == obj.owner


class AdminUserSerializer(serializers.ModelSerializer):
    total_files = serializers.SerializerMethodField()
    total_storage = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'is_admin', 'date_joined', 
                 'total_files', 'total_storage')
        read_only_fields = ('date_joined',)

    def get_total_files(self, obj):
        return FileStorage.objects.filter(owner=obj).count()

    def get_total_storage(self, obj):
        return sum(file.size for file in FileStorage.objects.filter(owner=obj))


class FileStorageUploadSerializer(serializers.ModelSerializer):
    file = serializers.FileField()
    comment = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = FileStorage
        fields = ('file', 'comment')

    def create(self, validated_data):
        file = validated_data.pop('file')
        comment = validated_data.get('comment', '')
        owner = self.context['request'].user
        
        file_storage = FileStorage.objects.create(
            original_name=file.name,
            file=file,
            comment=comment,
            size=file.size,
            owner=owner
        )
        return file_storage 
