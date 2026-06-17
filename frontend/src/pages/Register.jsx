import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { setFormField, updateAppError, setLoading } from "../features/auth/authSlice";
import './Register.css';
import './auth.css';

// Валидаторы
const validateUsername = (value) => {
  if (!/^[a-zA-Z][a-zA-Z0-9]{3,19}$/.test(value)) {
    return "Логин должен содержать от 4 до 20 символов, начинаться с буквы и содержать только латинские буквы и цифры.";
  }
  return null;
};

const validatePassword = (value) => {
  let errors = [];

  if (value.length < 6) {
    errors.push("Пароль должен содержать не менее 6 символов.");
  }

  if (!/[A-Z]/.test(value)) {
    errors.push("Пароль должен содержать хотя бы одну заглавную букву.");
  }

  if (!/\d/.test(value)) {
    errors.push("Пароль должен содержать хотя бы одну цифру.");
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
    errors.push("Пароль должен содержать хотя бы один специальный символ (!@#$%^&*(),.?\":{}|<>).");
  }

  return errors.length > 0 ? errors.join("\n") : null;
};

const validateEmail = (value) => {
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
    return "Введите корректный email адрес.";
  }
  return null;
};

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Извлекаем состояние из Redux
  // const { formData, errors, loading } = useSelector((state) => state.auth);
  const authState = useSelector((state) => state.auth);
  const formData = authState.formData ?? {};
  const errors = authState.errors ?? {};
  const loading = authState.loading;


  const handleChange = (e) => {
    const { name, value } = e.target;
    dispatch(setFormField({ name, value }));

    let validationError = null;
    switch (name) {
      case 'username':
        validationError = validateUsername(value);
        break;
      case 'email':
        validationError = validateEmail(value);
        break;
      case 'password':
        validationError = validatePassword(value);
        break;
      case 'password_confirm':
        validationError = value !== formData.password ? "Пароли не совпадают." : null;
        break;
      default:
        break;
    }
    if (validationError !== null) {
      dispatch(updateAppError({ field: name, message: validationError }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Финальная валидация перед отправкой
    const usernameErr = validateUsername(formData.username);
    const emailErr = validateEmail(formData.email);
    const passwordErr = validatePassword(formData.password);
    const passConfirmErr = formData.password !== formData.password_confirm ?
      "Пароли не совпадают." :
      null;

    if (usernameErr || emailErr || passwordErr || passConfirmErr) {
      dispatch(updateAppError({ field: 'username', message: usernameErr }));
      dispatch(updateAppError({ field: 'email', message: emailErr }));
      dispatch(updateAppError({ field: 'password', message: passwordErr }));
      dispatch(updateAppError({ field: 'password_confirm', message: passConfirmErr }));
      return;
    }

    dispatch(setLoading(true));

    try {
      // Сначала получаем CSRF-токен, делая GET-запрос
      const csrfResponse = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/register/`, {
        method: 'GET',
        credentials: 'include'
      });

      // Получаем CSRF-токен из кукиc
      const csrfToken = document.cookie.split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      if (!csrfToken) {
        throw new Error('Не удалось получить CSRF-токен');
      }

      // Отправляем запрос на регистрацию с CSRF-токеном
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/register/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        dispatch(resetForm()); // Сброс формы после успешной регистрации
        navigate('/login');
      } else {
        // Обработка ошибок от сервера
        if (data && typeof data === 'object') {
          // Сначала очищаем все ошибки, которые могли остаться от валидации
          ['username', 'email', 'password', 'password_confirm'].forEach(field =>
            dispatch(updateAppError({ field, message: null }))
          );
          // Устанавливаем новые ошибки, полученные от сервера
          Object.keys(data).forEach(key => {
            const msg = Array.isArray(data[key]) ? data[key][0] : data[key];
            dispatch(updateAppError({ field: key, message: msg }));
          });
        }
      }
    } catch (error) {
      dispatch(updateAppError({ field: 'general', message: `Произошла ошибка при подключении к серверу: ${error.message}` }));
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="register-container">
      <h2>Регистрация</h2>
      {errors?.general && (
        <div className="error-message general-error">
          {errors.general}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Логин:</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className={errors.username ? "error-input" : ""}
            required
          />
          {errors.username && (
            <div className="error-message">{errors.username}</div>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? "error-input" : ""}
            required
          />
          {errors.email && (
            <div className="error-message">{errors.email}</div>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="password">Пароль:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={errors.password ? "error-input" : ""}
            required
          />
          {errors.password && (
            <div className="error-message">{errors.password}</div>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="password_confirm">Подтверждение пароля:</label>
          <input
            type="password"
            id="password_confirm"
            name="password_confirm"
            value={formData.password_confirm}
            onChange={handleChange}
            className={errors.password_confirm ? "error-input" : ""}
            required
          />
          {errors.password_confirm && (
            <div className="error-message">{errors.password_confirm}</div>
          )}
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Регистрация..." : "Зарегистрироваться"}
        </button>
        <div className="auth-links">
          <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
        </div>
      </form>
      <Link to="/" className="back-button">
        <span className="back-arrow">←</span> На главную
      </Link>
    </div>
  );
};

export default Register;
