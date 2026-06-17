import React from "react";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../features/auth/authSlice"; // Импортируем экшн выхода

const Buttons = () => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  const dispatch = useDispatch();

  const handleLogout = () => {
    // При нажатии на "Выход" вызываем экшн logout
    dispatch(logout());
  };

  return (
    <div className="auth-buttons">
      {isAuthenticated ? (
        <>
          {/* Если пользователь авторизован, показываем кнопку выхода */}
          <button onClick={handleLogout} className="btn btn-logout">Выход</button>
          <Link to="/file-manager" className="btn btn-file-manager">Файловый менеджер</Link>
        </>
      ) : (
        <>
          {/* Если не авторизован - стандартные кнопки */}
          <Link to="/register" className="btn btn-register">Регистрация</Link>
          <Link to="/login" className="btn btn-login">Вход</Link>
        </>
      )}
    </div>
  );
};

export default AuthButtons;
