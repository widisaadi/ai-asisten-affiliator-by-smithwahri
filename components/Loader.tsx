import React from 'react';

interface LoaderProps {
    message: string;
    progress?: number;
}

const WaveDot = ({ delay }: { delay: string }) => (
    <div
        className="w-2.5 h-2.5 bg-amber-400 rounded-full"
        style={{ animation: `wave 1.5s infinite ${delay}` }}
    ></div>
);

const Loader: React.FC<LoaderProps> = ({ message, progress }) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-black/30 backdrop-blur-lg border border-gray-800 rounded-2xl shadow-lg w-full max-w-md">
            <style>
                {`
                    @keyframes wave {
                        0%, 60%, 100% { transform: initial; }
                        30% { transform: translateY(-15px); }
                    }
                `}
            </style>
            <div className="flex items-center justify-center space-x-2">
                <WaveDot delay="0s" />
                <WaveDot delay="0.1s" />
                <WaveDot delay="0.2s" />
                <WaveDot delay="0.3s" />
                <WaveDot delay="0.4s" />
            </div>
            <p className="mt-6 text-base text-gray-300 font-medium text-center">{message}</p>
            {progress !== undefined && (
                <div className="w-full mt-4">
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                        <div
                            className="bg-amber-400 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="text-center text-amber-400 font-bold text-sm mt-2">{progress}%</p>
                </div>
            )}
        </div>
    );
};

export default Loader;