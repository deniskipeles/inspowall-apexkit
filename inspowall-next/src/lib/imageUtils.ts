import { type Crop } from 'react-image-crop';

/**
 * Generates a cropped JPEG data URL of the selected area.
 * Accurately handles object-fit: contain letterboxing and scales coordinates correctly.
 */
export async function getCroppedImg(
  imageSrc: string, 
  crop: Crop, 
  imgElement?: HTMLImageElement
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      // 1. Resolve actual displayed dimensions of the image inside the element
      let displayedWidth = imgElement?.width || image.width;
      let displayedHeight = imgElement?.height || image.height;
      let offsetX = 0;
      let offsetY = 0;

      if (imgElement) {
        const naturalRatio = image.naturalWidth / image.naturalHeight;
        const elementRatio = imgElement.width / imgElement.height;

        if (naturalRatio > elementRatio) {
          // Width constrained (letterboxed on top & bottom)
          displayedWidth = imgElement.width;
          displayedHeight = imgElement.width / naturalRatio;
          offsetY = (imgElement.height - displayedHeight) / 2;
        } else {
          // Height constrained (letterboxed on left & right)
          displayedHeight = imgElement.height;
          displayedWidth = imgElement.height * naturalRatio;
          offsetX = (imgElement.width - displayedWidth) / 2;
        }
      }

      // 2. Adjust crop coordinates by subtracting the letterbox offsets
      const adjustedX = Math.max(0, crop.x - offsetX);
      const adjustedY = Math.max(0, crop.y - offsetY);

      // 3. Calculate scaling factors relative to the actual visible image
      const scaleX = image.naturalWidth / displayedWidth;
      const scaleY = image.naturalHeight / displayedHeight;

      const pixelWidth = crop.unit === '%' ? (crop.width * image.naturalWidth) / 100 : crop.width * scaleX;
      const pixelHeight = crop.unit === '%' ? (crop.height * image.naturalHeight) / 100 : crop.height * scaleY;
      const pixelX = crop.unit === '%' ? (crop.x * image.naturalWidth) / 100 : adjustedX * scaleX;
      const pixelY = crop.unit === '%' ? (crop.y * image.naturalHeight) / 100 : adjustedY * scaleY;

      const canvas = document.createElement('canvas');
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