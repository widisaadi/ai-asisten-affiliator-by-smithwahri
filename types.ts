
export interface ImageFile {
  file: File;
  preview: string;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
}

export interface GeneratedVideo {
  url: string;
  prompt: string;
}

export interface UpscaledVideos {
  [key: number]: GeneratedVideo | undefined;
}
