import { configureStore } from '@reduxjs/toolkit';
import usersReducer from '../features/usersSlice';
import fileStorageReducer from '../features/fileStorage/fileStorageSlice';
import authReducer from '../features/auth/authSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        users: usersReducer,
        fileStorage: fileStorageReducer,
    },
});

export default store;
