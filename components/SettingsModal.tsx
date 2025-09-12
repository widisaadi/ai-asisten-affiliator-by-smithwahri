import React, { useState, useEffect } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
  currentApiKey: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentApiKey }) => {
  const [apiKey, setApiKey] = useState(currentApiKey);
  const [isKeyVisible, setIsKeyVisible] = useState(false);

  useEffect(() => {
    setApiKey(currentApiKey);
  }, [currentApiKey, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    onSave(apiKey);
  };

  const handleClearAndSave = () => {
    setApiKey('');
    onSave('');
  }

  return (
    <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
    >
      <div 
        className="bg-gray-900 border border-gray-700 rounded-2xl shadow-lg w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-4">Pengaturan</h2>
        
        <div className="space-y-2">
            <label htmlFor="api-key-input" className="block text-sm font-medium text-gray-300">
                Kunci API Google Gemini Anda
            </label>
            <div className="relative">
                <input
                    id="api-key-input"
                    type={isKeyVisible ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Masukkan kunci API Anda di sini"
                    className="w-full p-3 pr-12 bg-gray-800 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                />
                 <button
                    onClick={() => setIsKeyVisible(!isKeyVisible)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-200"
                    aria-label={isKeyVisible ? 'Sembunyikan kunci API' : 'Tampilkan kunci API'}
                >
                    {isKeyVisible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
            </div>
             <p className="text-xs text-gray-500 mt-2">
                Kunci Anda disimpan dengan aman di browser Anda dan tidak pernah dikirim ke server kami.
             </p>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row-reverse gap-3">
          <button
            onClick={handleSave}
            className="w-full sm:w-auto bg-amber-500 text-black font-bold py-2 px-6 rounded-lg hover:bg-amber-600 transition-colors"
          >
            Simpan
          </button>
           <button
            onClick={handleClearAndSave}
            className="w-full sm:w-auto bg-gray-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Hapus Kunci
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto sm:mr-auto bg-transparent text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Batal
          </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
