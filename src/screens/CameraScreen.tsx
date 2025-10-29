import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Switch,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system';
import { detectCardEdges, cropAndCorrectPerspective } from '../utils/imageProcessing';
import { saveCardImage } from '../utils/storage';
import { processImageForDetection, analyzeCardPresenceAndChange } from '../utils/cardDetection';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ROI_WIDTH_RATIO = 0.8;
const ROI_HEIGHT_RATIO = 0.6;
const DETECTION_INTERVAL = 1300;
const VIDEO_DURATION_MS = 1200;
const THUMBNAIL_TIME_MS = 600;
const EDGE_DENSITY_THRESHOLD = 0.05;
const HAMMING_THRESHOLD = 15;
const STABILITY_FRAMES_PRESENT = 2;
const STABILITY_FRAMES_CHANGED = 1;
const COOLDOWN_MS = 1000;

type DetectionState = 'Idle' | 'CandidatePresent' | 'CaptureOnce' | 'WaitForChange';

interface CameraScreenProps {
  onNavigateToGallery: () => void;
}

export default function CameraScreen({ onNavigateToGallery }: CameraScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [capturedCount, setCapturedCount] = useState(0);
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    state: 'Idle' as DetectionState,
    edgeDensity: 0,
    hammingDistance: 0,
    stabilityCounter: 0,
    snapshotUri: null as string | null,
  });

  const cameraRef = useRef<CameraView>(null);
  const detectionStateRef = useRef<DetectionState>('Idle');
  const lastCapturedHashRef = useRef<string | null>(null);
  const stabilityCounterRef = useRef(0);
  const isSamplingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);
  const isInCooldownRef = useRef(false);

  useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (cooldownRef.current) {
        clearTimeout(cooldownRef.current);
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

  const updateDebugInfo = (
    state: DetectionState,
    edgeDensity: number,
    hammingDistance: number,
    stabilityCounter: number,
    snapshotUri: string | null = null
  ) => {
    console.log('[DEBUG]', { state, edgeDensity, hammingDistance, stabilityCounter, snapshotUri });
    if (debugMode) {
      setDebugInfo({ state, edgeDensity, hammingDistance, stabilityCounter, snapshotUri });
    }
  };

  const captureHighQualityCard = async () => {
    if (!cameraRef.current || isInCooldownRef.current || isRecordingRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
      });

      if (!photo || !photo.uri) return;

      const corners = detectCardEdges(photo.width, photo.height);
      const processedUri = await cropAndCorrectPerspective(
        photo.uri,
        corners,
        photo.width,
        photo.height
      );

      await saveCardImage(processedUri);
      setCapturedCount((prev) => prev + 1);

      isInCooldownRef.current = true;
      cooldownRef.current = setTimeout(() => {
        isInCooldownRef.current = false;
      }, COOLDOWN_MS);
    } catch (error) {
      console.error('Error capturing high-quality card:', error);
    }
  };

  const detectCard = async () => {
    if (isSamplingRef.current || isRecordingRef.current || !cameraRef.current) return;

    isSamplingRef.current = true;
    isRecordingRef.current = true;

    let videoUri: string | null = null;
    let frameUri: string | null = null;

    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: VIDEO_DURATION_MS / 1000,
      });

      if (!video || !video.uri) {
        isSamplingRef.current = false;
        isRecordingRef.current = false;
        return;
      }

      videoUri = video.uri;

      const thumbnail = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: THUMBNAIL_TIME_MS,
        quality: 0.3,
      });

      if (!thumbnail || !thumbnail.uri) {
        isSamplingRef.current = false;
        isRecordingRef.current = false;
        return;
      }

      frameUri = thumbnail.uri;

      const capturedFrameUri = frameUri;

      Image.getSize(
        capturedFrameUri,
        async (width, height) => {
          try {
            const roiX = (width * (1 - ROI_WIDTH_RATIO)) / 2;
            const roiY = (height * (1 - ROI_HEIGHT_RATIO)) / 2;
            const roiWidth = width * ROI_WIDTH_RATIO;
            const roiHeight = height * ROI_HEIGHT_RATIO;

            console.log('[DEBUG] Frame dimensions:', { width, height, roiX, roiY, roiWidth, roiHeight });

            const { edgeDensity, hash } = await processImageForDetection(
              capturedFrameUri,
              roiX,
              roiY,
              roiWidth,
              roiHeight
            );

            const analysis = analyzeCardPresenceAndChange(
              edgeDensity,
              hash,
              lastCapturedHashRef.current,
              EDGE_DENSITY_THRESHOLD,
              HAMMING_THRESHOLD
            );

            const currentState = detectionStateRef.current;

            switch (currentState) {
              case 'Idle':
                if (analysis.isPresent) {
                  stabilityCounterRef.current = 1;
                  detectionStateRef.current = 'CandidatePresent';
                  updateDebugInfo('CandidatePresent', edgeDensity, analysis.hammingDistance, 1, capturedFrameUri);
                } else {
                  updateDebugInfo('Idle', edgeDensity, analysis.hammingDistance, 0, capturedFrameUri);
                }
                break;

              case 'CandidatePresent':
                if (analysis.isPresent) {
                  stabilityCounterRef.current++;
                  if (stabilityCounterRef.current >= STABILITY_FRAMES_PRESENT) {
                    detectionStateRef.current = 'CaptureOnce';
                    updateDebugInfo('CaptureOnce', edgeDensity, analysis.hammingDistance, stabilityCounterRef.current, capturedFrameUri);
                    await captureHighQualityCard();
                    lastCapturedHashRef.current = hash;
                    detectionStateRef.current = 'WaitForChange';
                    stabilityCounterRef.current = 0;
                  } else {
                    updateDebugInfo('CandidatePresent', edgeDensity, analysis.hammingDistance, stabilityCounterRef.current, capturedFrameUri);
                  }
                } else {
                  detectionStateRef.current = 'Idle';
                  stabilityCounterRef.current = 0;
                  updateDebugInfo('Idle', edgeDensity, analysis.hammingDistance, 0, capturedFrameUri);
                }
                break;

              case 'WaitForChange':
                if (!analysis.isPresent) {
                  detectionStateRef.current = 'Idle';
                  stabilityCounterRef.current = 0;
                  updateDebugInfo('Idle', edgeDensity, analysis.hammingDistance, 0, capturedFrameUri);
                } else if (analysis.hammingDistance >= HAMMING_THRESHOLD) {
                  stabilityCounterRef.current++;
                  if (stabilityCounterRef.current >= STABILITY_FRAMES_CHANGED) {
                    detectionStateRef.current = 'CaptureOnce';
                    updateDebugInfo('CaptureOnce', edgeDensity, analysis.hammingDistance, stabilityCounterRef.current, capturedFrameUri);
                    await captureHighQualityCard();
                    lastCapturedHashRef.current = hash;
                    detectionStateRef.current = 'WaitForChange';
                    stabilityCounterRef.current = 0;
                  } else {
                    updateDebugInfo('WaitForChange', edgeDensity, analysis.hammingDistance, stabilityCounterRef.current, capturedFrameUri);
                  }
                } else {
                  stabilityCounterRef.current = 0;
                  updateDebugInfo('WaitForChange', edgeDensity, analysis.hammingDistance, 0, capturedFrameUri);
                }
                break;
            }
          } catch (error) {
            console.error('Error processing frame:', error);
          } finally {
            if (videoUri) {
              try {
                await FileSystem.deleteAsync(videoUri, { idempotent: true });
              } catch (cleanupError) {
                console.warn('Failed to delete video file:', cleanupError);
              }
            }
            if (frameUri) {
              try {
                await FileSystem.deleteAsync(frameUri, { idempotent: true });
              } catch (cleanupError) {
                console.warn('Failed to delete frame file:', cleanupError);
              }
            }
            isSamplingRef.current = false;
            isRecordingRef.current = false;
          }
        },
        (error) => {
          console.error('Error getting frame size:', error);
          if (videoUri) {
            FileSystem.deleteAsync(videoUri, { idempotent: true }).catch(() => {});
          }
          if (frameUri) {
            FileSystem.deleteAsync(frameUri, { idempotent: true }).catch(() => {});
          }
          isSamplingRef.current = false;
          isRecordingRef.current = false;
        }
      );
    } catch (error) {
      console.error('Error in card detection:', error);
      if (videoUri) {
        FileSystem.deleteAsync(videoUri, { idempotent: true }).catch(() => {});
      }
      if (frameUri) {
        FileSystem.deleteAsync(frameUri, { idempotent: true }).catch(() => {});
      }
      isSamplingRef.current = false;
      isRecordingRef.current = false;
    }
  };

  const startContinuousScanning = () => {
    setIsScanning(true);
    setCapturedCount(0);
    detectionStateRef.current = 'Idle';
    lastCapturedHashRef.current = null;
    stabilityCounterRef.current = 0;
    isInCooldownRef.current = false;

    detectionIntervalRef.current = setInterval(() => {
      detectCard();
    }, DETECTION_INTERVAL);
  };

  const stopContinuousScanning = () => {
    setIsScanning(false);
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (cooldownRef.current) {
      clearTimeout(cooldownRef.current);
      cooldownRef.current = null;
    }

    detectionStateRef.current = 'Idle';
    stabilityCounterRef.current = 0;
    isInCooldownRef.current = false;

    if (capturedCount > 0) {
      Alert.alert(
        '撮影完了',
        `${capturedCount}枚のカードを保存しました`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleManualCapture = async () => {
    await captureHighQualityCard();
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
          {debugMode && isScanning && (
            <View style={styles.debugOverlay}>
              <Text style={styles.debugText}>状態: {debugInfo.state}</Text>
              <Text style={styles.debugText}>
                エッジ密度: {(debugInfo.edgeDensity * 100).toFixed(2)}%
              </Text>
              <Text style={styles.debugText}>
                ハミング距離: {debugInfo.hammingDistance}
              </Text>
              <Text style={styles.debugText}>
                安定性カウンタ: {debugInfo.stabilityCounter}
              </Text>
              {debugInfo.snapshotUri && (
                <Image
                  source={{ uri: debugInfo.snapshotUri }}
                  style={{ width: 100, height: 100, marginTop: 5 }}
                  resizeMode="contain"
                />
              )}
            </View>
          )}
        </View>
      </CameraView>

      <View style={styles.controls}>
        <View style={styles.debugToggle}>
          <Text style={styles.debugToggleText}>デバッグモード</Text>
          <Switch
            value={debugMode}
            onValueChange={setDebugMode}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={debugMode ? '#2196F3' : '#f4f3f4'}
          />
        </View>

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
                <Text style={styles.controlButtonText}>自動撮影開始</Text>
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
    width: SCREEN_WIDTH * ROI_WIDTH_RATIO,
    height: SCREEN_HEIGHT * ROI_HEIGHT_RATIO,
    borderWidth: 2,
    borderColor: '#00ff00',
    borderRadius: 10,
  },
  debugOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 5,
  },
  debugText: {
    color: '#00ff00',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
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
  debugToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  debugToggleText: {
    color: '#fff',
    fontSize: 14,
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
