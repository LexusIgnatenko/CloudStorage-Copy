import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import FileList from '../components/FileStorage/FileList';
import FileUpload from '../components/FileStorage/FileUpload';
import Navbar from '../components/Navigation/Navbar';
import './Dashboard.css';
import { fetchFiles, clearSuccessMessage, clearError, uploadFile } from '../features/fileStorage/fileStorageSlice';
import { logoutUser } from '../features/auth/authSlice';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();

  // Получаем данные о файлах из fileStorage
  const { files, status, error, successMessage } = useSelector((state) => state.fileStorage);

  //  Извлекаем информацию об админе из authSlice, где хранятся данные залогиненного юзера
  const user = useSelector((state) => state.auth.user);
  const isAdmin = user?.is_admin || false;

  const userIdFromQuery = searchParams.get('user');

  // Загрузка списка файлов
  useEffect(() => {
    if (userIdFromQuery) {
      dispatch(fetchFiles({ userId: userIdFromQuery }));
    } else {
      dispatch(fetchFiles());
    }
  }, [dispatch, userIdFromQuery]);

  // Очищаем сообщения об успехе по таймеру
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        dispatch(clearSuccessMessage());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, dispatch]);

  // Очищаем сообщения об ошибке по таймеру
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  // Перевели выход на созданный ранее Thunk, чтобы правильно обрабатывать сессии и CSRF
  const handleLogout = async () => {
    const resultAction = await dispatch(logoutUser());
    if (logoutUser.fulfilled.match(resultAction)) {
      navigate('/login');
    }
  };

  const handleUploadSuccess = async (file, comment) => {
    // 1. Отправляем файл на сервер и ЖДЁМ окончания загрузки через unwrap()
    try {
      await dispatch(uploadFile({ file, comment })).unwrap();

      // 2. После успешной загрузки принудительно обновляем список файлов на экране
      if (userIdFromQuery) {
        // Если это админ в личном кабинете юзера
        dispatch(fetchFiles({ userId: userIdFromQuery }));
      } else {
        // Если это обычный пользователь в своем кабинете
        dispatch(fetchFiles());
      }
    } catch (err) {
      console.error("Не удалось обновить список файлов:", err);
    }
  };

  return (
    <div className="dashboard-container">
      <Navbar onLogout={handleLogout} />
      <div className="dashboard-content">
        <div className="main-content">
          <h2>Твои файлы</h2>

          {/* Отображаем сообщения из стора */}
          {error && (
            <div className="error-message" onClick={() => dispatch(clearError())}>
              {error}
            </div>
          )}
          {successMessage && (
            <div className="success-message" onClick={() => dispatch(clearSuccessMessage())}>
              {successMessage}
            </div>
          )}

          {/*  Передан обязательный проп onUpload */}
          {(!userIdFromQuery || !isAdmin) && (
            <FileUpload onUpload={handleUploadSuccess} />
          )}

          {isAdmin && userIdFromQuery && (
            <div className="admin-controls">
              <button className="back-button" onClick={() => navigate('/admin')}>
                ← Вернуться к списку пользователей
              </button>
            </div>
          )}

          {/*  Передан обязательный проп isAdmin */}
          <FileList files={files} status={status} isAdmin={isAdmin} />
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  );
};

export default Dashboard;
