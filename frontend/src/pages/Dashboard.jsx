import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FileList from '../components/FileStorage/FileList';
import FileUpload from '../components/FileStorage/FileUpload';
import Navbar from '../components/Navigation/Navbar';
import './Dashboard.css';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFiles, clearSuccessMessage, clearError } from '../features/fileStorage/fileStorageSlice';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();

  // Получаем данные из Redux-стора
  const { files, status, error, successMessage, isAdmin } = useSelector((state) => state.fileStorage);

  const userIdFromQuery = searchParams.get('user');

  useEffect(() => {
    if (userIdFromQuery) {
      dispatch(fetchFiles({ userId: userIdFromQuery }));
    } else {
      dispatch(fetchFiles());
    }
  }, [dispatch, userIdFromQuery]);

  // Очищаем сообщения об успехе/ошибке при их показе
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        dispatch(clearSuccessMessage());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, dispatch]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleLogout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_SERVER_URL}/api/logout/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      navigate('/login');
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  return (
    <div className="dashboard-container">
      <Navbar onLogout={handleLogout} />
      <div className="dashboard-content">
        <div className="main-content">
          <h2>Файловое хранилище</h2>

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

          {/* Не показываем форму загрузки, если админ просматривает чужие файлы */}
          {(!userIdFromQuery || !isAdmin) && <FileUpload />}

          {isAdmin && userIdFromQuery && (
            <div className="admin-controls">
              <button className="back-button" onClick={() => navigate('/admin')}>
                ← Вернуться к списку пользователей
              </button>
            </div>
          )}

          {/* Передаем статус загрузки для отображения индикатора */}
          <FileList files={files} status={status} />
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  );
};

export default Dashboard;