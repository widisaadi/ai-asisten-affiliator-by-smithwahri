// Converts a File object to a base64 string
export const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      }
    };
    reader.readAsDataURL(file);
  });

  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

// Converts a data URL (e.g., from an image preview or AI response) back to a File object
export const urlToFile = async (url: string, filename: string, mimeType: string): Promise<File> => {
    const response = await fetch(url);
    const data = await response.blob();
    return new File([data], filename, { type: mimeType });
};


// Creates a 16:9 canvas with the image centered and a blurred, scaled-up version as the background.
// This guarantees a 16:9 aspect ratio input for the AI model.
export const preprocessImageTo16x9 = (imageFile: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }

        const targetAspectRatio = 16 / 9;
        const targetWidth = 1280; 
        const targetHeight = targetWidth / targetAspectRatio;

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // 1. Draw blurred, scaled background to cover the entire canvas
        ctx.filter = 'blur(16px)';
        const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
        const x = (targetWidth - img.width * scale) / 2;
        const y = (targetHeight - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        ctx.filter = 'none';
        
        // 2. Add a semi-transparent overlay to dim the background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // 3. Draw the original image on top, centered and contained within the canvas
        const imgAspectRatio = img.width / img.height;
        let drawWidth, drawHeight;

        if (imgAspectRatio > targetAspectRatio) {
          // Image is wider than target
          drawWidth = targetWidth;
          drawHeight = targetWidth / imgAspectRatio;
        } else {
          // Image is taller than target
          drawHeight = targetHeight;
          drawWidth = targetHeight * imgAspectRatio;
        }

        const drawX = (targetWidth - drawWidth) / 2;
        const drawY = (targetHeight - drawHeight) / 2;
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        // 4. Convert canvas to a File object
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const newFile = new File([blob], imageFile.name, {
                type: 'image/png',
                lastModified: Date.now(),
              });
              resolve(newFile);
            } else {
              reject(new Error('Canvas to Blob conversion failed'));
            }
          },
          'image/png',
          0.95
        );
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });
};