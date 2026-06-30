import React from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import {
  deleteFile,
  downloadFile,
  copyLink,
  startRename,
  updateNewName,
  cancelRename,
  renameFile,
} from '../../features/fileStorage/fileStorageSlice.js';
import './FileList.css';

// Вспомогательные функции
const formatDate = (dateString) => {
  if (!dateString) return 'Не скачивался';
  return new Date(dateString).toLocaleString('ru-RU');
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const FileList = ({ isAdmin }) => {
  const dispatch = useDispatch();

  // Выбираем нужные данные из стора
  const files = useSelector((state) => state.fileStorage.files || []);
  const status = useSelector((state) => state.fileStorage.status);
  const error = useSelector((state) => state.fileStorage.error);
  const editingFileId = useSelector((state) => state.fileStorage.editingFileId);
  const newFileName = useSelector((state) => state.fileStorage.newName);

  // Обработчики кликов
  const handleDownloadClick = (file) => {
    dispatch(downloadFile({
      fileId: file.id,
      originalName: file.original_name
    }));
  };

  const handleCopyLinkClick = (file) => {
    dispatch(copyLink(file.id));
  };

  const handleDeleteClick = (file) => {
    if (window.confirm(`Вы уверены, что хотите удалить файл "${file.original_name}"?`)) {
      dispatch(deleteFile(file.id));
    }
  };

  const handleRenameClick = (file) => {
    dispatch(startRename({ fileId: file.id, originalName: file.original_name }));
  };

  const handleSubmitRename = () => {
    if (!newFileName || !newFileName.trim) {
      alert('Имя файла не может быть пустым');
      return;
    }

    // Диспатчим экшен переименования, передавая ID редактируемого файла 
    // и ту строку, которую пользователь ввел в инпут (newFileName)
    dispatch(renameFile({
      fileId: editingFileId,
      newName: newFileName
    }));
  };

  const handleCancelRename = () => {
    dispatch(cancelRename());
  };

  const handleInputChange = (e) => {
    dispatch(updateNewName(e.target.value));
  };

  if (status === 'loading') return <div className="loading-status">Загрузка...</div>;
  if (status === 'failed') return <div className="error-status">Ошибка: {error}</div>;

  return (
    <div className="file-list">
      <table>
        <thead>
          <tr>
            <th>Название файла</th>
            <th>Комментарий</th>
            <th>Размер</th>
            <th>Владелец</th>
            <th>Дата загрузки</th>
            <th>Последнее скачивание</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr key={file.id}>
              <td>
                {editingFileId === file.id ? (
                  <div className="rename-controls">
                    <input
                      type="text"
                      // Связываем инпут с правильным стейтом newFileName
                      value={newFileName || ''}
                      onChange={handleInputChange}
                      className="rename-input"
                    />
                    <button onClick={handleSubmitRename} className="action-button save">
                      Сохранить
                    </button>
                    <button onClick={handleCancelRename} className="action-button cancel">
                      Отмена
                    </button>
                  </div>
                ) : (
                  <span className="file-name">{file.original_name}</span>
                )}
              </td>
              <td>{file.comment || '-'}</td>
              <td>{formatFileSize(file.size)}</td>
              <td>{file.owner_username || 'Неизвестно'}</td>
              <td>{formatDate(file.upload_date)}</td>
              <td>{formatDate(file.last_download)}</td>
              <td>
                <div className="action-buttons">
                  <button onClick={() => handleDownloadClick(file)} className="action-button download">
                    Скачать
                  </button>

                  {/* Проверка прав: Кнопки видны админу ИЛИ владельцу файла */}
                  {(isAdmin || file.is_owner) && (
                    <>
                      <button onClick={() => handleRenameClick(file)} className="action-button rename">
                        Переименовать
                      </button>
                      <button onClick={() => handleDeleteClick(file)} className="action-button delete">
                        Удалить
                      </button>
                    </>
                  )}

                  <button onClick={() => handleCopyLinkClick(file)} className="action-button copy">
                    Копировать ссылку
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {files.length === 0 && (
        <div className="no-files">Нет доступных файлов</div>
      )}
    </div>
  );
};

FileList.propTypes = {
  isAdmin: PropTypes.bool.isRequired,
};

export default FileList;
