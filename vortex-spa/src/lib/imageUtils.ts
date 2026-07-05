import { type Crop } from 'react-image-crop';

export async function getCroppedImg(imageSrc: string, crop: Crop, imgElement?: HTMLImageElement): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const scaleX = image.naturalWidth / (imgElement?.width || image.width);
      const scaleY = image.naturalHeight / (imgElement?.height || image.height);
      
      const pixelWidth = crop.unit === '%' ? (crop.width * image.naturalWidth) / 100 : crop.width * scaleX;
      const pixelHeight = crop.unit === '%' ? (crop.height * image.naturalHeight) / 100 : crop.height * scaleY;
      const pixelX = crop.unit === '%' ? (crop.x * image.naturalWidth) / 100 : crop.x * scaleX;
      const pixelY = crop.unit === '%' ? (crop.y * image.naturalHeight) / 100 : crop.y * scaleY;

      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(
        image,
        pixelX,
        pixelY,
        pixelWidth,
        pixelHeight,
        0,
        0,
        pixelWidth,
        pixelHeight
      );

      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    image.onerror = (e) => reject(e);
  });
}
