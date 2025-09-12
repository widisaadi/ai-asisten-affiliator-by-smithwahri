import React, { useState } from 'react';
import { CopyIcon, CheckIcon, DownloadIcon, EyeIcon, EyeOffIcon } from './icons';
import type { GeneratedVideo, UpscaledVideos } from '../types';

interface GeneratedResultProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  prompt: string;
  onGenerateVideo?: () => void;
  isGeneratingVideo?: boolean;
  onCropVideo?: () => void;
  isCropping?: boolean;
  isCropped?: boolean;
  onUpscale?: (factor: 2 | 4) => void;
  upscalingFactor?: number | null;
  upscaledVideos?: UpscaledVideos;
}

interface UpscaleOptionProps {
    factor: 2 | 4;
    onUpscale?: (factor: 2 | 4) => void;
    isUpscaling?: boolean;
    result?: GeneratedVideo | null;
}

const UpscaleOption: React.FC<UpscaleOptionProps> = ({ factor, onUpscale, isUpscaling, result }) => {
    const finalPrompt = result?.prompt || `Tingkatkan video 9:16 yang disediakan dengan faktor ${factor}x, secara signifikan meningkatkan detail, ketajaman, dan kejernihan secara keseluruhan sambil mempertahankan gerakan, gradasi warna, dan estetika asli. Outputnya harus berupa file video dengan bitrate tinggi.`;
    const [showPrompt, setShowPrompt] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(finalPrompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    const handleDownload = () => {
        if (!result) return;
        const link = document.createElement('a');
        link.href = result.url;
        link.download = `upscaled-video-${factor}x-9x16.webm`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 bg-gray-900/50 rounded-lg w-full sm:w-1/2 border border-gray-700 flex flex-col justify-between">
            <div>
              <h4 className="text-lg font-bold text-white text-center">{factor}x Upscale</h4>
              <p className="text-xs text-gray-400 text-center mt-1 mb-3">Meningkatkan resolusi & detail</p>
            </div>
            
            {!result && (
                <button
                    onClick={() => onUpscale?.(factor)}
                    disabled={isUpscaling}
                    className="w-full bg-amber-400 text-black font-bold py-2 px-4 rounded-lg transition-colors hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                    {isUpscaling ? `Meningkatkan...` : `Mulai Peningkatan ${factor}x`}
                </button>
            )}

            {result && (
                 <p className="text-center text-green-400 font-semibold text-sm my-3">Peningkatan Skala Selesai!</p>
            )}

            <div className="flex items-center justify-center space-x-2 mt-3">
                 <button
                    onClick={() => setShowPrompt(!showPrompt)}
                    className="flex items-center space-x-2 bg-gray-800/70 text-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-700 transition-colors text-sm"
                    >
                    {showPrompt ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    <span>Prompt</span>
                </button>
                 <button
                    onClick={handleDownload}
                    disabled={!result || isUpscaling}
                    className="flex items-center space-x-2 bg-gray-800/70 text-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                    <DownloadIcon className="w-4 h-4" />
                    <span>Unduh</span>
                </button>
            </div>
             {showPrompt && (
              <div className="mt-3 p-3 bg-gray-800/50 rounded-lg relative">
                <p className="text-xs text-gray-300 whitespace-pre-wrap pr-10">{finalPrompt}</p>
                 <button
                    onClick={handleCopy}
                    title="Salin Prompt"
                    className="absolute top-2 right-2 flex items-center bg-gray-700 text-white p-1.5 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                    disabled={copied}
                    >
                    {copied ? <CheckIcon className="w-4 h-4 text-green-400"/> : <CopyIcon className="w-4 h-4"/>}
                </button>
              </div>
            )}
        </div>
    );
};

const GeneratedResult: React.FC<GeneratedResultProps> = ({ 
    mediaUrl, 
    mediaType, 
    prompt, 
    onGenerateVideo, 
    isGeneratingVideo, 
    onCropVideo, 
    isCropping, 
    isCropped,
    onUpscale,
    upscalingFactor,
    upscaledVideos
}) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = mediaType === 'image' ? 'generated-image.png' : (isCropped ? 'cropped-video-9x16.webm' : 'generated-video-16x9.mp4');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 bg-black/20 backdrop-blur-lg border border-gray-800 rounded-2xl shadow-lg p-6">
      <div className={`w-full ${mediaType === 'video' && isCropped ? 'aspect-[9/16] max-w-sm mx-auto' : 'aspect-video'} bg-black/30 rounded-lg overflow-hidden flex justify-center items-center`}>
        {mediaType === 'image' ? (
          <img src={mediaUrl} alt="Generated Content" className="max-w-full max-h-full object-contain" />
        ) : (
          <video src={mediaUrl} controls autoPlay loop className="max-w-full max-h-full object-contain" />
        )}
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-center space-x-2">
            <button
                onClick={() => setShowPrompt(!showPrompt)}
                className="flex items-center space-x-2 bg-gray-800/70 text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                {showPrompt ? <EyeOffIcon/> : <EyeIcon/>}
                <span>{showPrompt ? 'Sembunyikan' : 'Lihat'} Prompt</span>
            </button>
             <button
                onClick={handleDownload}
                className="flex items-center space-x-2 bg-amber-400 text-black px-4 py-2 rounded-lg font-bold hover:bg-amber-500 transition-colors"
                >
                <DownloadIcon/>
                <span>Unduh</span>
            </button>
        </div>

        {showPrompt && (
          <div className="p-4 bg-gray-900/70 rounded-lg relative">
            <p className="text-sm text-gray-300 whitespace-pre-wrap pr-12">{prompt}</p>
             <button
                onClick={handleCopy}
                title="Salin Prompt"
                className="absolute top-3 right-3 flex items-center space-x-2 bg-gray-700 text-white p-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                disabled={copied}
                >
                {copied ? <CheckIcon className="w-5 h-5 text-green-400"/> : <CopyIcon className="w-5 h-5"/>}
            </button>
          </div>
        )}

        {mediaType === 'image' && onGenerateVideo && (
            <div className="pt-4 border-t border-gray-800 text-center">
                <p className="text-sm text-gray-400 mb-4">
                    Siap untuk langkah selanjutnya? Buat video fotorealistik 8 detik dari gambar Anda dengan gerakan halus dan alami.
                </p>
                <button
                    onClick={onGenerateVideo}
                    disabled={isGeneratingVideo}
                    className="w-full bg-amber-400 text-black font-bold py-3 px-6 rounded-lg text-lg hover:bg-amber-500 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-400 flex items-center justify-center shadow-[0_0_15px_rgba(252,212,40,0.3)] hover:shadow-[0_0_25px_rgba(252,212,40,0.5)]"
                >
                    {isGeneratingVideo ? 'Membuat Video...' : 'Buat Video'}
                </button>
            </div>
        )}

        {mediaType === 'video' && !isCropped && onCropVideo && (
            <div className="pt-4 border-t border-gray-800 text-center">
                <h3 className="text-lg font-semibold text-white mb-2">Ubah ke Format Vertikal (9:16)</h3>
                <p className="text-sm text-gray-400 mb-4 max-w-prose mx-auto">
                    Optimalkan video Anda untuk platform seperti TikTok atau Instagram Reels dengan memotongnya menjadi format vertikal.
                </p>
                <button
                    onClick={onCropVideo}
                    disabled={isCropping}
                    className="w-full max-w-md mx-auto bg-amber-400 text-black font-bold py-3 px-6 rounded-lg text-lg hover:bg-amber-500 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-400 flex items-center justify-center shadow-[0_0_15px_rgba(252,212,40,0.3)] hover:shadow-[0_0_25px_rgba(252,212,40,0.5)]"
                >
                    {isCropping ? 'Memotong Video...' : 'Potong ke Vertikal (9:16)'}
                </button>
            </div>
        )}

        {mediaType === 'video' && isCropped && (
             <div className="pt-4 border-t border-gray-800">
                <h3 className="text-center text-lg font-semibold text-white mb-3">Peningkatan Skala Video</h3>
                <p className="text-center text-sm text-gray-400 mb-4">Tingkatkan resolusi dan detail video. Pilih opsi di bawah ini.</p>
                <div className="flex flex-col sm:flex-row justify-center items-stretch gap-4 max-w-3xl mx-auto">
                     <UpscaleOption
                        factor={2}
                        onUpscale={onUpscale}
                        isUpscaling={upscalingFactor === 2}
                        result={upscaledVideos?.[2]}
                     />
                     <UpscaleOption
                        factor={4}
                        onUpscale={onUpscale}
                        isUpscaling={upscalingFactor === 4}
                        result={upscaledVideos?.[4]}
                     />
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default GeneratedResult;