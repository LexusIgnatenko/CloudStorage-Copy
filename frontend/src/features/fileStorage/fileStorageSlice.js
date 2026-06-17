import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';


const API_URL = `${import.meta.env.VITE_SERVER_URL}/api`;

// Вспомогательные функции
const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
};

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'X-CSRFToken': getCookie('csrftoken'),
});

// Асинхронные операции (thunks)
export const fetchFiles = createAsyncThunk(
    'files/fetchFiles',
    async ({ userId }, { rejectWithValue }) => {
        try {
            let url = `${API_URL}/files/`;
            if (userId !== undefined) {
                url += `?user_id=${userId}`;
            }
            const response = await fetch(url, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
            });

            if (!response.ok) {
                throw new Error('Ошибка при загрузке файлов');
            }
            return await response.json();
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const uploadFile = createAsyncThunk(
    'files/uploadFile',
    async ({ file, comment }, { rejectWithValue, dispatch }) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('comment', comment);

            const csrfToken = getCookie('csrftoken');

            const response = await fetch(`${API_URL}/files/upload/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-CSRFToken': csrfToken,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка при загрузке файла');
            }
            // После успешной загрузки получаем обновленный список файлов
            dispatch(fetchFiles());
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const deleteFile = createAsyncThunk(
    'files/deleteFile',
    async (fileId, { rejectWithValue, dispatch }) => {
        try {
            const response = await fetch(`${API_URL}/files/${fileId}/`, {
                method: 'DELETE',
                credentials: 'include',
                headers: getHeaders(),
            });

            if (!response.ok) {
                throw new Error('Ошибка при удалении файла');
            }
            dispatch(fetchFiles());
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const renameFile = createAsyncThunk(
    'files/renameFile',
    async ({ fileId, newName }, { rejectWithValue, dispatch }) => {
        try {
            const response = await fetch(`${API_URL}/files/${fileId}/`, {
                method: 'PATCH',
                credentials: 'include',
                headers: getHeaders(),
                body: JSON.stringify({ name: newName }), // Отправляем новое имя в теле запроса
            });

            if (!response.ok) {
                throw new Error('Ошибка при переименовании файла');
            }

            // После успешного переименования обновляем список файлов
            dispatch(fetchFiles());
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);


export const downloadFile = createAsyncThunk(
    'files/downloadFile',
    async (fileId, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_URL}/files/${fileId}/download/`, {
                method: 'GET',
                credentials: 'include',
                headers: getHeaders(),
            });

            if (!response.ok) {
                throw new Error('Ошибка при скачивании файла');
            }

            // Получаем файл как Blob (бинарные данные)
            const blob = await response.blob();

            // Создаем временную ссылку и инициируем скачивание
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = 'downloaded_file'; // Можно задать имя файла, если API его возвращает

            document.body.appendChild(a);
            a.click();

            // Убираем элемент из DOM и освобождаем память
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);


export const copyLink = createAsyncThunk(
    'files/copyLink',
    async (fileId, { rejectWithValue }) => {
        try {
            // Формируем ссылку на файл. Это может быть прямая ссылка или ссылка на страницу просмотра.
            const fileUrl = `${window.location.origin}/files/${fileId}`;

            // Копируем текст в буфер обмена
            await navigator.clipboard.writeText(fileUrl);
        } catch (error) {
            return rejectWithValue('Не удалось скопировать ссылку в буфер обмена');
        }
    }
);

const initialState = {
    files: [],
    status: 'idle', // 'loading' | 'succeeded' | 'failed'
    error: null,
    successMessage: '',
};


const fileStorageSlice = createSlice({
    name: 'fileStorage',
    initialState,
    reducers: {
        setSuccessMessage: (state, action) => {
            state.successMessage = action.payload;
        },
        clearSuccessMessage: (state) => {
            state.successMessage = '';
        },
        updateAppError: (state, action) => {
            state.error = action.payload;
        },
        clearError: (state) => {
            state.error = '';
        },
        startRename: (state, action) => {
            const { fileId, originalName } = action.payload;
            state.editingFileId = fileId;
            state.newName = originalName; // Инициализируем поле ввода текущим именем
        },
        updateNewName: (state, action) => {
            state.newName = action.payload;
        },
        cancelRename: (state) => {
            state.editingFileId = null;
            state.newName = '';
        },
        fileRenamed: (state, action) => {
        // Этот экшен можно вызывать после успешного ответа от API
        // Он просто выходит из режима редактирования
            state.editingFileId = null;
            state.newName = '';
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchFiles.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchFiles.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.files = action.payload;
            })
            .addCase(fetchFiles.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload || 'Неизвестная ошибка';
            })
            // Обработка других асинхронных операций
            .addMatcher(
                (action) =>
                    action.type.endsWith('/fulfilled') && !action.type.includes('fetchFiles'),
                (state) => {
                    state.status = 'succeeded';
                    state.successMessage = 'Операция выполнена успешно';
                }
            )
            .addMatcher(
                (action) => action.type.endsWith('/rejected'),
                (state, action) => {
                    state.status = 'failed';
                    state.error = action.payload || 'Произошла ошибка';
                }
            );
    },
});

export const { setSuccessMessage, clearSuccessMessage, updateAppError, clearError, startRename, updateNewName, cancelRename, fileRenamed } =
    fileStorageSlice.actions;

export default fileStorageSlice.reducer;