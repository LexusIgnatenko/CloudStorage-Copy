import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import './Login.css';
import './auth.css';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');

  // Валидаторы
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


  // Получаем CSRF-токен при загрузке компонента
  // useEffect(() => {
  //   const fetchCsrfToken = async () => {
  //     try {
  //       await fetch(`${import.meta.env.VITE_SERVER_URL}/api/login/`, {
  //         method: 'GET',
  //         credentials: 'include',
  //       });
  //       const token = getCookie('csrftoken');
  //       setCsrfToken(token);
  //     } catch (err) {
  //       console.error('Ошибка при получении CSRF-токена:', err);
  //     }
  //   };
    
  //   fetchCsrfToken();
  // }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Проверка валидатора для соответствующего поля
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
    setValidationErrors({});
    setServerError('');
    setLoading(true);

    try {
      // // Получаем актуальный CSRF-токен из кук
      // const currentToken = getCookie('csrftoken');
      
      // if (!currentToken) {
      //   throw new Error('CSRF-токен не найден. Пожалуйста, обновите страницу.');
      // }

      // console.log('Используемый CSRF-токен:', currentToken);
      
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/login/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        // Если статус ответа 2xx, парсим JSON
        const data = await response.json();
        // Предполагаем, что при успешном входе сервер вернет { success: true } или токен
        navigate('/dashboard');
      } else {
        // --- ИСПРАВЛЕННЫЙ БЛОК ДЛЯ ОТЛАДКИ ---
        // Читаем ответ только один раз, как текст
        const responseText = await response.text();

        // Выводим в консоль ВСЕ, что вернул сервер. Это ключ к решению!
        console.error("--- ОТВЕТ ОТ СЕРВЕРА ---");
        console.error("Статус:", response.status);
        console.error("Текст ответа:", responseText);
        console.error("--- КОНЕЦ ОТВЕТА ---");

        // Пытаемся распарсить текст как JSON, если это возможно
        try {
          const errorData = JSON.parse(responseText);
          setServerError(errorData.error || 'Ошибка при входе');
        } catch (jsonError) {
          // Если это не JSON (например, HTML-страница с ошибкой Django), показываем общий текст
          if (response.status === 500) {
            setServerError('Внутренняя ошибка сервера (500). Смотрите консоль для деталей.');
          } else {
            setServerError('Неизвестная ошибка. Смотрите консоль для деталей.');
          }
        }
        // // Читаем ответ только один раз, как текст
        // const responseText = await response.text();
        // try {
        //   // Пытаемся распарсить полученный текст как JSON
        //   const errorData = JSON.parse(responseText);
        //   setServerError(errorData.error || 'Ошибка при входе');
        // } catch (jsonError) {
        //   // Если распарсить не удалось, значит, сервер вернул не JSON (например, HTML-страницу с ошибкой 500)
        //   console.error("Не удалось распарсить ответ от сервера как JSON:", jsonError);
        //   console.error("Ответ от сервера:", responseText); // Выводим текст ответа для отладки
        //   // Проверим, не является ли это ошибкой 500
        //   if (response.status === 500) {
        //     setServerError('Произошла внутренняя ошибка сервера. Проверьте, запущен ли бэкенд.');
        //   } else {
        //     setServerError('Неизвестная ошибка при входе. Проверьте консоль разработчика.');
        //   }
        //   // Очень полезно для отладки: посмотреть, что именно вернул сервер
        //   const text = await response.text(); // Читаем ответ как обычный текст
        //   console.error("Ответ от сервера:", text);
        // }
      }
    } catch (error) {
      // Этот блок catch сработает, если вообще не удалось отправить запрос
      // (например, нет связи с сервером)
      console.error('Ошибка при входе:', error);
      setServerError(error.message || 'Произошла ошибка при подключении к серверу');
    } finally {
      setLoading(false);
    }
  };

  // Функция для получения значения cookie по имени
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
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
