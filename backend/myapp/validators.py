import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


# Валидатор для проверки логина
def validate_username(value):
    if not re.match(r'^[a-zA-Z][a-zA-Z0-9]{3,19}$', value):
        raise ValidationError(
            _('Логин должен содержать от 4 до 20 символов, начинаться с буквы и содержать только латинские буквы и цифры.')
        )


# Валидатор для проверки пароля
def validate_password(value):
    if len(value) < 6:
        raise ValidationError(_('Пароль должен содержать не менее 6 символов.'))
    
    if not re.search(r'[A-Z]', value):
        raise ValidationError(_('Пароль должен содержать хотя бы одну заглавную букву.'))
    
    if not re.search(r'\d', value):
        raise ValidationError(_('Пароль должен содержать хотя бы одну цифру.'))
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
        raise ValidationError(_('Пароль должен содержать хотя бы один специальный символ (!@#$%^&*(),.?":{}|<>).'))


# Валидатор для проверки email
def validate_email(value):
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', value):
        raise ValidationError(_('Введите корректный email адрес.')) 