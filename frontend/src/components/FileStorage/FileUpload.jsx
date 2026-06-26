// import React, { useRef } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import PropTypes from 'prop-types';
// import {
//   setSelectedFile,
//   setComment,
//   setIsUploading,
//   updateAppError,
//   resetForm,
// } from '../../features/fileUploadSlice'; // путь к вашему slice
// import './FileUpload.css';

// const MAX_FILE_SIZE = 10 * 1024 * 1024;

// const FileUpload = ({ onUpload }) => {
//   const dispatch = useDispatch();
//   const fileInputRef = useRef(null);

//   const {
//     selectedFile,
//     comment,
//     isUploading,
//     error,
//   } = useSelector((state) => state.fileUpload);

//   const handleFileSelect = (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       if (file.size > MAX_FILE_SIZE) {
//         dispatch(setError(`Размер файла не должен превышать 10 МБ. Текущий размер: ${(file.size / (1024 * 1024)).toFixed(2)} МБ`));
//         dispatch(setSelectedFile(null));
//         if (fileInputRef.current) fileInputRef.current.value = '';
//         return;
//       }
//       dispatch(setSelectedFile(file));
//       dispatch(updateAppError(''));
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!selectedFile) {
//       dispatch(updateAppError('Пожалуйста, выберите файл'));
//       return;
//     }
//     if (selectedFile.size > MAX_FILE_SIZE) {
//       dispatch(updateAppError(`Размер файла не должен превышать 10 МБ. Текущий размер: ${(selectedFile.size / (1024 * 1024)).toFixed(2)} МБ`));
//       return;
//     }

//     dispatch(setIsUploading(true));
//     dispatch(updateAppError(''));

//     try {
//       await onUpload(selectedFile, comment);
//       dispatch(resetForm());
//       if (fileInputRef.current) fileInputRef.current.value = '';
//     } catch (err) {
//       dispatch(updateAppError(err.message || 'Ошибка при загрузке файла'));
//     } finally {
//       dispatch(setIsUploading(false));
//     }
//   };
//   return (
//     <div className="file-upload">
//       <h3>Загрузка нового файла</h3>
//       <p className="file-size-limit">Максимальный размер файла: 10 МБ</p>
//       <form onSubmit={handleSubmit}>
//         <div className="file-input-container">
//           <input
//             type="file"
//             ref={fileInputRef}
//             onChange={handleFileSelect}
//             className="file-input"
//             id="file-input"
//           />
//           <label htmlFor="file-input" className="file-input-label">
//             {selectedFile ? selectedFile.name : 'Выберите файл'}
//           </label>
//         </div>
//         <div className="comment-input">
//           <textarea
//             value={comment}
//             onChange={(e) => dispatch(setComment(e.target.value))}
//             placeholder="Добавьте комментарий к файлу (необязательно)"
//             rows="3"
//           />
//         </div>
//         {error && <div className="upload-error">{error}</div>}
//         <button
//           type="submit"
//           className="upload-button"
//           disabled={isUploading || !selectedFile}
//         >
//           {isUploading ? 'Загрузка...' : 'Загрузить файл'}
//         </button>
//       </form>
//     </div>
//   );
// };

// FileUpload.propTypes = {
//   onUpload: PropTypes.func.isRequired,
// };

// export default FileUpload;

// import React, { useRef } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import PropTypes from 'prop-types';
// //  ИСПРАВЛЕНО: Импортируем экшены из вашего реального fileStorageSlice
// import {
//   setSelectedFile,
//   setComment,
//   setIsUploading,
//   updateAppError,
//   resetForm,
// } from '../../features/fileStorage/fileStorageSlice';
// import './FileUpload.css';

// const MAX_FILE_SIZE = 10 * 1024 * 1024;

// const FileUpload = ({ onUpload }) => {
//   const dispatch = useDispatch();
//   const fileInputRef = useRef(null);

//   //  ИСПРАВЛЕНО: Читаем стейт строго из fileStorage, как прописано в store.js
//   const fileState = useSelector((state) => state.fileStorage || {});

//   // Безопасное извлечение свойств (если их нет в слайсе, подставятся дефолтные значения)
//   const selectedFile = fileState.selectedFile || null;
//   const comment = fileState.comment || '';
//   const isUploading = fileState.isUploading || false;
//   const error = fileState.error || '';

//   const handleFileSelect = (e) => {
//     const file = e.target.files[0]; // Исправлено: берем именно первый выбранный файл [0]
//     if (file) {
//       if (file.size > MAX_FILE_SIZE) {
//         dispatch(updateAppError(`Размер файла не должен превышать 10 МБ. Текущий размер: ${(file.size / (1024 * 1024)).toFixed(2)} МБ`));
//         dispatch(setSelectedFile(null));
//         if (fileInputRef.current) fileInputRef.current.value = '';
//         return;
//       }
//       dispatch(setSelectedFile(file));
//       dispatch(updateAppError(''));
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!selectedFile) {
//       dispatch(updateAppError('Пожалуйста, выберите файл'));
//       return;
//     }
//     if (selectedFile.size > MAX_FILE_SIZE) {
//       dispatch(updateAppError(`Размер файла не должен превышать 10 МБ. Текущий размер: ${(selectedFile.size / (1024 * 1024)).toFixed(2)} МБ`));
//       return;
//     }

//     dispatch(setIsUploading(true));
//     dispatch(updateAppError(''));

//     try {
//       // Передаем файл и комментарий в родительский Dashboard для отправки на Django бэкенд
//       await onUpload(selectedFile, comment);
//       dispatch(resetForm());
//       if (fileInputRef.current) fileInputRef.current.value = '';
//     } catch (err) {
//       dispatch(updateAppError(err.message || 'Ошибка при загрузке файла'));
//     } finally {
//       dispatch(setIsUploading(false));
//     }
//   };

//   return (
//     <div className="file-upload">
//       <h3>Загрузка нового файла</h3>
//       <p className="file-size-limit">Максимальный размер файла: 10 МБ</p>
//       <form onSubmit={handleSubmit}>
//         <div className="file-input-container">
//           <input
//             type="file"
//             ref={fileInputRef}
//             onChange={handleFileSelect}
//             className="file-input"
//             id="file-input"
//           />
//           <label htmlFor="file-input" className="file-input-label">
//             {selectedFile ? selectedFile.name : 'Выберите файл'}
//           </label>
//         </div>
//         <div className="comment-input">
//           <textarea
//             value={comment}
//             onChange={(e) => dispatch(setComment(e.target.value))}
//             placeholder="Добавьте комментарий к файлу (необязательно)"
//             rows="3"
//           />
//         </div>
//         {error && <div className="upload-error">{error}</div>}
//         <button
//           type="submit"
//           className="upload-button"
//           disabled={isUploading || !selectedFile}
//         >
//           {isUploading ? 'Загрузка...' : 'Загрузить файл'}
//         </button>
//       </form>
//     </div>
//   );
// };

// FileUpload.propTypes = {
//   onUpload: PropTypes.func.isRequired,
// };

// export default FileUpload;

import React, { useRef, useState } from 'react'; //  ДОБАВЛЕН useState
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { setComment, setIsUploading, updateAppError, resetForm } from '../../features/fileStorage/fileStorageSlice';
import './FileUpload.css';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const FileUpload = ({ onUpload }) => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  //  ИСПРАВЛЕНО: Теперь файл хранится локально в компоненте, Redux больше не выдаст ошибку!
  const [selectedFile, setSelectedFileLocal] = useState(null);

  const fileState = useSelector((state) => state.fileStorage || {});
  const comment = fileState.comment || '';
  const isUploading = fileState.isUploading || false;
  const error = fileState.error || '';

  const handleFileSelect = (e) => {
    const file = e.target.files[0]; // Берем первый выбранный файл
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        dispatch(updateAppError(`Размер файла не должен превышать 10 МБ. Текущий размер: ${(file.size / (1024 * 1024)).toFixed(2)} МБ`));
        setSelectedFileLocal(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setSelectedFileLocal(file); // Записываем в локальный стейт
      dispatch(updateAppError(''));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      dispatch(updateAppError('Пожалуйста, выберите файл'));
      return;
    }

    dispatch(setIsUploading(true));
    dispatch(updateAppError(''));

    try {
      await onUpload(selectedFile, comment);
      dispatch(resetForm());
      setSelectedFileLocal(null); // Очищаем локальный файл после успеха
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      dispatch(updateAppError(err.message || 'Ошибка при загрузке файла'));
    } finally {
      dispatch(setIsUploading(false));
    }
  };

  return (
    <div className="file-upload">
      <h3>Загрузка нового файла</h3>
      <p className="file-size-limit">Максимальный размер файла: 10 МБ</p>
      <form onSubmit={handleSubmit}>
        <div className="file-input-container">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="file-input" id="file-input" />
          <label htmlFor="file-input" className="file-input-label">
            {selectedFile ? selectedFile.name : 'Выберите файл'}
          </label>
        </div>
        <div className="comment-input">
          <textarea
            value={comment}
            onChange={(e) => dispatch(setComment(e.target.value))}
            placeholder="Добавьте комментарий к файлу (необязательно)"
            rows="3"
          />
        </div>
        {error && <div className="upload-error">{error}</div>}
        <button type="submit" className="upload-button" disabled={isUploading || !selectedFile}>
          {isUploading ? 'Загрузка...' : 'Загрузить файл'}
        </button>
      </form>
    </div>
  );
};

FileUpload.propTypes = {
  onUpload: PropTypes.func.isRequired,
};

export default FileUpload;
