import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import GeneratedResult from './components/GeneratedResult';
import Loader from './components/Loader';
import SettingsModal from './components/SettingsModal';
import { generateCombinedImage, generateVideoFromImage, upscaleVideo } from './services/geminiService';
import { preprocessImageTo16x9 } from './utils/fileUtils';
import { cropVideoTo9x16 } from './utils/videoUtils';
import { SettingsIcon } from './components/icons';
import type { ImageFile, GeneratedImage, GeneratedVideo, UpscaledVideos } from './types';

// Helper to create more user-friendly error messages
const getDisplayError = (err: unknown): string => {
  let message = "Terjadi kesalahan yang tidak diketahui.";
  if (err instanceof Error) {
    message = err.message;
    // Check for quota-related errors from the Gemini API
    if (message.includes('RESOURCE_EXHAUSTED') || message.toLowerCase().includes('quota')) {
      return "Kuota API Anda telah terlampaui. Silakan periksa status penagihan Google AI Anda dan pastikan penagihan diaktifkan untuk proyek Anda untuk terus menggunakan layanan ini.";
    }
     if (message.includes('API key not valid')) {
      return "Kunci API tidak valid. Silakan periksa kembali kunci API Gemini Anda di menu pengaturan.";
    }
  }
  return message;
};


function App() {
  const [apiKey, setApiKey] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  useEffect(() => {
    const storedApiKey = localStorage.getItem('gemini_api_key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  const handleSaveApiKey = (newKey: string) => {
    if (newKey) {
        localStorage.setItem('gemini_api_key', newKey);
        setApiKey(newKey);
    } else {
        localStorage.removeItem('gemini_api_key');
        setApiKey('');
    }
    setIsSettingsOpen(false);
  };


  const handleImageGeneration = async () => {
    if (!referenceImage || !productImage) {
      setError("Silakan unggah gambar referensi dan produk.");
      return;
    }
    if (!apiKey) {
      setError("Silakan masukkan kunci API Gemini Anda di pengaturan terlebih dahulu.");
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
      const result = await generateCombinedImage(processedRefFile, processedProdFile, extraNotes);
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
        const result = await generateVideoFromImage(generatedImage, setVideoLoadingMessage, setVideoProgress);
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
        const croppedUrl = await cropVideoTo9x16(generatedVideo.url, setCroppingProgress);
        setCroppedVideo({
            url: croppedUrl,
            prompt: `Video asli dipotong ke rasio aspek 9:16. Prompt video asli: "${generatedVideo.prompt}"`
        });
    } catch (err) {
        console.error(err);
        setError(getDisplayError(err));
    } finally {
        setIsCropping(false);
    }
  };

  const handleUpscaleVideo = async (factor: 2 | 4) => {
    if (!generatedImage) {
        setError("Gambar asli diperlukan untuk peningkatan skala.");
        return;
    }
    setError(null);
    setIsUpscaling(factor);
    setUpscalingProgress(0);
    setUpscalingMessage(`Memulai peningkatan skala ${factor}x...`);

    try {
        // 1. Generate a new, high-detail 16:9 video from the original source image.
        const result = await upscaleVideo(generatedImage, factor, setUpscalingMessage, setUpscalingProgress);
        
        // 2. Crop the newly generated high-detail video to 9:16.
        setUpscalingMessage(`Memotong video ${factor}x yang ditingkatkan...`);
        const croppedUpscaledUrl = await cropVideoTo9x16(result.url, (progress) => {
            setUpscalingProgress(progress);
        });
        
        setUpscaledVideos(prev => ({
            ...prev,
            [factor]: {
                url: croppedUpscaledUrl,
                prompt: `Video ditingkatkan ${factor}x, lalu dipotong ke 9:16. Prompt asli untuk peningkatan: "${result.prompt}"`
            }
        }));

    } catch (err) {
        console.error(err);
        setError(getDisplayError(err));
    } finally {
        setIsUpscaling(null);
    }
  };

  const isCombineButtonDisabled = !referenceImage || !productImage || isLoadingImage || !apiKey;

  return (
    <>
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveApiKey}
        currentApiKey={apiKey}
      />
      <div className="min-h-screen bg-gradient-to-b from-[#101010] to-[#030303] text-gray-200 p-4 sm:p-8">
        <div className="container mx-auto max-w-6xl">
          <header className="text-center mb-12 relative">
            <button
                onClick={() => setIsSettingsOpen(true)}
                className="absolute top-0 right-0 p-2 text-gray-400 hover:text-amber-400 transition-colors"
                aria-label="Pengaturan"
                title="Pengaturan Kunci API"
            >
                <SettingsIcon className="w-6 h-6" />
            </button>
            <h1 className="text-4xl sm:text-5xl font-bold text-amber-400 tracking-wide">AI Product Placement Studio</h1>
            <p className="mt-4 text-lg text-gray-400 max-w-3xl mx-auto">
              Gabungkan produk ke dalam adegan dengan mulus. Unggah referensi dan gambar produk untuk menghasilkan visual fotorealistik.
            </p>
          </header>

          <main>
            {!apiKey && (
                 <div className="mb-6 text-center bg-amber-900/30 border border-amber-700 p-4 rounded-lg">
                    <p className="font-semibold text-amber-300">Konfigurasi Diperlukan</p>
                    <p className="text-amber-400">
                        Silakan masukkan kunci API Google Gemini Anda di{' '}
                        <button onClick={() => setIsSettingsOpen(true)} className="font-bold underline hover:text-white">
                        menu pengaturan
                        </button>
                        {' '}untuk memulai.
                    </p>
                </div>
            )}
            <div className="bg-black/20 backdrop-blur-lg border border-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FileUpload
                  title="Gambar Referensi"
                  description="Unggah latar belakang adegan atau pose model."
                  imageFile={referenceImage}
                  onFileSelect={setReferenceImage}
                />
                <FileUpload
                  title="Gambar Produk"
                  description="Unggah produk yang akan ditempatkan di adegan."
                  imageFile={productImage}
                  onFileSelect={setProductImage}
                />
              </div>
              
              <div className="mt-6">
                <textarea
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                  placeholder="Opsional: Tambahkan catatan tambahan untuk AI (mis., 'letakkan jam tangan di pergelangan tangan kiri')"
                  className="w-full p-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                  rows={2}
                ></textarea>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={handleImageGeneration}
                  disabled={isCombineButtonDisabled}
                  className="bg-amber-400 text-black font-bold py-3 px-8 rounded-lg text-lg hover:bg-amber-500 transition-colors disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(252,212,40,0.3)] hover:shadow-[0_0_25px_rgba(252,212,40,0.5)]"
                  title={!apiKey ? "Harap masukkan kunci API di pengaturan" : ""}
                >
                  {isLoadingImage ? 'Membuat...' : 'Gabungkan Gambar'}
                </button>
              </div>
            </div>
            
            {error && (
              <div className="mt-8 text-center bg-red-900/30 border border-red-700 p-4 rounded-lg">
                  <p className="font-semibold text-red-300">Error</p>
                  <p className="text-red-400">{error}</p>
              </div>
            )}

            {isLoadingImage && <div className="mt-8 flex justify-center"><Loader message={imageLoadingMessage} /></div>}

            {generatedImage && !isLoadingImage && (
              <GeneratedResult 
                  mediaUrl={generatedImage.url}
                  mediaType="image"
                  prompt={generatedImage.prompt}
                  onGenerateVideo={handleVideoGeneration}
                  isGeneratingVideo={isLoadingVideo}
              />
            )}

            {isLoadingVideo && <div className="mt-8 flex justify-center"><Loader message={videoLoadingMessage} progress={videoProgress} /></div>}

            {generatedVideo && !isLoadingVideo && !isCropping && !croppedVideo &&(
              <GeneratedResult 
                  mediaUrl={generatedVideo.url}
                  mediaType="video"
                  prompt={generatedVideo.prompt}
                  onCropVideo={handleCropVideo}
                  isCropping={isCropping}
              />
            )}

            {isCropping && <div className="mt-8 flex justify-center"><Loader message={`Memotong ke 9:16...`} progress={croppingProgress} /></div>}

            {croppedVideo && (
              <GeneratedResult
                  mediaUrl={croppedVideo.url}
                  mediaType="video"
                  prompt={croppedVideo.prompt}
                  isCropped={true}
                  onUpscale={handleUpscaleVideo}
                  upscalingFactor={isUpscaling}
                  upscaledVideos={upscaledVideos}
              />
            )}

            {isUpscaling && (
              <div className="mt-8 flex justify-center">
                <Loader message={upscalingMessage} progress={upscalingProgress} />
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

export default App;
