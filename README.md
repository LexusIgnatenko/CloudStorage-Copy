# Инструкция по развертыванию проекта 

## Требования
- Python 3.1+
- Django 3.0+
- Node.js 18.0+
- React 18.0+
- PostgreSql 17.4
- Nginx 1.27+
- Gunicorn 23.0

## Развертывание VPS

### 1. Подготовка сервера
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка необходимых пакетов
sudo apt install python3 python3-pip python3-venv nginx gunicorn postgresql postgresql-contrib -y
```

### 2. Настройка базы данных
```bash
# Создание базы данных и пользователя
sudo -u postgres psql
CREATE DATABASE cloud_db;
CREATE USER cloud_user WITH PASSWORD 'your_password';
ALTER ROLE cloud_user SET client_encoding TO 'utf-8';
ALTER ROLE cloud_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE cloud_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE cloud_db TO cloud_user;
\q
```

### 3. Настройка бекенда
```bash
# Клонирование репозитория
git clone https://github.com/LexusIgnatenko/CloudStorage-Copy.git
cd CloudStorage-Copy/backend

# Создание виртуального окружения
python3 -m venv .venv
source .venv/bin/activate

# Установка зависимостей
pip install -r Requirements.txt

# Применение миграций
python manage.py migrate

# Создание суперпользователя
python manage.py createsuperuser

# Сбор статических файлов
python manage.py collectstatic
```

### 4. Настройка фронтенда
```bash
cd ../frontend

# Установка зависимостей
npm install

# Сборка проекта
npm run build
```
### 5. Настройка gunicorn
```bash
# Создаем файл gunicorn.service с содержимым
sudo nano /etc/systemd/system/gunicorn.service

[Unit]
Description=gunicorn daemon
After=network.target

[Service]
User=lexus
Group=www-data
WorkingDirectory=/home/lexus/CloudStorage-Copy/backend
ExecStart=/home/lexus/CloudStorage-Copy/backend/.venv/bin/gunicorn \
          --access-logfile - \
          --workers 3 \
          --bind 127.0.0.1:8000 cloud.wsgi:application

[Install]
WantedBy=multi-user.target
```

### 6. Настройка Nginx
```bash
# Создаём файл для nginx
sudo nano /etc/nginx/sites-available/cloudstorage-copy


server {
    listen 80;
    server_name 194.67.66.92;

    client_max_body_size 10M;

    # 1. Раздача статики (Абсолютный путь!)
    location /static/ {
        alias /home/lexus/CloudStorage-Copy/backend/staticfiles/;
    }

    # 2. Раздача медиа-файлов (Абсолютный путь!)
    location /media/ {
        alias /home/lexus/CloudStorage-Copy/backend/media/;
    }

    # 3. Передаем ВСЕ остальные запросы (включая главную страницу) на Gunicorn
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

### 7. Запуск приложения
```bash
sudo systemctl daemon-reload
sudo systemctl start gunicorn
sudo systemctl enable gunicorn

sudo systemctl start nginx

sudo ufw allow 'Nginx Full'
```
