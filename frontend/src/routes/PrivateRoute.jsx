// CloudStorage\frontend\src\routes\PrivateRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const PrivateRoute = () => {
    // Получаем статус аутентификации из Redux-стора
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

    // Если пользователь авторизован, рендерим дочерние компоненты (Outlet)
    // Если нет - перенаправляем на страницу логина
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;