import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux"; // ДОБАВЛЕНО для связи с Redux
import { checkAuthStatus } from "../features/auth/authSlice"; // ДОБАВЛЕНО для обновления статуса
import './Login.css';
import './auth.css';

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch(); // Инициализируем dispatch

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  // Валидаторы (оставляем без изменений)
  const validateUsername = (value) => {
    if (!/^[a-zA-Z][a-zA-Z0-9]{3,19}$/.test(value)) {
      return 'Логин должен содержать от 4 до 20 символов, начинаться с буквы и содержать только латинские буквы и цифры.';
    }
    return '';
  };

  const validatePassword = (value) => {
    if (value.length < 6) {
      return 'Пароль должен содержать не менее 6 символов.';
    }
    if (!/[A-Z]/.test(value)) {
      return 'Пароль должен содержать хотя бы одну заглавную букву.';
    }
    if (!/\d/.test(value)) {
      return 'Пароль должен содержать хотя бы одну цифру.';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
      return 'Пароль должен содержать хотя бы один специальный символ (!@#$%^&*(),.?":{}|<>).';
    }
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    switch (name) {
      case 'username':
        setValidationErrors(prev => ({ ...prev, username: validateUsername(value) }));
        break;
      case 'password':
        setValidationErrors(prev => ({ ...prev, password: validatePassword(value) }));
        break;
      default:
        break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Фронтенд-проверка перед отправкой
    const usernameErr = validateUsername(formData.username);
    const passwordErr = validatePassword(formData.password);
    if (usernameErr || passwordErr) {
      setValidationErrors({ username: usernameErr, password: passwordErr });
      return;
    }

    setLoading(true); // Включаем индикатор загрузки
    setServerError(''); // Очищаем старые ошибки бэкенда

    try {
      // 1. Делаем пустой GET запрос, чтобы Django сгенерировал и прислал CSRF-куку
      await fetch(`${import.meta.env.VITE_SERVER_URL}/api/login/`, {
        method: 'GET',
        credentials: 'include'
      });

      // 2. Достаем полученный CSRF-токен из куки браузера
      const cookies = document.cookie.split('; ');
      const csrfCookie = cookies.find(row => row.startsWith('csrftoken='));
      const csrfToken = csrfCookie ? csrfCookie.split('=')[1] : null;

      if (!csrfToken) {
        console.error("Куки в браузере сейчас:", document.cookie);
        throw new Error('CSRF-токен не найден. Проверьте настройки CORS.');
      }

      // 3. Отправляем фактический POST запрос с данными для входа
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/login/`, {
        method: 'POST',
        credentials: 'include', // Передаем и сохраняем сессионные куки
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify(formData) // Передаем плоский чистый JSON
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Успешный вход!", data);

        // 4. Оповещаем Redux-стор, чтобы он перезапросил профиль и выставил isAuthenticated = true
        await dispatch(checkAuthStatus());

        // Перенаправляем пользователя на главную страницу (или в личный кабинет)
        navigate('/');
      } else {
        console.error("Детали ошибки от Django:", data);
        // Обрабатываем стандартную ошибку DRF (non_field_errors)
        if (data.non_field_errors) {
          setServerError(data.non_field_errors[0]);
        } else if (data.error) {
          setServerError(data.error);
        } else if (typeof data === 'object') {
          setValidationErrors(prev => ({
            ...prev,
            username: Array.isArray(data.username) ? data.username[0] : data.username,
            password: Array.isArray(data.password) ? data.password[0] : data.password,
          }));
        } else {
          setServerError('Не удалось войти в систему. Проверьте данные.');
        }
      }

    } catch (error) {
      console.error("Ошибка входа:", error.message);
      setServerError(`Произошла ошибка при подключении к серверу: ${error.message}`);
    } finally {
      setLoading(false); // Выключаем индикатор загрузки в любом случае
    }
  };

  return (
    <div className="login-container">
      <h2>Вход в систему</h2>
      {serverError && (
        <div className="error-message general-error">
          {serverError}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Логин:</label>
          <input
            type="text"
            id="username"
            name="username"
            autoComplete="username"
            value={formData.username}
            onChange={handleChange}
            className={validationErrors.username ? "error-input" : ""}
            required
          />
          {validationErrors.username && (
            <div className="error-message">{validationErrors.username}</div>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="password">Пароль:</label>
          <input
            type="password"
            id="password"
            name="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            className={validationErrors.password ? "error-input" : ""}
            required
          />
          {validationErrors.password && (
            <div className="error-message">{validationErrors.password}</div>
          )}
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
        <div className="auth-links">
          <p>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
        </div>
      </form>
      <Link to="/" className="back-button">
        <span className="back-arrow">←</span> На главную
      </Link>
    </div>
  );
};

export default Login;




// import React, { useState, useEffect } from "react";
// import { useNavigate, Link } from "react-router-dom";
// import './Login.css';
// import './auth.css';

// const Login = () => {
//   const navigate = useNavigate();
//   const [formData, setFormData] = useState({
//     username: '',
//     password: ''
//   });
//   const [validationErrors, setValidationErrors] = useState({});
//   const [serverError, setServerError] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [csrfToken, setCsrfToken] = useState('');

//   // Валидаторы
//   const validateUsername = (value) => {
//     if (!/^[a-zA-Z][a-zA-Z0-9]{3,19}$/.test(value)) {
//       return 'Логин должен содержать от 4 до 20 символов, начинаться с буквы и содержать только латинские буквы и цифры.';
//     }
//     return '';
//   };

//   const validatePassword = (value) => {
//     if (value.length < 6) {
//       return 'Пароль должен содержать не менее 6 символов.';
//     }
//     if (!/[A-Z]/.test(value)) {
//       return 'Пароль должен содержать хотя бы одну заглавную букву.';
//     }
//     if (!/\d/.test(value)) {
//       return 'Пароль должен содержать хотя бы одну цифру.';
//     }
//     if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
//       return 'Пароль должен содержать хотя бы один специальный символ (!@#$%^&*(),.?":{}|<>).';
//     }
//     return '';
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: value
//     }));

//     // Проверка валидатора для соответствующего поля
//     switch (name) {
//       case 'username':
//         setValidationErrors(prev => ({ ...prev, username: validateUsername(value) }));
//         break;
//       case 'password':
//         setValidationErrors(prev => ({ ...prev, password: validatePassword(value) }));
//         break;
//       default:
//         break;
//     }
//   };
  
//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     try {
//       // 1. Делаем пустой GET запрос, чтобы Django сгенерировал и прислал CSRF-куку
//       await fetch(`${import.meta.env.VITE_SERVER_URL}/api/login/`, {
//         method: 'GET',
//         credentials: 'include' // ВАЖНО: разрешает принимать куки
//       });

//       // 2. Достаем полученный CSRF-токен из куки браузера
//       const cookies = document.cookie.split('; ');
//       const csrfCookie = cookies.find(row => row.startsWith('csrftoken='));
//       const csrfToken = csrfCookie ? csrfCookie.split('=')[1] : null;

//       if (!csrfToken) {
//         console.error("Куки в браузере сейчас:", document.cookie);
//         throw new Error('CSRF-токен не найден. Проверьте настройки CORS.');
//       }

//       // 3. Отправляем фактический POST запрос с данными для входа
//       const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/login/`, {
//         method: 'POST',
//         credentials: 'include', // ВАЖНО: отправляет куки обратно на сервер
//         headers: {
//           'Content-Type': 'application/json',
//           'X-CSRFToken': csrfToken // Передаем токен в заголовке
//         },
//         body: JSON.stringify(formData) // или ваши переменные { username, password }
//       });

//       console.log("--- ОТВЕТ ОТ СЕРВЕРА ---");
//       console.log("Статус:", response.status);

//       const data = await response.json();
//       if (response.ok) {
//         // Логика успешного входа (например, navigate('/dashboard'))
//       } else {
//         // Обработка ошибок валидации
//       }

//     } catch (error) {
//       console.error("Ошибка входа:", error.message);
//     }
//   };

//   // Функция для получения значения cookie по имени
//   const getCookie = (name) => {
//     const value = `; ${document.cookie}`;
//     const parts = value.split(`; ${name}=`);
//     if (parts.length === 2) return parts.pop().split(';').shift();
//     return null;
//   };

//   return (
//     <div className="login-container">
//       <h2>Вход в систему</h2>
//       {serverError && (
//         <div className="error-message general-error">
//           {serverError}
//         </div>
//       )}
//       <form onSubmit={handleSubmit}>
//         <div className="form-group">
//           <label htmlFor="username">Логин:</label>
//           <input
//             type="text"
//             id="username"
//             name="username"
//             autoComplete="username"
//             value={formData.username}
//             onChange={handleChange}
//             className={validationErrors.username ? "error-input" : ""}
//             required
//           />
//           {validationErrors.username && (
//             <div className="error-message">{validationErrors.username}</div>
//           )}
//         </div>
//         <div className="form-group">
//           <label htmlFor="password">Пароль:</label>
//           <input
//             type="password"
//             id="password"
//             name="password"
//             autoComplete="current-password"
//             value={formData.password}
//             onChange={handleChange}
//             className={validationErrors.password ? "error-input" : ""}
//             required
//           />
//           {validationErrors.password && (
//             <div className="error-message">{validationErrors.password}</div>
//           )}
//         </div>
//         <button type="submit" disabled={loading}>
//           {loading ? 'Вход...' : 'Войти'}
//         </button>
//         <div className="auth-links">
//           <p>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
//         </div>
//       </form>
//       <Link to="/" className="back-button">
//         <span className="back-arrow">←</span> На главную
//       </Link>
//     </div>
//   );
// };

// export default Login;
  

// import React, { useState } from "react";
// import { useNavigate, Link } from "react-router-dom";
// import axios from 'axios';


// const Login = () => {
//   const navigate = useNavigate();

//   // Состояние для данных формы
//   const [formData, setFormData] = useState({
//     username: '',
//     password: ''
//   });

//   // Состояние для отображения ошибок сервера
//   const [serverError, setServerError] = useState('');
//   const [loading, setLoading] = useState(false);

//   // Обработчик изменения полей ввода
//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({
//       ...prev,
//       [name]: value
//     }));
//   };
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setServerError('');
//     setLoading(true);

//     try {
//       const response = await axios.post(`${import.meta.env.VITE_SERVER_URL}/api/login/`, formData, {
//         withCredentials: true,
//         headers: {
//           'Content-Type': 'application/json'
//         }
//       });

//       if (response.status >= 200 && response.status < 300) {
//         navigate('/dashboard');
//       }

//     } catch (error) {
//       // Обрабатываем только ошибки от сервера (например, неверный пароль)
//       if (error.response) {
//         // Если сервер вернул объект с полем 'error'
//         if (error.response.data && error.response.data.error) {
//           setServerError(error.response.data.error);
//         } else {
//           setServerError('Неверное имя пользователя или пароль.');
//         }
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="login-container">
//       <h2>Вход в систему</h2>
//       {/* Отображаем ошибку, если она есть */}
//       {serverError && (
//         <div className="error-message general-error">
//           {serverError}
//         </div>
//       )}
//       <form onSubmit={handleSubmit}>
//         <div className="form-group">
//           <label htmlFor="username">Логин:</label>
//           <input
//             type="text"
//             id="username"
//             name="username"
//             value={formData.username}
//             onChange={handleChange}
//             required
//           />
//         </div>
//         <div className="form-group">
//           <label htmlFor="password">Пароль:</label>
//           <input
//             type="password"
//             id="password"
//             name="password"
//             value={formData.password}
//             onChange={handleChange}
//             required
//           />
//         </div>
//         <button type="submit" disabled={loading}>
//           {loading ? 'Вход...' : 'Войти'}
//         </button>
//         <div className="auth-links">
//           <p>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
//         </div>
//       </form>
//       <Link to="/" className="back-button">
//         <span className="back-arrow">←</span> На главную
//       </Link>
//     </div>
//   );
// };

// export default Login;
