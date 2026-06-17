import React from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchFiles,
  uploadFile,
  deleteFile,
  renameFile,
  downloadFile,
  copyLink,
  startRename,
  updateNewName,
  cancelRename,
  fileRenamed,
} from '../../features/fileStorage/fileStorageSlice.js'; // Корректный путь к вашему slice

// Вспомогательные функции остаются без изменений
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

const FileList = ({ isAdmin }) => { // props теперь только isAdmin, файлы берём из стора
  const dispatch = useDispatch();

  // Выбираем нужные данные из стора
  const files = useSelector((state) => state.fileStorage.files);
  const status = useSelector((state) => state.fileStorage.status);
  const error = useSelector((state) => state.fileStorage.error);

  const editingFileId = useSelector((state) => state.fileStorage.editingFileId);
  const newFileName = useSelector((state) => state.fileStorage.newName);

  // Обработчики кликов - они только диспатчат действия

  const handleDownloadClick = (file) => {
    dispatch(downloadFile({ fileId: file.id }));
  };

  const handleCopyLinkClick = (file) => {
    dispatch(copyLink({ fileId: file.id }));
  };

  const handleDeleteClick = (file) => {
    if (window.confirm('Вы уверены, что хотите удалить файл?')) {
      dispatch(deleteFile({ fileId: file.id }));
    }
  };

  const handleRenameClick = (file) => {
    dispatch(startRename({ fileId: file.id, originalName: file.original_name }));
  };

  const handleSubmitRename = () => {
// Здесь должна быть логика вызова API для переименования.
// После успешного ответа API нужно вызвать:
// dispatch(fileRenamed({ fileId: editingFileId, newName: newNameValue }));
    // Для демонстрации просто отменим редактирование:
    dispatch(cancelRename());

    // В реальном приложении здесь будет:
    // fetch(...)
    // .then(() => dispatch(fileRenamed({ ... })))
    // .catch(() => /* обработка ошибки */)

    console.log('Переименование файла:', editingFileId, 'в', newName);

    // *** ВАЖНО *** В реальном коде здесь должен быть вызов API!

    // После успешного API вызова:
    // dispatch(fileRenamed({ fileId: editingFileId, newName: newNameValue }));

    // Для этого примера просто отменим:
    dispatch(cancelRename());
  };

  const handleCancelRename = () => {
    dispatch(cancelRename());
  };

  const handleInputChange = (e) => {
    dispatch(updateNewName(e.target.value));
  };

  if (status === 'loading') return <div>Загрузка...</div>;
  if (status === 'failed') return <div>Ошибка: {error}</div>;

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
                      value={newName}
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
              <td>{file.owner_username}</td>
              <td>{formatDate(file.upload_date)}</td>
              <td>{formatDate(file.last_download)}</td>
              <td>
                <div className="action-buttons">
                  <button onClick={() => handleDownloadClick(file)} className="action-button download">
                    Скачать
                  </button>
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
