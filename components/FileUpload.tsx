import React, { useRef, useCallback } from 'react';
import { UploadIcon } from './icons';
import type { ImageFile } from '../types';

interface FileUploadProps {
  onFileSelect: (file: ImageFile) => void;
  imageFile: ImageFile | null;
  title: string;
  description: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, imageFile, title, description }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onFileSelect({ file, preview: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
       const reader = new FileReader();
       reader.onloadend = () => {
         onFileSelect({ file, preview: reader.result as string });
       };
       reader.readAsDataURL(file);
    }
  }, [onFileSelect]);

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className="w-full bg-black/20 backdrop-blur-sm border-2 border-dashed border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-amber-400 transition-colors duration-300 flex items-center justify-center min-h-[240px]"
      onClick={() => fileInputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      {imageFile ? (
        <img src={imageFile.preview} alt={title} className="mx-auto max-h-48 rounded-lg object-contain" />
      ) : (
        <div className="flex flex-col items-center">
          <UploadIcon className="w-12 h-12 text-gray-500" />
          <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
          <p className="mt-1 text-sm text-gray-400">{description}</p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;