import { toast } from 'react-hot-toast';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { checkAuthStatus } from '../auth/authSlice';

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
    async (payload = {}, { rejectWithValue }) => {
        try {
            // Безопасно достаем userId, даже если payload не был передан
            const userId = payload?.userId;

            let url = `${API_URL}/files/`;
            if (userId !== undefined && userId !== null) {
                url += `?user_id=${userId}`;
            }

            const response = await fetch(url, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Ошибка при загрузке файлов');
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
            
            dispatch(checkAuthStatus());

            return await response.json();

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
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Ошибка при удалении файла');
            }
            // 1. Перезапрашиваем обновленный список файлов у Django
            dispatch(fetchFiles());
            // 2. Перезапрашиваем профиль пользователя, чтобы бэкенд 
            // отдал новые цифры свободного/занятого места на диске!
            dispatch(checkAuthStatus());

            return fileId; // Возвращаем ID удаленного файла
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
                headers: getHeaders(), // Подставит Content-Type и X-CSRFToken
                body: JSON.stringify({ name: newName }), // Передаем новое имя
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Ошибка при переименовании файла');
            }

            const data = await response.json();

            // Выходим из режима редактирования строки на фронтенде
            dispatch(fileRenamed());

            // Принудительно обновляем список файлов на экране, чтобы увидеть новое имя
            dispatch(fetchFiles());

            return data;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const downloadFile = createAsyncThunk(
    'files/downloadFile',
    // Принимаем объект с fileId и originalName
    async ({ fileId, originalName }, { rejectWithValue, dispatch }) => {
        try {
            // URL запроса формируется строго по ID
            const response = await fetch(`${API_URL}/files/${fileId}/download/`, {
                method: 'GET',
                credentials: 'include',
                headers: getHeaders(),
            });

            if (!response.ok) {
                throw new Error('Ошибка при скачивании файла');
            }

            // Читаем бинарный файл
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = downloadUrl;

            // Берем имя, которое уже было на фронтенде!
            a.download = originalName || 'downloaded_file';

            document.body.appendChild(a);
            a.click();

            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);

            // Мгновенное обновление даты последнего скачивания в таблице
            dispatch(fetchFiles());

            return fileId;
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const copyLink = createAsyncThunk(
    'files/copyLink',
    async (fileId, { rejectWithValue }) => {
        try {
            // // Формируем ссылку на файл. Это может быть прямая ссылка или ссылка на страницу просмотра.
            // const fileUrl = `${window.location.origin}/files/${fileId}`;
            // Формируем публичную ссылку, которая ведет на бэкенд для скачивания
            const shareableUrl = `${import.meta.env.VITE_SERVER_URL}/api/shared/${fileId}/`;

            // Копируем сгенерированную ссылку в буфер обмена браузера
            await navigator.clipboard.writeText(shareableUrl);
            // Показываем красивое всплывающее уведомление пользователю
            toast.success('Ссылка успешно скопирована в буфер обмена!');

            return fileId;
        } catch (error) {
            toast.error('Не удалось скопировать ссылку');
            return rejectWithValue('Не удалось скопировать ссылку в буфер обмена');
        }
    }
);

const initialState = {
    files: [],
    status: 'idle', // 'loading' | 'succeeded' | 'failed'
    error: null,
    successMessage: '',
    selectedFile: null,
    comment: '',
    isUploading: false,
};


const fileStorageSlice = createSlice({
    name: 'fileStorage',
    initialState,
    reducers: {
        setSelectedFile: (state, action) => {
            state.selectedFile = action.payload;
        },
        setComment: (state, action) => {
            state.comment = action.payload;
        },
        setIsUploading: (state, action) => {
            state.isUploading = action.payload;
        },
        resetForm: (state) => {
            state.selectedFile = null;
            state.comment = '';
            state.error = null;
        },
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
            // --- Загрузка списка файлов (fetchFiles) ---
            .addCase(fetchFiles.pending, (state) => {
                state.status = 'loading';
                state.error = null; // Очищаем старые ошибки при обновлении списка
            })
            .addCase(fetchFiles.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.files = action.payload;
                state.error = null; // Гарантированная очистка ошибок при успехе
            })
            .addCase(fetchFiles.rejected, (state, action) => {
                state.status = 'failed';
                // Записываем ошибку, только если запрос реально провалился
                state.error = action.payload || 'Не удалось загрузить список файлов';
            })

            // --- Загрузка нового файла (uploadFile) ---
            .addCase(uploadFile.pending, (state) => {
                state.status = 'loading';
                state.error = null; // Очищаем прошлые ошибки в момент клика на кнопку!
                state.successMessage = '';
            })
            .addCase(uploadFile.fulfilled, (state) => {
                state.status = 'succeeded';
                state.successMessage = 'Файл успешно загружен';
                state.error = null; // Стираем любые ошибки, страница чиста
            })
            .addCase(uploadFile.rejected, (state, action) => {
                state.status = 'failed';
                state.successMessage = '';
                state.error = action.payload || 'Ошибка при загрузке файла';
            })

            // --- Удаление файла (deleteFile) ---
            .addCase(deleteFile.fulfilled, (state) => {
                state.status = 'succeeded';
                state.successMessage = 'Файл успешно удален';
                state.error = null;
            })
            .addCase(deleteFile.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload || 'Ошибка при удалении файла';
            })

            // --- Переименование файла (renameFile) ---
            .addCase(renameFile.fulfilled, (state) => {
                state.status = 'succeeded';
                state.successMessage = 'Файл успешно переименован';
                state.error = null;
            })
            .addCase(renameFile.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload || 'Ошибка при переименовании файла';
            });
    },

});

export const { setSuccessMessage, clearSuccessMessage, updateAppError, clearError,
    startRename, updateNewName, cancelRename, fileRenamed,
    setSelectedFile, setComment, setIsUploading, resetForm
} = fileStorageSlice.actions;

export default fileStorageSlice.reducer;