
import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import GeneratedResult from './components/GeneratedResult';
import Loader from './components/Loader';
import SettingsModal from './components/SettingsModal';
import { SettingsIcon } from './components/icons';
import { generateCombinedImage, generateVideoFromImage, upscaleVideo } from './services/geminiService';
import { preprocessImageTo16x9 } from './utils/fileUtils';
import { cropVideoTo9x16 } from './utils/videoUtils';
import type { ImageFile, GeneratedImage, GeneratedVideo, UpscaledVideos } from './types';

const API_KEY_STORAGE_KEY = 'gemini_api_key';

// Helper to create more user-friendly error messages
const getDisplayError = (err: unknown): string => {
  let message = "Terjadi kesalahan yang tidak diketahui.";
  if (err instanceof Error) {
    message = err.message;
    // Check for quota-related errors from the Gemini API
    if (message.includes('RESOURCE_EXHAUSTED') || message.toLowerCase().includes('quota')) {
      return "Kuota API Anda telah terlampaui. Silakan ganti dengan Kunci API baru di menu Pengaturan (ikon gerigi).";
    }
     if (message.includes('API key not valid')) {
      return "Kunci API tidak valid. Silakan periksa kunci Anda di menu Pengaturan.";
    }
     if (message.includes("Kunci API Gemini tidak disediakan")) {
       return "Kunci API Gemini tidak ditemukan. Harap atur di menu Pengaturan (ikon gerigi di pojok kanan atas).";
    }
  }
  return message;
};


function App() {
  const [referenceImage, setReferenceImage] = useState<ImageFile | null>(null);
  const [productImage, setProductImage] = useState<ImageFile | null>(null);
  const [extraNotes, setExtraNotes] = useState<string>('');
  
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(false);
  const [imageLoadingMessage, setImageLoadingMessage] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  
  const [isLoadingVideo, setIsLoadingVideo] = useState<boolean>(false);
  const [videoLoadingMessage, setVideoLoadingMessage] = useState<string>('');
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideo | null>(null);

  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [croppingProgress, setCroppingProgress] = useState<number>(0);
  const [croppedVideo, setCroppedVideo] = useState<GeneratedVideo | null>(null);

  const [isUpscaling, setIsUpscaling] = useState<number | null>(null); // Store the factor being upscaled
  const [upscalingMessage, setUpscalingMessage] = useState<string>('');
  const [upscalingProgress, setUpscalingProgress] = useState<number>(0);
  const [upscaledVideos, setUpscaledVideos] = useState<UpscaledVideos>({});

  const [error, setError] = useState<string | null>(null);

  const [apiKey, setApiKey] = useState('');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isApiKeySet, setIsApiKeySet] = useState(false);

  useEffect(() => {
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      setApiKey(storedApiKey);
      setIsApiKeySet(true);
    }
  }, []);

  const handleSaveApiKey = (newApiKey: string) => {
    setApiKey(newApiKey);
    localStorage.setItem(API_KEY_STORAGE_KEY, newApiKey);
    setIsApiKeySet(!!newApiKey);
    setIsSettingsModalOpen(false);
    setError(null); // Clear previous errors
  };

  const handleImageGeneration = async () => {
    if (!apiKey) {
      setError("Harap atur Kunci API Gemini Anda di menu Pengaturan sebelum melanjutkan.");
      setIsSettingsModalOpen(true);
      return;
    }
    if (!referenceImage || !productImage) {
      setError("Silakan unggah gambar referensi dan produk.");
      return;
    }
    
    setError(null);
    setIsLoadingImage(true);
    setGeneratedImage(null);
    setGeneratedVideo(null);
    setCroppedVideo(null);
    setUpscaledVideos({});

    try {
      setImageLoadingMessage("Mempersiapkan gambar untuk AI...");
      const processedRefFile = await preprocessImageTo16x9(referenceImage.file);
      const processedProdFile = await preprocessImageTo16x9(productImage.file);

      setImageLoadingMessage("Membuat gambar fotorealistik...");
      const result = await generateCombinedImage(processedRefFile, processedProdFile, extraNotes, apiKey);
      setGeneratedImage(result);

    } catch (err) {
      console.error(err);
      setError(getDisplayError(err));
    } finally {
      setIsLoadingImage(false);
      setImageLoadingMessage('');
    }
  };
  
  const handleVideoGeneration = async () => {
    if(!generatedImage) {
        setError("Gambar harus dibuat terlebih dahulu.");
        return;
    }
    setError(null);
    setIsLoadingVideo(true);
    setGeneratedVideo(null);
    setCroppedVideo(null);
    setUpscaledVideos({});
    setVideoProgress(0);
    setVideoLoadingMessage("Memulai pembuatan video...");

    try {
        const result = await generateVideoFromImage(generatedImage, apiKey, setVideoLoadingMessage, setVideoProgress);
        setGeneratedVideo(result);
    } catch (err) {
        console.error(err);
        setError(getDisplayError(err));
    } finally {
        setIsLoadingVideo(false);
    }
  };

  const handleCropVideo = async () => {
    if (!generatedVideo) {
        setError("Tidak dapat memotong, video asli tidak ditemukan.");
        return;
    }
    setError(null);
    setIsCropping(true);
    setCroppedVideo(null);
    setCroppingProgress(0);

    try {
        const url = await cropVideoTo9x16(generatedVideo.url, setCroppingProgress);
        setCroppedVideo({ ...generatedVideo, url });
    } catch (err) {
        console.error(err);
        setError(getDisplayError(err));
    } finally {
        setIsCropping(false);
    }
  };

  const handleUpscaleVideo = async (factor: 2 | 4) => {
    if (!generatedImage) {
        setError("Tidak dapat meningkatkan skala, gambar dasar asli tidak ditemukan.");
        return;
    }
    if (!croppedVideo) {
        setError("Video harus dipotong ke 9:16 terlebih dahulu sebelum ditingkatkan skalanya.");
        return;
    }
    
    setError(null);
    setIsUpscaling(factor);
    setUpscalingProgress(0);
    setUpscalingMessage(`Meningkatkan skala video ${factor}x...`);
    
    try {
        const result = await upscaleVideo(generatedImage, factor, apiKey, setUpscalingMessage, setUpscalingProgress);
        
        setUpscalingMessage('Finalisasi: memotong ke 9:16...');
        const croppedResultUrl = await cropVideoTo9x16(result.url);

        setUpscaledVideos(prev => ({ ...prev, [factor]: {...result, url: croppedResultUrl} }));
    } catch (err) {
        console.error(err);
        setError(getDisplayError(err));
    } finally {
        setIsUpscaling(null);
    }
  };

  const renderResults = () => {
    const isLoading = isLoadingImage || isLoadingVideo || isCropping || isUpscaling;
    if (isLoading) {
        return (
            <div className="flex justify-center mt-8">
                 {isLoadingImage && <Loader message={imageLoadingMessage} />}
                 {isLoadingVideo && <Loader message={videoLoadingMessage} progress={videoProgress} />}
                 {isCropping && <Loader message={`Memotong video ke 9:16...`} progress={croppingProgress} />}
                 {isUpscaling && <Loader message={upscalingMessage} progress={upscalingProgress} />}
            </div>
        )
    }

    if (generatedVideo) {
        return (
             <GeneratedResult
                mediaUrl={croppedVideo?.url || generatedVideo.url}
                mediaType="video"
                prompt={croppedVideo?.prompt || generatedVideo.prompt}
                isCropped={!!croppedVideo}
                onCropVideo={!croppedVideo ? handleCropVideo : undefined}
                isCropping={isCropping}
                onUpscale={croppedVideo ? handleUpscaleVideo : undefined}
                upscalingFactor={isUpscaling}
                upscaledVideos={upscaledVideos}
            />
        )
    }
    
    if (generatedImage) {
        return (
            <GeneratedResult
                mediaUrl={generatedImage.url}
                mediaType="image"
                prompt={generatedImage.prompt}
                onGenerateVideo={handleVideoGeneration}
                isGeneratingVideo={isLoadingVideo}
            />
        )
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#111111] to-[#030303] text-white p-4 sm:p-8">
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className="p-2 rounded-full bg-black/30 backdrop-blur-sm hover:bg-amber-400/20 text-gray-300 hover:text-amber-400 transition-colors"
          aria-label="Pengaturan"
        >
          <SettingsIcon className="w-6 h-6" />
        </button>
      </div>

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={handleSaveApiKey}
        currentApiKey={apiKey}
      />

      <header className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold">
          AI Asisten <span className="text-amber-400">Affiliator</span>
        </h1>
        <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
          Unggah foto referensi dan produk Anda untuk membuat video promosi yang menakjubkan dalam hitungan menit.
        </p>
      </header>
      
      {!isApiKeySet && !isSettingsModalOpen && (
          <div className="max-w-4xl mx-auto mb-6 p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg text-center">
              <p className="font-semibold text-yellow-200">
                  Kunci API Google Gemini Anda belum diatur. Silakan klik ikon gerigi (⚙️) di pojok kanan atas untuk menambahkannya.
              </p>
          </div>
      )}

      {error && (
        <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-center flex justify-between items-center" role="alert">
          <p className="font-semibold text-red-200 text-left">{error}</p>
          <button onClick={() => setError(null)} className="text-red-200 hover:text-white font-bold p-1 text-2xl leading-none">&times;</button>
        </div>
      )}

      <main className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FileUpload
            onFileSelect={setReferenceImage}
            imageFile={referenceImage}
            title="Unggah Foto Referensi"
            description="Seret & lepas atau klik untuk memilih foto model, suasana, atau gaya."
          />
          <FileUpload
            onFileSelect={setProductImage}
            imageFile={productImage}
            title="Unggah Foto Produk"
            description="Seret & lepas atau klik untuk memilih foto produk Anda dengan latar belakang polos."
          />
        </div>

        <div className="mt-6">
            <label htmlFor="extra-notes" className="block text-sm font-medium text-gray-300 mb-2">Catatan Tambahan (Opsional)</label>
            <textarea
                id="extra-notes"
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                placeholder="Contoh: fokus pada detail jam tangan, gunakan pencahayaan pagi hari..."
                rows={3}
                className="w-full p-3 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
            />
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={handleImageGeneration}
            disabled={isLoadingImage || !referenceImage || !productImage}
            className="bg-amber-400 text-black font-bold py-3 px-8 rounded-lg text-lg hover:bg-amber-500 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-400 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(252,212,40,0.3)] hover:shadow-[0_0_25px_rgba(252,212,40,0.5)]"
          >
            {isLoadingImage ? 'Membuat...' : '1. Buat Gambar'}
          </button>
        </div>

        {renderResults()}
        
      </main>
    </div>
  );
}

export default App;
