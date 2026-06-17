import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { checkAuthStatus } from '../features/auth/authSlice'; // Импортируем наш thunk
import './Home.css';

const Home = () => {
  const dispatch = useDispatch();

  // Извлекаем состояние из Redux-хранилища
  const { isAuthenticated, isAdmin, status } = useSelector((state) => state.auth);

  // Проверяем авторизацию при монтировании компонента
  useEffect(() => {
    if (status === 'idle') {
      dispatch(checkAuthStatus());
    }
  }, [dispatch, status]);

  // Показываем лоадер во время проверки статуса
  if (status === 'loading') {
    return <div>Проверка статуса...</div>;
  }

  return (
    <div className="home-container">
      <div className="home-content">
        <h1>Добро пожаловать в Cloud Storage</h1>
        <p className="home-description">
          Безопасное хранение и управление вашими файлами в облаке
        </p>
        <div className="home-buttons">
        {!isAuthenticated ? (
          <>
            <Link to="/login" className="home-button primary">Войти</Link>
            <Link to="/register" className="home-button secondary">Регистрация</Link>
          </>
        ) : (
          <>
            <Link to="/dashboard" className="home-button primary">Перейти в хранилище</Link>
            {isAdmin && (
              <Link to="/admin" className="home-button secondary">Панель администратора</Link>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default Home;