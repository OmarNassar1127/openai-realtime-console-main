import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { X } from 'react-feather';
import { FileItem } from '../../types/FileItem';
import './FileManagement.scss';

interface FileManagementProps {
  onFileUpload: (file: File) => void;
  onFileDelete: (fileId: string) => void;
  files: FileItem[];
}

export const FileManagement: React.FC<FileManagementProps> = ({
  onFileUpload,
  onFileDelete,
  files,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => {
        onFileUpload(file);
      });
    },
    [onFileUpload]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
        '.docx',
      ],
    },
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div data-component="FileManagement">
      <div className="content-block files">
        <div className="content-block-title">knowledge base</div>
        <div className="content-block-body">
          <div
            {...getRootProps()}
            className={`dropzone ${isDragging ? 'dragging' : ''}`}
          >
            <input {...getInputProps()} />
            <p>Drag & drop files here, or click to select</p>
            <small>Supported: PDF, TXT, DOC, DOCX</small>
          </div>
          <div className="files-list">
            {files.map((file) => (
              <div key={file.id} className="file-item">
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatFileSize(file.size)}</span>
                </div>
                <button
                  className="delete-button"
                  onClick={() => onFileDelete(file.id)}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
