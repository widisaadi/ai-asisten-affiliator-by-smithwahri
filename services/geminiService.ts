

import { GoogleGenAI, Modality } from "@google/genai";
import { fileToGenerativePart } from '../utils/fileUtils';
import type { GeneratedImage } from '../types';

const API_KEY_STORAGE_KEY = 'gemini_api_key';

// Helper untuk mendapatkan Kunci API dari localStorage atau 'Secrets'
const getApiKey = (): string => {
    // Prioritaskan kunci dari localStorage, lalu fallback ke 'Secrets'
    const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY) || process.env.API_KEY;
    if (!apiKey) {
        throw new Error("Kunci API Gemini tidak ditemukan. Harap atur di menu pengaturan (ikon gerigi ⚙️).");
    }
    return apiKey;
};

// Helper untuk mendapatkan klien API yang diinisialisasi
const getAiClient = () => {
    const apiKey = getApiKey();
    return new GoogleGenAI({ apiKey });
};

const loadingMessages = [
    "Memanaskan kanvas digital...",
    "Memanggil algoritma kreatif...",
    "Mencampur cat digital...",
    "Memberi pengarahan pada sutradara AI...",
    "Menyiapkan kamera virtual...",
    "Ini bisa memakan waktu beberapa menit, hal-hal baik datang kepada mereka yang menunggu!",
    "Memoles piksel...",
    "Merender adegan terakhir...",
];

export const generateCombinedImage = async (
    referenceImage: File,
    productImage: File,
    extraNotes: string
): Promise<{ url: string; prompt: string }> => {
    
    const ai = getAiClient();
    const referencePart = await fileToGenerativePart(referenceImage);
    const productPart = await fileToGenerativePart(productImage);

    const userFacingPrompt = `Analisis gambar pertama (adegan/model referensi) dan gambar kedua (produk). Buat gambar baru yang fotorealistik di mana produk dari gambar kedua diintegrasikan secara alami dan mulus ke dalam adegan dari gambar pertama.
Output akhir harus berupa satu gambar gabungan dalam rasio aspek lanskap 16:9.
Pertahankan estetika modern minimalis, realisme bersih, dan cahaya alami.
Output akhir harus berupa bidikan close-up.
${extraNotes ? `\nCatatan pengguna tambahan: "${extraNotes}"` : ""}`;

    const fullPrompt = `${userFacingPrompt}
    
ATURAN PENTING:
1. Jangan pernah menyebutkan atau menampilkan nama merek atau spesifikasi produk.
2. Jika jam tangan terlihat, deskripsikan hanya sebagai 'mengenakan jam tangan'.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [referencePart, productPart, { text: fullPrompt }],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            const imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            return { url: imageUrl, prompt: userFacingPrompt.trim() };
        }
    }
    
    throw new Error("Kombinasi gambar gagal. Tidak ada data gambar yang diterima.");
};


export const generateVideoFromImage = async (
    image: GeneratedImage,
    updateLoadingMessage: (message: string) => void,
    updateProgress: (progress: number) => void
): Promise<{ url: string; prompt: string }> => {
    const ai = getAiClient();
    const apiKey = getApiKey();

    const prompt = `Berdasarkan gambar yang disediakan, buat video fotorealistik. Rasio aspek video HARUS lanskap 16:9, sesuai dengan gambar input. Ini adalah persyaratan penting.
Durasi: 8 detik.
Frame per detik: 24.
Adegan: Video harus merupakan kelanjutan langsung dari adegan di gambar.
Gerakan: Perkenalkan gerakan yang halus dan realistis. Ini bisa termasuk gerakan tangan atau kain yang alami, goyangan lembut tubuh atau pakaian, efek angin sepoi-sepoi sesekali jika di luar ruangan, dan sedikit guncangan mikro genggam untuk realisme kamera. Pertahankan estetika minimalis, bersih, dan modern.
    `;
    
    const imageResponse = await fetch(image.url);
    const imageBlob = await imageResponse.blob();
    const imageFile = new File([imageBlob], "generated-image.png", { type: imageBlob.type });
    const imagePart = await fileToGenerativePart(imageFile);

    let operation = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: prompt,
        image: {
            imageBytes: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType,
        },
        config: {
            numberOfVideos: 1,
        },
    });

    let messageIndex = 0;
    const intervalId = setInterval(() => {
        updateLoadingMessage(loadingMessages[messageIndex % loadingMessages.length]);
        messageIndex++;
    }, 4000);

    let pollCount = 0;
    const MAX_POLLS_FOR_PROGRESS = 20; 
    updateProgress(5); 

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 20000)); // Interval polling ditingkatkan menjadi 20 detik
        operation = await ai.operations.getVideosOperation({ operation: operation });
        pollCount++;
        const progress = 5 + Math.min(90, Math.round((pollCount / MAX_POLLS_FOR_PROGRESS) * 90));
        updateProgress(progress);
    }

    clearInterval(intervalId);
    updateProgress(100);

    if (operation.error) {
        // Penanganan kesalahan yang lebih spesifik untuk pembatasan laju
        const errorMessage = String(operation.error.message);
        if (errorMessage.includes('429')) {
             throw new Error(`Batas laju terlampaui. API menerima terlalu banyak permintaan. Harap tunggu sejenak sebelum mencoba lagi. Error: ${errorMessage}`);
        }
        throw new Error(`Pembuatan video gagal: ${errorMessage}`);
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Pembuatan video berhasil, tetapi tidak ada tautan unduhan yang diberikan.");
    }
    
    const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
    const videoBlob = await videoResponse.blob();
    const videoUrl = URL.createObjectURL(videoBlob);

    return { url: videoUrl, prompt };
};

export const upscaleVideo = async (
    baseImage: GeneratedImage, // Gunakan gambar asli untuk konsistensi
    factor: number,
    updateLoadingMessage: (message: string) => void,
    updateProgress: (progress: number) => void
): Promise<{ url: string; prompt: string }> => {
    const ai = getAiClient();
    const apiKey = getApiKey();

    const prompt = `Berdasarkan gambar yang disediakan, buat video fotorealistik SANGAT DETAIL, mensimulasikan peningkatan resolusi ${factor}x. Fokus pada memaksimalkan ketajaman, detail tekstur, dan kejernihan keseluruhan.
Rasio aspek video HARUS lanskap 16:9, sesuai dengan gambar input. Ini adalah persyaratan penting.
Durasi: 8 detik.
Frame per detik: 24.
Adegan: Video harus merupakan kelanjutan langsung dari adegan di gambar.
Gerakan: Perkenalkan gerakan yang halus dan realistis. Ini bisa termasuk gerakan tangan atau kain yang alami, goyangan lembut tubuh atau pakaian, efek angin sepoi-sepoi sesekali jika di luar ruangan, dan sedikit guncangan mikro genggam untuk realisme kamera. Pertahankan estetika minimalis, bersih, dan modern.
    `;

    const imageResponse = await fetch(baseImage.url);
    const imageBlob = await imageResponse.blob();
    const imageFile = new File([imageBlob], "generated-image.png", { type: imageBlob.type });
    const imagePart = await fileToGenerativePart(imageFile);

    let operation = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: prompt,
        image: {
            imageBytes: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType,
        },
        config: {
            numberOfVideos: 1,
        },
    });

    let messageIndex = 0;
    const intervalId = setInterval(() => {
        updateLoadingMessage(loadingMessages[messageIndex % loadingMessages.length]);
        messageIndex++;
    }, 4000);

    let pollCount = 0;
    const MAX_POLLS_FOR_PROGRESS = 20;
    updateProgress(5);

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 20000)); // Interval polling ditingkatkan menjadi 20 detik
        operation = await ai.operations.getVideosOperation({ operation: operation });
        pollCount++;
        const progress = 5 + Math.min(90, Math.round((pollCount / MAX_POLLS_FOR_PROGRESS) * 90));
        updateProgress(progress);
    }

    clearInterval(intervalId);
    updateProgress(100);

    if (operation.error) {
        // Penanganan kesalahan yang lebih spesifik untuk pembatasan laju
        const errorMessage = String(operation.error.message);
        if (errorMessage.includes('429')) {
             throw new Error(`Batas laju terlampaui. API menerima terlalu banyak permintaan. Harap tunggu sejenak sebelum mencoba lagi. Error: ${errorMessage}`);
        }
        throw new Error(`Peningkatan skala video gagal: ${errorMessage}`);
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Peningkatan skala video berhasil, tetapi tidak ada tautan unduhan yang diberikan.");
    }
    
    const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
    const videoBlob = await videoResponse.blob();
    const videoUrl = URL.createObjectURL(videoBlob);

    return { url: videoUrl, prompt };
};