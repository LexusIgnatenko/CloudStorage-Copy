import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// --- Асинхронные операции (Thunks) ---

export const checkAuthStatus = createAsyncThunk(
    'auth/checkAuthStatus',
    async (_, { rejectWithValue }) => {
        const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/profile/`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
            return await response.json();
        } else {
            return null;
        }
    }
);

export const logoutUser = createAsyncThunk(
    'auth/logoutUser',
    async (_, { rejectWithValue }) => {
        try {
            // 1. Извлекаем все куки браузера
            const cookies = document.cookie.split('; ');
            
            // 2. Ищем куку, которая начинается с "csrftoken="
            const csrfCookie = cookies.find((row) => row.startsWith('csrftoken='));
            
            // 3. Забираем значение токена (после знака "=")
            const csrfToken = csrfCookie ? csrfCookie.split('=')[1] : null;

            // Если пользователь долго сидел на сайте и кука удалилась, выбрасываем ошибку
            if (!csrfToken) {
                throw new Error('CSRF-токен не найден. Пожалуйста, обновите страницу.');
            }

            // 4. Отправляем POST-запрос с токеном в заголовках
            const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/logout/`, {
                method: 'POST',
                credentials: 'include', // Обязательно: передает сессионную куку Django (sessionid)
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken, // <-- ПЕРЕДАЕМ ТОКЕН ЗДЕСЬ
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Ошибка при выходе из системы');
            }
            
            return; // Успешное выполнение
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const registerUser = createAsyncThunk(
    'auth/registerUser',
    async (userData, { rejectWithValue }) => {
        try {
            const csrfResponse = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/register/`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!csrfResponse.ok) {
                return rejectWithValue('Не удалось получить CSRF-токен');
            }

            const csrfToken = document.cookie.split('; ')
                .find(row => row.startsWith('csrftoken='))
                ?.split('=')[1];

            if (!csrfToken) {
                return rejectWithValue('CSRF token not found');
            }

            const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/register/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                },
                body: JSON.stringify(userData),
            });

            const data = await response.json();

            if (response.ok) {
                return data;
            } else {
                // Сервер возвращает ошибки валидации полей, например { username: ["Этот логин занят"] }
                return rejectWithValue(data);
            }
        } catch (error) {
            return rejectWithValue('Ошибка подключения к серверу');
        }
    }
);

// --- Срез состояния (Slice) ---

const initialState = {
    user: null,
    isAuthenticated: false,
    loading: false, // Булевое значение для простой проверки в компонентах
    error: '',       // Общая ошибка (например, ошибка сети)

    formData: {
        username: '',
        email: '',
        password: '',
        password_confirm: '',
    },
    validationErrors: {}, // Ошибки конкретных полей
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setFormField: (state, action) => {
            const { name, value } = action.payload;
            state.formData[name] = value;
        },
        updateAppError: (state, action) => {
            const { field, message } = action.payload;
            if (field === 'general') {
                state.error = message || '';
            } else {
                state.validationErrors[field] = message;
            }
        },
        resetRegistrationForm: (state) => {
            state.formData = {
                username: '',
                email: '',
                password: '',
                password_confirm: '',
            };
            state.validationErrors = {};
            state.error = '';
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(checkAuthStatus.pending, (state) => {
                state.loading = true;
                state.error = '';
            })
            .addCase(checkAuthStatus.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
                state.isAuthenticated = !!action.payload;
            })
            .addCase(checkAuthStatus.rejected, (state, action) => {
                state.loading = false;
                state.error = typeof action.payload === 'string' ? action.payload : 'Неизвестная ошибка';
                state.user = null;
                state.isAuthenticated = false;
            })
            .addCase(logoutUser.rejected, (state, action) => {
                state.error = action.payload || 'Ошибка при выходе из системы';
            })
            // Обработка отправки формы регистрации через Thunk
            .addCase(registerUser.pending, (state) => {
                state.loading = true;
                state.validationErrors = {};
                state.error = '';
            })
            .addCase(registerUser.fulfilled, (state) => {
                state.loading = false;
                // Очищаем форму
                state.formData = { username: '', email: '', password: '', password_confirm: '' };
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.loading = false;
                if (typeof action.payload === 'object') {
                    // Если сервер прислал ошибки полей
                    state.validationErrors = action.payload;
                } else {
                    // Если произошла общая ошибка сети/сервера
                    state.error = action.payload || 'Произошла ошибка при регистрации';
                }
            });
    },
});

export const {
    setFormField,
    updateAppError,
    resetRegistrationForm,
    setLoading
} = authSlice.actions;

export default authSlice.reducer;
