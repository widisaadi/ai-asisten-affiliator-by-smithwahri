

import { GoogleGenAI, Modality } from "@google/genai";
import { fileToGenerativePart } from '../utils/fileUtils';
import type { GeneratedImage } from '../types';

const API_KEY_STORAGE_KEY = 'gemini_api_key';

// Helper to get the latest API key directly from storage
const getApiKey = (): string => {
    const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (!apiKey) {
        throw new Error("Kunci API Gemini tidak ditemukan. Harap atur di menu Pengaturan.");
    }
    return apiKey;
};

// Helper to get the API client initialized with the latest key
const getAiClient = () => {
    const apiKey = getApiKey();
    return new GoogleGenAI({ apiKey });
};

const loadingMessages = [
    "Warming up the digital canvas...",
    "Summoning creative algorithms...",
    "Mixing digital paints...",
    "Briefing the AI director...",
    "Setting up virtual cameras...",
    "This can take a few minutes, good things come to those who wait!",
    "Polishing pixels...",
    "Rendering the final scene...",
];

export const generateCombinedImage = async (
    referenceImage: File,
    productImage: File,
    extraNotes: string
): Promise<{ url: string; prompt: string }> => {
    
    const ai = getAiClient();
    const referencePart = await fileToGenerativePart(referenceImage);
    const productPart = await fileToGenerativePart(productImage);

    const userFacingPrompt = `Analyze the first image (reference scene/model) and the second image (product). Create a new, photorealistic image where the product from the second image is naturally and seamlessly integrated into the scene from the first image. 
The final output must be a single, combined image in a landscape 16:9 aspect ratio.
Maintain a minimalist modern aesthetic, clean realism, and natural daylight.
The final output should be a close-up shot.
${extraNotes ? `\nAdditional user notes: "${extraNotes}"` : ""}`;

    const fullPrompt = `${userFacingPrompt}
    
IMPORTANT RULES:
1.  Never mention or show brand names or product specifications.
2.  If a watch is visible, describe it only as 'wearing a watch'.`;

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
    
    throw new Error("Image combination failed. No image data received.");
};


export const generateVideoFromImage = async (
    image: GeneratedImage,
    updateLoadingMessage: (message: string) => void,
    updateProgress: (progress: number) => void
): Promise<{ url: string; prompt: string }> => {
    const ai = getAiClient();
    const apiKey = getApiKey();

    const prompt = `Based on the provided image, create a photorealistic video. The video's aspect ratio MUST be landscape 16:9, matching the input image. This is a critical requirement.
Duration: 8 seconds.
Frames per second: 24.
Scene: The video must be a direct continuation of the scene in the image.
Movement: Introduce subtle, realistic movements. This could include natural hand or fabric movement, a gentle sway of the body or clothing, an occasional breeze effect if outdoors, and a slight handheld micro-shake for camera realism. Maintain the minimalist, clean, and modern aesthetic.
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
        await new Promise(resolve => setTimeout(resolve, 20000)); // Increased polling interval to 20 seconds
        operation = await ai.operations.getVideosOperation({ operation: operation });
        pollCount++;
        const progress = 5 + Math.min(90, Math.round((pollCount / MAX_POLLS_FOR_PROGRESS) * 90));
        updateProgress(progress);
    }

    clearInterval(intervalId);
    updateProgress(100);

    if (operation.error) {
        // More specific error handling for rate limiting
        const errorMessage = String(operation.error.message);
        if (errorMessage.includes('429')) {
             throw new Error(`Rate limit exceeded. The API is receiving too many requests. Please wait a moment before trying again. Error: ${errorMessage}`);
        }
        throw new Error(`Video generation failed: ${errorMessage}`);
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Video generation succeeded, but no download link was provided.");
    }
    
    const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
    const videoBlob = await videoResponse.blob();
    const videoUrl = URL.createObjectURL(videoBlob);

    return { url: videoUrl, prompt };
};

export const upscaleVideo = async (
    baseImage: GeneratedImage, // Use the original image for consistency
    factor: number,
    updateLoadingMessage: (message: string) => void,
    updateProgress: (progress: number) => void
): Promise<{ url: string; prompt: string }> => {
    const ai = getAiClient();
    const apiKey = getApiKey();

    const prompt = `Based on the provided image, create an EXTREMELY HIGH-DETAIL, photorealistic video, simulating a ${factor}x resolution upscale. Focus on maximizing sharpness, texture detail, and overall clarity.
The video's aspect ratio MUST be landscape 16:9, matching the input image. This is a critical requirement.
Duration: 8 seconds.
Frames per second: 24.
Scene: The video must be a direct continuation of the scene in the image.
Movement: Introduce subtle, realistic movements. This could include natural hand or fabric movement, a gentle sway of the body or clothing, an occasional breeze effect if outdoors, and a slight handheld micro-shake for camera realism. Maintain the minimalist, clean, and modern aesthetic.
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
        await new Promise(resolve => setTimeout(resolve, 20000)); // Increased polling interval to 20 seconds
        operation = await ai.operations.getVideosOperation({ operation: operation });
        pollCount++;
        const progress = 5 + Math.min(90, Math.round((pollCount / MAX_POLLS_FOR_PROGRESS) * 90));
        updateProgress(progress);
    }

    clearInterval(intervalId);
    updateProgress(100);

    if (operation.error) {
        // More specific error handling for rate limiting
        const errorMessage = String(operation.error.message);
        if (errorMessage.includes('429')) {
             throw new Error(`Rate limit exceeded. The API is receiving too many requests. Please wait a moment before trying again. Error: ${errorMessage}`);
        }
        throw new Error(`Video upscaling failed: ${errorMessage}`);
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Video upscaling succeeded, but no download link was provided.");
    }
    
    const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
    const videoBlob = await videoResponse.blob();
    const videoUrl = URL.createObjectURL(videoBlob);

    return { url: videoUrl, prompt };
};