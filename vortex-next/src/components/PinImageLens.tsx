'use client';

import ReactCrop, { type Crop } from 'react-image-crop';
import { ScanSearch, X, Download } from 'lucide-react';
import 'react-image-crop/dist/ReactCrop.css';

interface PinImageLensProps {
  image: string;
  title: string;
  isLensMode: boolean;
  setIsLensMode: (mode: boolean) => void;
  crop?: Crop;
  setCrop: (crop?: Crop) => void;
  completedCrop: Crop | null;
  setCompletedCrop: (crop: Crop | null) => void;
}

export function PinImageLens({
  image,
  title,
  isLensMode,
  setIsLensMode,
  crop,
  setCrop,
  completedCrop,
  setCompletedCrop,
}: PinImageLensProps) {
  const hasActiveCrop = crop?.width || completedCrop?.width;

  return (
    <div className="w-full md:w-1/2 bg-black flex items-center justify-center relative group min-h-[50vh]">
      {isLensMode ? (
        // react-image-crop measures and overlays directly against a real <img> DOM
        // node it controls via ref, so we intentionally use a native <img> here
        // instead of next/image for the duration of lens/crop mode.
        <ReactCrop crop={crop} onChange={(c) => setCrop(c)} onComplete={(c) => setCompletedCrop(c)} className="max-h-[85vh] object-contain">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image || undefined} alt={title} className="w-full h-auto max-h-[85vh] object-contain" referrerPolicy="no-referrer" />
        </ReactCrop>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={image || undefined}
          alt={title}
          className="w-full h-auto max-h-[85vh] object-contain"
          referrerPolicy="no-referrer"
        />
      )}

      {/* Lens Toggle Button */}
      <div className="absolute top-4 right-4 flex gap-2 transition-opacity">
        <button
          onClick={() => {
            setIsLensMode(!isLensMode);
            if (isLensMode) {
              setCrop(undefined);
              setCompletedCrop(null);
            }
          }}
          className={`backdrop-blur-md p-3 rounded-full transition-colors flex items-center gap-2 ${isLensMode
              ? 'bg-neon text-ink hover:bg-white'
              : 'bg-black/50 text-white hover:bg-black/80 opacity-100 md:opacity-0 md:group-hover:opacity-100'
            }`}
          title={isLensMode ? 'Exit visual search' : 'Search by image section'}
        >
          {isLensMode ? <X size={20} /> : <ScanSearch size={20} />}
          {isLensMode && <span className="font-bold text-sm pr-1">Exit Lens</span>}
        </button>
        {!isLensMode && (
          <button className="bg-black/50 backdrop-blur-md p-3 rounded-full hover:bg-black/80 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 text-white">
            <Download size={20} />
          </button>
        )}
      </div>

      {isLensMode && !hasActiveCrop && (
        <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
          <span className="bg-black/70 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium">
            Draw a box to search a specific area
          </span>
        </div>
      )}
    </div>
  );
}