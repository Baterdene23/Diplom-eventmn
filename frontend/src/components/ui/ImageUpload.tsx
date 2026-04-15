'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { uploadApi } from '@/lib/api';
import { useAuthStore } from '@/store';

interface ImageUploadProps {
  onImagesUploaded: (urls: string[]) => void;
  existingImages?: string[];
  maxImages?: number;
  className?: string;
}

interface UploadedImage {
  url: string;
  originalName: string;
  isUploading?: boolean;
  error?: string;
}

export default function ImageUpload({
  onImagesUploaded,
  existingImages = [],
  maxImages = 5,
  className = '',
}: ImageUploadProps) {
  const { accessToken } = useAuthStore();
  const [images, setImages] = useState<UploadedImage[]>(
    existingImages.map((url) => ({ url, originalName: url.split('/').pop() || 'image' }))
  );
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      if (!accessToken) {
        setError('Нэвтрэх шаардлагатай');
        return;
      }

      setError(null);

      // Check max images limit
      const remainingSlots = maxImages - images.length;
      if (remainingSlots <= 0) {
        setError(`Хамгийн ихдээ ${maxImages} зураг оруулах боломжтой`);
        return;
      }

      const filesToUpload = Array.from(files).slice(0, remainingSlots);

      // Add placeholder items for uploading state
      const placeholders: UploadedImage[] = filesToUpload.map((file) => ({
        url: URL.createObjectURL(file),
        originalName: file.name,
        isUploading: true,
      }));

      setImages((prev) => [...prev, ...placeholders]);

      try {
        const result = await uploadApi.uploadImages(filesToUpload, accessToken);

        // Replace placeholders with actual uploaded images
        setImages((prev) => {
          const nonUploading = prev.filter((img) => !img.isUploading);
          const uploaded = result.files.map((f) => ({
            url: f.url,
            originalName: f.originalName,
            isUploading: false,
          }));
          const nextImages = [...nonUploading, ...uploaded];
          onImagesUploaded(nextImages.map((img) => img.url));
          return nextImages;
        });

        if (result.errors && result.errors.length > 0) {
          setError(result.errors.join(', '));
        }
      } catch (err: any) {
        // Remove placeholders on error
        setImages((prev) => prev.filter((img) => !img.isUploading));
        setError(err.message || 'Зураг оруулах алдаа');
      }
    },
    [accessToken, maxImages, onImagesUploaded]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleRemoveImage = useCallback(
    (indexToRemove: number) => {
      setImages((prev) => {
        const newImages = prev.filter((_, index) => index !== indexToRemove);
        // Notify parent of updated URLs
        onImagesUploaded(newImages.filter((img) => !img.isUploading).map((img) => img.url));
        return newImages;
      });
    },
    [onImagesUploaded]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      {/* Upload area */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer
          ${isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }
          ${images.length >= maxImages ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={images.length >= maxImages}
        />

        <div className="flex flex-col items-center gap-2 text-gray-500">
          <Upload className="w-10 h-10 text-gray-400" />
          <p className="text-sm font-medium">
            Зураг чирж оруулах эсвэл <span className="text-primary-600">сонгох</span>
          </p>
          <p className="text-xs text-gray-400">
            JPG, PNG, WebP, GIF • Хамгийн ихдээ 5MB • {images.length}/{maxImages} зураг
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Preview grid */}
      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {images.map((image, index) => (
            <div
              key={`${image.url}-${index}`}
              className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group"
            >
              {/* Image or placeholder */}
              {image.isUploading ? (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                </div>
              ) : (
                <img
                  src={image.url.startsWith('blob:') ? image.url : image.url}
                  alt={image.originalName}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Remove button */}
              {!image.isUploading && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage(index);
                  }}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Thumbnail indicator for first image */}
              {index === 0 && !image.isUploading && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-1">
                  Thumbnail
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {images.length === 0 && (
        <div className="mt-4 flex items-center justify-center p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <div className="flex items-center gap-2 text-gray-400">
            <ImageIcon className="w-5 h-5" />
            <span className="text-sm">Зураг оруулаагүй байна</span>
          </div>
        </div>
      )}
    </div>
  );
}
