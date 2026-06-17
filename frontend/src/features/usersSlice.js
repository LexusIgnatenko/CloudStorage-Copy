import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getCsrfToken } from '../utils/auth';

const API_URL = `${import.meta.env.VITE_SERVER_URL}/api`;

// --- Асинхронные операции (Thunks) ---

export const fetchUsers = createAsyncThunk(
    'users/fetchUsers',
    async (_, { rejectWithValue }) => {
        const csrfToken = getCsrfToken();
        if (!csrfToken) {
            return rejectWithValue('Отсутствует CSRF токен');
        }

        try {
            const response = await fetch(`${API_URL}/users/`, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                },
            });

            if (!response.ok) {
                // Попытка получить детальное сообщение об ошибке от сервера
                let errorMessage = `Ошибка ${response.status}: Не удалось загрузить пользователей`;
                try {
                    const errorData = await response.json();
                    if (errorData.detail) {
                        errorMessage = errorData.detail;
                    }
                } catch (e) {
                    // Если JSON не пришел, используем статус-текст
                    errorMessage = response.statusText;
                }
                return rejectWithValue(errorMessage);
            }
            return await response.json();
        } catch (error) {
            // Обработка сетевых ошибок
            return rejectWithValue(error.message);
        }
    }
);

export const deleteUser = createAsyncThunk(
    'users/deleteUser',
    async (userId, { rejectWithValue }) => {
        const csrfToken = getCsrfToken();
        if (!csrfToken) {
            return rejectWithValue('Отсутствует CSRF токен');
        }

        try {
            const response = await fetch(`${API_URL}/users/${userId}/`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                },
            });

            if (!response.ok) {
                let errorMessage = `Ошибка ${response.status}: Не удалось удалить пользователя`;
                try {
                    const errorData = await response.json();
                    if (errorData.detail) {
                        errorMessage = errorData.detail;
                    }
                } catch (e) {
                    errorMessage = response.statusText;
                }
                return rejectWithValue(errorMessage);
            }
            return userId;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

// --- Создание слайса ---

const usersSlice = createSlice({
    name: 'users',
    initialState: {
        items: [],
        loading: false,
        error: null,
        successMessage: '',
        isAdmin: false,
    },
    reducers: {
        setSuccessMessage: (state, action) => {
            state.successMessage = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
        clearSuccessMessage: (state) => {
            state.successMessage = '';
        },
        setAdminStatus: (state, action) => {
            state.isAdmin = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch Users
            .addCase(fetchUsers.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.successMessage = ''; // Очистка при новом запросе
            })
            .addCase(fetchUsers.fulfilled, (state, action) => {
                state.items = action.payload;
                state.loading = false;
            })
            .addCase(fetchUsers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Неизвестная ошибка при загрузке пользователей';
            })

            // Delete User
            .addCase(deleteUser.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.successMessage = '';
            })
            .addCase(deleteUser.fulfilled, (state, action) => {
                state.loading = false;
                // Иммутабельное обновление массива
                state.items = state.items.filter(user => user.id !== action.payload);
                state.successMessage = 'Пользователь успешно удален.';
            })
            .addCase(deleteUser.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Неизвестная ошибка при удалении пользователя';
            });
    },
});

// --- Экспорт действий и редьюсера ---
export const { setSuccessMessage, clearError, clearSuccessMessage, setAdminStatus } = usersSlice.actions;
export default usersSlice.reducer;