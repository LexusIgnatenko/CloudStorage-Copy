import { getCsrfToken } from '../utils/auth';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navigation/Navbar';
import './AdminPanel.css';
import { useSelector, useDispatch } from 'react-redux';
// import { fetchUsers, deleteUser, setAdminStatus } from '../features/usersSlice';
import { fetchUsers, deleteUser, setAdminStatus, clearSuccessMessage, clearError } from '../features/usersSlice';

const AdminPanel = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // Добавляем локальный стейт для отслеживания процесса проверки прав,
    // чтобы избежать ложного срабатывания "Доступ запрещен" при первой загрузке
    const [isCheckingAccess, setIsCheckingAccess] = useState(true);
    const [accessError, setAccessError] = useState('');

    // Выбираем нужные данные из стора с помощью useSelector
    const { items: users, loading, error, successMessage, isAdmin } = useSelector((state) => state.users);

    // Проверка прав администратора при монтировании компонента
    useEffect(() => {
        const checkAdminAccess = async () => {
            try {
                const csrfToken = getCsrfToken();
                if (!csrfToken) throw new Error('Отсутствует CSRF токен. Пожалуйста, войдите снова.');

                // ИСПРАВЛЕНО: используем чистый URL, так как в API_URL уже есть префикс /api
                const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/profile/`, {
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
                });

                if (!response.ok) {
                    if (response.status === 403) throw new Error('Ошибка CSRF токена. Пожалуйста, обновите страницу.');
                    throw new Error('Требуется вход в систему');
                }

                const userData = await response.json();
                dispatch(setAdminStatus(userData.is_admin));

                if (!userData.is_admin) {
                    throw new Error('Доступ запрещен. Требуются права администратора.');
                }

                // Если проверка прошла успешно, только тогда запрашиваем список пользователей
                dispatch(fetchUsers());
                setIsCheckingAccess(false);

            } catch (err) {
                setAccessError(err.message);
                // Плавный редирект на логин при провале проверки
                setTimeout(() => navigate('/login'), 2000);
            }
        };

        checkAdminAccess();
    }, [dispatch, navigate]); // добавлены обязательные зависимости

    //  Таймер автоматического скрытия сообщения об успешном удалении
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => {
                dispatch(clearSuccessMessage());
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, dispatch]);

    //  Таймер автоматического скрытия сообщений об ошибках
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                dispatch(clearError());
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [error, dispatch]);

    const handleDeleteUser = (userId) => {
        if (!window.confirm('Вы уверены, что хотите удалить этого пользователя и все его файлы?')) return;
        dispatch(deleteUser(userId));
    };

    // Функция перенаправления на дашборд для просмотра чужих файлов
    const handleViewUserFiles = (userId) => {
        navigate(`/dashboard?user=${userId}`);
    };

    // Сначала обрабатываем стадию проверки прав
    if (isCheckingAccess) {
        return <div className="admin-loading-screen">{accessError ? accessError : 'Проверка прав администратора...'}</div>;
    }

    // Если проверка завершилась и пользователь точно не админ
    if (isAdmin === false) {
        return <div className="admin-denied-screen">Доступ запрещен. Вы не являетесь администратором. Редирект...</div>;
    }

    return (
        <>
            <Navbar />
            <div className="admin-panel-container">
                <h1>Панель администратора</h1>

                {/* Очистка кликом в качестве альтернативы */}
                {successMessage && (
                    <div className="success-message" onClick={() => dispatch(clearSuccessMessage())}>
                        {successMessage}
                    </div>
                )}
                {error && (
                    <div className="error-message" onClick={() => dispatch(clearError())}>
                        {error}
                    </div>
                )}

                <h2>Список пользователей</h2>
                {loading ? (
                    <p>Загрузка списка пользователей...</p>
                ) : (
                    <table className="admin-users-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Имя</th>
                                <th>Email</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users && users.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td>{user.username}</td>
                                    <td>{user.email}</td>
                                    <td>
                                        <div className="admin-action-buttons">
                                            <button onClick={() => handleViewUserFiles(user.id)} className="admin-btn view-files">
                                                Посмотреть файлы
                                            </button>
                                            <button onClick={() => handleDeleteUser(user.id)} className="admin-btn delete-user">
                                                Удалить
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {users && users.length === 0 && !loading && (
                    <p className="no-users">В системе нет зарегистрированных пользователей</p>
                )}
            </div>
        </>
    );
};

export default AdminPanel;

//             <div className="admin-panel-container">
//                 <h1>Панель администратора</h1>

//                 {successMessage && <div className="success-message">{successMessage}</div>}
//                 {error && <div className="error-message">{error}</div>}

//                 <h2>Список пользователей</h2>
//                 {loading ? (
//                     <p>Загрузка списка пользователей...</p>
//                 ) : (
//                     <table className="admin-users-table">
//                         <thead>
//                             <tr>
//                                 <th>ID</th>
//                                 <th>Имя</th>
//                                 <th>Email</th>
//                                 <th>Действия</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {users && users.map((user) => (
//                                 <tr key={user.id}>
//                                     <td>{user.id}</td>
//                                     <td>{user.username}</td>
//                                     <td>{user.email}</td>
//                                     <td>
//                                         <div className="admin-action-buttons">
//                                             {/* ДОБАВЛЕНО: Кнопка просмотра файлов пользователя, завязанная на query-параметры */}
//                                             <button
//                                                 onClick={() => handleViewUserFiles(user.id)}
//                                                 className="admin-btn view-files"
//                                             >
//                                                 Посмотреть файлы
//                                             </button>
//                                             <button
//                                                 onClick={() => handleDeleteUser(user.id)}
//                                                 className="admin-btn delete-user"
//                                             >
//                                                 Удалить
//                                             </button>
//                                         </div>
//                                     </td>
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </table>
//                 )}
//                 {users && users.length === 0 && !loading && (
//                     <p className="no-users">В системе нет зарегистрированных пользователей</p>
//                 )}
//             </div>
//         </>
//     );
// };

// export default AdminPanel;
