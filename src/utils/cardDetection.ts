import jpeg from 'jpeg-js';
import * as ImageManipulator from 'expo-image-manipulator';

export interface DetectionResult {
  isPresent: boolean;
  edgeDensity: number;
  hash: string;
  hammingDistance: number;
}

export const decodeJpegBase64ToGray = (base64: string): Uint8Array => {
  const buffer = Buffer.from(base64, 'base64');
  const imageData = jpeg.decode(buffer, { useTArray: true });
  const { width, height, data } = imageData;
  
  const grayData = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    grayData[i] = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
  }
  
  return grayData;
};

export const computeEdgeDensity = (
  grayData: Uint8Array,
  width: number,
  height: number,
  threshold: number = 30
): number => {
  let edgePixels = 0;
  const totalPixels = (width - 1) * (height - 1);
  
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const idx = y * width + x;
      const gx = Math.abs(grayData[idx + 1] - grayData[idx]);
      const gy = Math.abs(grayData[idx + width] - grayData[idx]);
      const gradient = Math.sqrt(gx * gx + gy * gy);
      
      if (gradient > threshold) {
        edgePixels++;
      }
    }
  }
  
  return edgePixels / totalPixels;
};

export const computeDHash = (
  grayData: Uint8Array,
  width: number,
  height: number
): string => {
  if (width !== 9 || height !== 8) {
    throw new Error('dHash requires 9x8 grayscale image');
  }
  
  let hash = '';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width - 1; x++) {
      const idx = y * width + x;
      const left = grayData[idx];
      const right = grayData[idx + 1];
      hash += left < right ? '1' : '0';
    }
  }
  
  return hash;
};

export const hammingDistance = (hash1: string, hash2: string): number => {
  if (hash1.length !== hash2.length) {
    return Infinity;
  }
  
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }
  
  return distance;
};

export const processImageForDetection = async (
  imageUri: string,
  roiX: number,
  roiY: number,
  roiWidth: number,
  roiHeight: number
): Promise<{ edgeDensity: number; hash: string; width: number; height: number }> => {
  const croppedImage = await ImageManipulator.manipulateAsync(
    imageUri,
    [
      {
        crop: {
          originX: roiX,
          originY: roiY,
          width: roiWidth,
          height: roiHeight,
        },
      },
      {
        resize: {
          width: 128,
          height: 128,
        },
      },
    ],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  
  if (!croppedImage.base64) {
    throw new Error('Failed to get base64 from cropped image');
  }
  
  const grayData128 = decodeJpegBase64ToGray(croppedImage.base64);
  const edgeDensity = computeEdgeDensity(grayData128, 128, 128);
  
  const hashImage = await ImageManipulator.manipulateAsync(
    croppedImage.uri,
    [
      {
        resize: {
          width: 9,
          height: 8,
        },
      },
    ],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  
  if (!hashImage.base64) {
    throw new Error('Failed to get base64 from hash image');
  }
  
  const grayData9x8 = decodeJpegBase64ToGray(hashImage.base64);
  const hash = computeDHash(grayData9x8, 9, 8);
  
  return { edgeDensity, hash, width: 128, height: 128 };
};

export const analyzeCardPresenceAndChange = (
  edgeDensity: number,
  currentHash: string,
  lastCapturedHash: string | null,
  edgeDensityThreshold: number = 0.08,
  hammingThreshold: number = 15
): DetectionResult => {
  const isPresent = edgeDensity >= edgeDensityThreshold;
  const distance = lastCapturedHash ? hammingDistance(currentHash, lastCapturedHash) : Infinity;
  
  return {
    isPresent,
    edgeDensity,
    hash: currentHash,
    hammingDistance: distance,
  };
};
