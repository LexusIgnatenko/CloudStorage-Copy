import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// --- Асинхронные операции (Thunks) ---

export const checkAuthStatus = createAsyncThunk(
    'auth/checkAuthStatus',
    async (_, { rejectWithValue }) => {
        const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/profile/`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
            // Если пользователь авторизован, сервер вернет данные профиля
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
            const csrfToken = document.cookie
                .split('; ')
                .find((row) => row.startsWith('csrftoken='))
                ?.split('=')[1];

            if (!csrfToken) {
                throw new Error('CSRF token not found');
            }

            const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/logout/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                },
            });

            if (!response.ok) {
                throw new Error('Ошибка при выходе из системы');
            }
            return; // Успех
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const registerUser = createAsyncThunk(
    'auth/registerUser',
    async (userData, { rejectWithValue }) => {
        try {
            // Получение CSRF-токена 
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
    status: 'idle',
    error: '', 

    formData: {
        username: '',
        email: '',
        password: '',
        password_confirm: '',
    },
    validationErrors: {},
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setFormField: {
            reducer(state, action) {
                state.formData = action.payload.formData;
            },
            prepare(field, value) {
                return {
                    payload: {
                        formData: { [field]: value }
                    }
                };
            }
        },
        setValidationError: (state, action) => {
            const { field, message } = action.payload;
            state.validationErrors = { ...state.validationErrors, [field]: message };
        },
        clearValidationErrors: (state) => {
            state.validationErrors = {};
        },
        resetRegistrationForm: (state) => {
            state.formData = {
                username: '',
                email: '',
                password: '',
                password_confirm: '',
            };
            state.validationErrors = {};
        },
        updateAppError: (state, action) => {
            // Устанавливает общую ошибку приложения
            state.error = action.payload;
        },
        setLoading: (state, action) => {
            // Устанавливает статус загрузки
            state.status = action.payload ? 'loading' : 'idle';
        },
        setSubmitted: (state, action) => {
            // Флаг сабмита формы (если используется)
            state.isSubmitted = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(checkAuthStatus.pending, (state) => {
                state.status = 'loading';
                state.error = ''; // Очищаем ошибку при новой проверке
            })
            .addCase(checkAuthStatus.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.user = action.payload; // Будет либо объект пользователя, либо null
                state.isAuthenticated = !!action.payload;
            })
            .addCase(checkAuthStatus.rejected, (state, action) => {
                state.status = 'failed';
                state.error = typeof action.payload === 'string' ? action.payload : 'Неизвестная ошибка';
                state.user = null;
                state.isAuthenticated = false;
            })
            .addCase(logoutUser.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload || 'Ошибка при выходе из системы';
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.status = 'failed';
                if (typeof action.payload === 'object') {
                    state.validationErrors = action.payload;
                } else {
                    state.error = action.payload || 'Произошла ошибка при регистрации';
                }
            });
    },
});

export const {
    setFormField, setValidationError, clearValidationErrors, resetRegistrationForm,
    updateAppError, setLoading
} = authSlice.actions;

export default authSlice.reducer;
