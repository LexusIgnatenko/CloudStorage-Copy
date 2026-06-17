import os
import subprocess
import sys
import signal

def main():
    def signal_handler(signum, frame):
        if frontend_process:
            frontend_process.terminate()
        if django_process:
            django_process.terminate()
        sys.exit(0)

    # Регистрируем обработчик сигналов
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Определяем пути
    current_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(os.path.dirname(current_dir), 'frontend')

    # Запускаем frontend сервер
    frontend_process = subprocess.Popen(
        'npm run dev',
        shell=True,
        cwd=frontend_dir
    )

    # Запускаем Django сервер
    django_process = subprocess.Popen(
        'python manage.py runserver',
        shell=True,
        cwd=current_dir
    )

    try:
        # Ждем завершения процессов
        frontend_process.wait()
        django_process.wait()
    except KeyboardInterrupt:
        # При получении Ctrl+C завершаем процессы
        if frontend_process:
            frontend_process.terminate()
        if django_process:
            django_process.terminate()

if __name__ == '__main__':
    main() 