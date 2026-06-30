import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { setFormField, updateAppError, registerUser, resetRegistrationForm, clearAuthErrors } from "../features/auth/authSlice";
import './Register.css';
import './auth.css';

// Валидаторы (остаются без изменений)
const validateUsername = (value) => {
  if (!/^[a-zA-Z][a-zA-Z0-9]{3,19}$/.test(value)) {
    return "Логин должен содержать от 4 до 20 символов, начинаться с буквы и содержать только латинские буквы и цифры.";
  }
  return null;
};

const validatePassword = (value) => {
  let errors = [];
  if (value.length < 6) errors.push("Пароль должен содержать не менее 6 символов.");
  if (!/[A-Z]/.test(value)) errors.push("Пароль должен содержать хотя бы одну заглавную букву.");
  if (!/\d/.test(value)) errors.push("Пароль должен содержать хотя бы одну цифру.");
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) errors.push("Пароль должен содержать хотя бы один специальный символ.");
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

  // Извлекаем правильные поля состояния из Redux
  const formData = useSelector((state) => state.auth.formData);
  const validationErrors = useSelector((state) => state.auth.validationErrors);
  const generalError = useSelector((state) => state.auth.error);
  const loading = useSelector((state) => state.auth.loading);

  //  ДОБАВЛЕНО: Очистка ошибок при монтировании компонента.
  // Теперь при каждом открытии страницы /register старые ложные ошибки будут стираться
  useEffect(() => {
    dispatch(clearAuthErrors());
  }, [dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    dispatch(setFormField({ name, value }));

    let validationError = null;
    switch (name) {
      case 'username': validationError = validateUsername(value); break;
      case 'email': validationError = validateEmail(value); break;
      case 'password': validationError = validatePassword(value); break;
      case 'password_confirm':
        validationError = value !== formData.password ? "Пароли не совпадают." : null;
        break;
      default: break;
    }

    dispatch(updateAppError({ field: name, message: validationError }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const usernameErr = validateUsername(formData.username);
    const emailErr = validateEmail(formData.email);
    const passwordErr = validatePassword(formData.password);
    const passConfirmErr = formData.password !== formData.password_confirm ? "Пароли не совпадают." : null;

    if (usernameErr || emailErr || passwordErr || passConfirmErr) {
      dispatch(updateAppError({ field: 'username', message: usernameErr }));
      dispatch(updateAppError({ field: 'email', message: emailErr }));
      dispatch(updateAppError({ field: 'password', message: passwordErr }));
      dispatch(updateAppError({ field: 'password_confirm', message: passConfirmErr }));
      return;
    }

    const resultAction = await dispatch(registerUser(formData));

    if (registerUser.fulfilled.match(resultAction)) {
      dispatch(resetRegistrationForm());
      navigate('/login');
    }
  };

  const getFieldError = (field) => {
    // Если объекта ошибок вообще нет или в нём нет этого поля — сразу возвращаем null
    if (!validationErrors || !validationErrors[field]) {
      return null;
    }

    const err = validationErrors[field];

    // Если сервер прислал ошибку в виде массива строк (стандарт DRF)
    if (Array.isArray(err)) {
      return err[0] || null;
    }

    // Если это обычная строка
    return err || null;
  };

  return (
    <div className="register-container">
      <h2>Регистрация</h2>
      {typeof generalError === 'string' && generalError.trim() !== '' && (
        <div className="error-message general-error">
          {generalError}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Логин:</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username || ''}
            onChange={handleChange}
            className={getFieldError('username') ? "error-input" : ""}
            required
          />
          {getFieldError('username') && (
            <div className="error-message">{getFieldError('username')}</div>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email || ''}
            onChange={handleChange}
            className={getFieldError('email') ? "error-input" : ""}
            required
          />
          {getFieldError('email') && (
            <div className="error-message">{getFieldError('email')}</div>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="password">Пароль:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password || ''}
            onChange={handleChange}
            className={getFieldError('password') ? "error-input" : ""}
            required
          />
          {getFieldError('password') && (
            <div className="error-message">{getFieldError('password')}</div>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="password_confirm">Подтверждение пароля:</label>
          <input
            type="password"
            id="password_confirm"
            name="password_confirm"
            value={formData.password_confirm || ''}
            onChange={handleChange}
            className={getFieldError('password_confirm') ? "error-input" : ""}
            required
          />
          {getFieldError('password_confirm') && (
            <div className="error-message">{getFieldError('password_confirm')}</div>
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
