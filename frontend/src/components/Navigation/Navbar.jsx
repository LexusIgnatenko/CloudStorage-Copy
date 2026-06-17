import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../../features/auth/authSlice';
import './Navbar.css';
import { createSelector } from '@reduxjs/toolkit'; // Для оптимизации селектора

// Оптимизированный селектор для получения данных пользователя
const selectAuthState = (state) => state.auth;
const selectUserData = createSelector(
  [selectAuthState],
  (auth) => auth.user
);

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector(selectUserData);
  const isAuthenticated = !!user;
  const isAdmin = user?.is_admin || false;
  const username = isAuthenticated ? user.username : '';

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Файловое хранилище</Link>
      </div>
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