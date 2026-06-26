import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../../features/auth/authSlice';
import './Navbar.css';
import { createSelector } from '@reduxjs/toolkit';

const selectAuthState = (state) => state.auth;
const selectUserData = createSelector(
  [selectAuthState],
  (auth) => auth.user
);

// Вспомогательная функция для форматирования размера памяти
const formatStorageSize = (bytes) => {
  if (bytes === undefined || bytes === null || bytes === 0) return '0 МБ';
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  // По умолчанию для диска красивее выводить в МБ или ГБ, 
  // но функция автоматически выберет лучший вариант:
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector(selectUserData);
  const isAuthenticated = !!user;
  const isAdmin = user?.is_admin || false;
  const username = isAuthenticated ? user.username : '';

  // Извлекаем данные о хранилище из объекта пользователя.
  // Замените имена свойств (used_space, storage_limit), если в вашей Django-модели они называются иначе!
  const usedSpace = user?.used_space || 0;
  const totalSpace = user?.storage_limit || 100 * 1024 * 1024; // По умолчанию 100 МБ, если бэкенд не прислал лимит

  // Вычисляем процент заполненности диска для Progress Bar
  const storagePercentage = Math.min(
    totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0,
    100 // Ограничиваем сверху 100%, чтобы полоса не вылезла за границы шкалы
  );

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Файловое хранилище</Link>
      </div>

      {/* Индикатор диска отображается только для авторизованных пользователей */}
      {isAuthenticated && (
        <div className="navbar-storage">
          <div className="storage-text">
            <span>Диск: {formatStorageSize(usedSpace)} из {formatStorageSize(totalSpace)}</span>
          </div>
          <div className="storage-progressbar-container">
            <div
              className={`storage-progressbar-fill ${storagePercentage > 90 ? 'danger' : storagePercentage > 75 ? 'warning' : ''}`}
              style={{ width: `${storagePercentage}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="navbar-menu">
        {isAuthenticated ? (
          <>
            <span className="nav-username">Привет, {username}</span>
            <Link to="/dashboard" className="nav-link">Хранилище</Link>
            {isAdmin && (
              <Link to="/admin" className="nav-link admin">Управление пользователями</Link>
            )}
            <button onClick={handleLogout} className="nav-button">Выход</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Вход</Link>
            <Link to="/register" className="nav-link">Регистрация</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
