import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { CardCorners } from '../types';
import {
  detectCardEdges,
  cropAndCorrectPerspective,
  compareImages,
} from '../utils/imageProcessing';
import { saveCardImage } from '../utils/storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CameraScreenProps {
  onNavigateToGallery: () => void;
}

export default function CameraScreen({ onNavigateToGallery }: CameraScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [capturedCount, setCapturedCount] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const lastImageDataRef = useRef<string | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>カメラへのアクセス許可が必要です</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>許可する</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const captureAndProcessCard = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo || !photo.uri) return;

      const imageData = photo.base64 || '';
      const hasChanged = compareImages(lastImageDataRef.current, imageData);

      if (hasChanged) {
        const corners = detectCardEdges(photo.width, photo.height);
        const processedUri = await cropAndCorrectPerspective(
          photo.uri,
          corners,
          photo.width,
          photo.height
        );

        await saveCardImage(processedUri);
        setCapturedCount((prev) => prev + 1);
        lastImageDataRef.current = imageData;
      }
    } catch (error) {
      console.error('Error capturing card:', error);
    }
  };

  const startContinuousScanning = () => {
    setIsScanning(true);
    setCapturedCount(0);
    lastImageDataRef.current = null;

    scanIntervalRef.current = setInterval(() => {
      captureAndProcessCard();
    }, 2000);
  };

  const stopContinuousScanning = () => {
    setIsScanning(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (capturedCount > 0) {
      Alert.alert(
        '撮影完了',
        `${capturedCount}枚のカードを保存しました`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleManualCapture = async () => {
    await captureAndProcessCard();
    Alert.alert('保存完了', 'カード画像を保存しました', [{ text: 'OK' }]);
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        <View style={styles.overlay}>
          <View style={styles.guideline} />
        </View>
      </CameraView>

      <View style={styles.controls}>
        {isScanning && (
          <View style={styles.scanningInfo}>
            <Text style={styles.scanningText}>
              スキャン中... ({capturedCount}枚撮影)
            </Text>
          </View>
        )}

        <View style={styles.buttonRow}>
          {!isScanning ? (
            <>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={startContinuousScanning}
              >
                <Text style={styles.controlButtonText}>連続撮影開始</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, styles.captureButton]}
                onPress={handleManualCapture}
              >
                <Text style={styles.controlButtonText}>撮影</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={stopContinuousScanning}
            >
              <Text style={styles.controlButtonText}>撮影停止</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.galleryButton}
          onPress={onNavigateToGallery}
        >
          <Text style={styles.galleryButtonText}>ギャラリーを見る</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: '#fff',
    fontSize: 16,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideline: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_HEIGHT * 0.6,
    borderWidth: 2,
    borderColor: '#00ff00',
    borderRadius: 10,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  scanningInfo: {
    alignItems: 'center',
    marginBottom: 15,
  },
  scanningText: {
    color: '#00ff00',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controlButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center',
  },
  captureButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
    minWidth: 200,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  galleryButton: {
    backgroundColor: '#9C27B0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  galleryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
