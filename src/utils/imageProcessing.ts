import * as ImageManipulator from 'expo-image-manipulator';
import { Point, CardCorners } from '../types';

export const detectCardEdges = (width: number, height: number): CardCorners => {
  const margin = 0.1;
  const cardWidth = width * (1 - 2 * margin);
  const cardHeight = height * (1 - 2 * margin);
  const startX = width * margin;
  const startY = height * margin;

  return {
    topLeft: { x: startX, y: startY },
    topRight: { x: startX + cardWidth, y: startY },
    bottomRight: { x: startX + cardWidth, y: startY + cardHeight },
    bottomLeft: { x: startX, y: startY + cardHeight },
  };
};

export const cropAndCorrectPerspective = async (
  imageUri: string,
  corners: CardCorners,
  originalWidth: number,
  originalHeight: number
): Promise<string> => {
  const targetWidth = 480;
  const targetHeight = 672;

  const scaleX = originalWidth / targetWidth;
  const scaleY = originalHeight / targetHeight;

  const cropX = Math.min(corners.topLeft.x, corners.bottomLeft.x);
  const cropY = Math.min(corners.topLeft.y, corners.topRight.y);
  const cropWidth = Math.max(corners.topRight.x, corners.bottomRight.x) - cropX;
  const cropHeight = Math.max(corners.bottomLeft.y, corners.bottomRight.y) - cropY;

  try {
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          crop: {
            originX: Math.max(0, cropX),
            originY: Math.max(0, cropY),
            width: Math.min(cropWidth, originalWidth - cropX),
            height: Math.min(cropHeight, originalHeight - cropY),
          },
        },
        {
          resize: {
            width: targetWidth,
            height: targetHeight,
          },
        },
      ],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );

    return manipulatedImage.uri;
  } catch (error) {
    console.error('Error processing image:', error);
    return imageUri;
  }
};

export const compareImages = (
  prevImageData: string | null,
  currentImageData: string
): boolean => {
  if (!prevImageData) return true;

  const threshold = 0.15;
  let differences = 0;
  const sampleSize = Math.min(prevImageData.length, currentImageData.length);
  const step = Math.max(1, Math.floor(sampleSize / 1000));

  for (let i = 0; i < sampleSize; i += step) {
    if (prevImageData[i] !== currentImageData[i]) {
      differences++;
    }
  }

  const differenceRatio = differences / (sampleSize / step);
  return differenceRatio > threshold;
};

export const generateImageHash = (uri: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${timestamp}_${random}`;
};
