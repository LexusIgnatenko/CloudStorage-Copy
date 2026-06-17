import { getCsrfToken } from '../utils/auth';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navigation/Navbar';
import './AdminPanel.css';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUsers, deleteUser, setAdminStatus } from '../features/usersSlice';

const API_URL = `${import.meta.env.VITE_SERVER_URL}/api`;

const AdminPanel = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // Выбираем нужные данные из стора с помощью useSelector
    const { items: users, loading, error, successMessage, isAdmin } = useSelector((state) => state.users);

    // Проверка прав администратора при монтировании компонента
    useEffect(() => {
        const checkAdminAccess = async () => {
            try {
                const csrfToken = getCsrfToken();
                if (!csrfToken) throw new Error('Отсутствует CSRF токен. Пожалуйста, войдите снова.');

                const response = await fetch(`${API_URL}/profile/`, {
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
            } catch (error) {
                // В реальном приложении здесь можно диспатчить экшен для ошибки в сторе,
                // но для редиректа это не обязательно.
                setTimeout(() => navigate('/login'), 2000);
            }
        };

        checkAdminAccess();
        // Запускаем фетч пользователей только если мы подтвердили админские права,
        // чтобы не делать лишних запросов при редиректе.
        // Для простоты вызываем здесь. В продакшене лучше делать это после успешной проверки.
        dispatch(fetchUsers());
    }, []);

    const handleDeleteUser = (userId) => {
        if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) return;
        dispatch(deleteUser(userId));
    };

    if (isAdmin === false) {
        return <div>Доступ запрещен. Вы не являетесь администратором.</div>;
    };

    return (
        <>
            <Navbar />
            <div className="admin-panel-container">
                <h1>Панель администратора</h1>

                {successMessage && <div className="success-message">{successMessage}</div>}
                {error && <div className="error-message">{error}</div>}

                <h2>Список пользователей</h2>
                {loading ? (
                    <p>Загрузка...</p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Имя</th>
                                <th>Email</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td>{user.username}</td>
                                    <td>{user.email}</td>
                                    <td>
                                        <button onClick={() => handleDeleteUser(user.id)}>Удалить</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
};

export default AdminPanel;