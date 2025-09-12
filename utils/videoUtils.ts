// utils/videoUtils.ts

// Memotong video yang diberikan ke rasio aspek 9:16 dengan memotong sisi-sisinya.
// Ini dilakukan sepenuhnya di sisi klien menggunakan Canvas API.
export const cropVideoTo9x16 = (videoUrl: string, onProgress?: (progress: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.src = videoUrl;
        video.crossOrigin = "anonymous"; // Diperlukan untuk memuat URL blob ke kanvas
        video.muted = true; // Diperlukan untuk pemutaran otomatis dan pemrosesan tanpa interaksi pengguna

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false }); // alpha: false untuk kinerja yang lebih baik
        if (!ctx) return reject(new Error('Tidak bisa mendapatkan konteks kanvas.'));

        video.onloadedmetadata = () => {
            // Atur kanvas ke rasio aspek 9:16 berdasarkan tinggi video
            const targetHeight = video.videoHeight;
            // Pastikan lebar adalah bilangan bulat untuk menghindari masalah rendering sub-piksel
            const targetWidth = Math.floor(targetHeight * (9 / 16));
            canvas.width = targetWidth;
            canvas.height = targetHeight;

            // Hitung titik awal X untuk memotong dari tengah
            const sourceX = (video.videoWidth - targetWidth) / 2;

            const stream = canvas.captureStream(24); // Tangkap pada 24 fps
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const croppedUrl = URL.createObjectURL(blob);
                resolve(croppedUrl);
            };

            recorder.onerror = (e) => {
                reject(new Error(`MediaRecorder error: ${e}`));
            };

            let frameCount = 0;
            const totalFrames = Math.floor(video.duration * 24);

            const drawFrame = () => {
                // Berhenti memproses jika video telah berhenti
                if (video.paused || video.ended) {
                    if (recorder.state === 'recording') {
                        recorder.stop();
                    }
                    return;
                }
                // Gambar bingkai video saat ini ke kanvas yang dipotong
                ctx.drawImage(video, sourceX, 0, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);
                frameCount++;
                if (onProgress && totalFrames > 0) {
                    onProgress(Math.min(100, Math.round((frameCount / totalFrames) * 100)));
                }
                // Minta bingkai berikutnya
                requestAnimationFrame(drawFrame);
            };
            
            video.play().then(() => {
                recorder.start();
                drawFrame();
            }).catch(reject);
        };
        
        video.onerror = (e) => reject(new Error(`Gagal memuat metadata video. Error: ${e}`));
    });
};
