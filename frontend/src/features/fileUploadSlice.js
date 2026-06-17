import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    selectedFile: null,
    comment: '',
    isUploading: false,
    error: '',
};

const fileUploadSlice = createSlice({
    name: 'fileUpload',
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
        updateAppError: (state, action) => {
            state.error = action.payload;
        },
        resetForm: (state) => {
            state.selectedFile = null;
            state.comment = '';
            state.error = '';
        },
    },
});

export const {
    setSelectedFile,
    setComment,
    setIsUploading,
    updateAppError,
    resetForm,
} = fileUploadSlice.actions;

export default fileUploadSlice.reducer;