import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { CardImage } from '../types';
import { getSavedCardImages, deleteCardImage, clearAllCardImages } from '../utils/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 40) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

interface GalleryScreenProps {
  onNavigateToCamera: () => void;
}

export default function GalleryScreen({ onNavigateToCamera }: GalleryScreenProps) {
  const [cardImages, setCardImages] = useState<CardImage[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadImages = useCallback(async () => {
    try {
      const images = await getSavedCardImages();
      setCardImages(images.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error('Error loading images:', error);
      Alert.alert('エラー', '画像の読み込みに失敗しました');
    }
  }, []);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadImages();
    setRefreshing(false);
  }, [loadImages]);

  const handleDeleteImage = (id: string) => {
    Alert.alert(
      '削除確認',
      'この画像を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCardImage(id);
              await loadImages();
              Alert.alert('削除完了', '画像を削除しました');
            } catch (error) {
              console.error('Error deleting image:', error);
              Alert.alert('エラー', '画像の削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (cardImages.length === 0) {
      Alert.alert('通知', '削除する画像がありません');
      return;
    }

    Alert.alert(
      '全削除確認',
      `すべての画像（${cardImages.length}枚）を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '全削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllCardImages();
              await loadImages();
              Alert.alert('削除完了', 'すべての画像を削除しました');
            } catch (error) {
              console.error('Error clearing images:', error);
              Alert.alert('エラー', '画像の削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  const renderCard = ({ item }: { item: CardImage }) => (
    <TouchableOpacity
      style={styles.cardContainer}
      onLongPress={() => handleDeleteImage(item.id)}
    >
      <Image source={{ uri: item.uri }} style={styles.cardImage} resizeMode="cover" />
      <Text style={styles.cardTimestamp}>
        {new Date(item.timestamp).toLocaleString('ja-JP')}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>保存されたカード ({cardImages.length}枚)</Text>
        {cardImages.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearButton}>全削除</Text>
          </TouchableOpacity>
        )}
      </View>

      {cardImages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>保存されたカードがありません</Text>
          <Text style={styles.emptySubtext}>カメラでカードを撮影してください</Text>
        </View>
      ) : (
        <FlatList
          data={cardImages}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      <TouchableOpacity style={styles.cameraButton} onPress={onNavigateToCamera}>
        <Text style={styles.cameraButtonText}>カメラに戻る</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    color: '#f44336',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 10,
  },
  cardContainer: {
    width: CARD_WIDTH,
    margin: 5,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardImage: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardTimestamp: {
    padding: 8,
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  cameraButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    margin: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
