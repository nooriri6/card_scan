import * as FileSystem from 'expo-file-system/build/legacy/FileSystem';
import * as MediaLibrary from 'expo-media-library';
import { CardImage } from '../types';

const STORAGE_KEY = 'mtg_card_images';
const getCardsDir = () => `${FileSystem.documentDirectory}mtg_cards/`;

export const initializeStorage = async (): Promise<void> => {
  const CARDS_DIR = getCardsDir();
  const dirInfo = await FileSystem.getInfoAsync(CARDS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CARDS_DIR, { intermediates: true });
  }
};

export const saveCardImage = async (imageUri: string): Promise<CardImage> => {
  await initializeStorage();

  const CARDS_DIR = getCardsDir();
  const timestamp = Date.now();
  const filename = `card_${timestamp}.jpg`;
  const newUri = `${CARDS_DIR}${filename}`;

  await FileSystem.copyAsync({
    from: imageUri,
    to: newUri,
  });

  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status === 'granted') {
    try {
      await MediaLibrary.saveToLibraryAsync(newUri);
    } catch (error) {
      console.error('Error saving to media library:', error);
    }
  }

  const cardImage: CardImage = {
    id: timestamp.toString(),
    uri: newUri,
    timestamp,
  };

  const savedImages = await getSavedCardImages();
  savedImages.push(cardImage);
  await FileSystem.writeAsStringAsync(
    `${CARDS_DIR}${STORAGE_KEY}.json`,
    JSON.stringify(savedImages)
  );

  return cardImage;
};

export const getSavedCardImages = async (): Promise<CardImage[]> => {
  await initializeStorage();

  const CARDS_DIR = getCardsDir();
  const storageFile = `${CARDS_DIR}${STORAGE_KEY}.json`;
  const fileInfo = await FileSystem.getInfoAsync(storageFile);

  if (!fileInfo.exists) {
    return [];
  }

  try {
    const content = await FileSystem.readAsStringAsync(storageFile);
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading saved images:', error);
    return [];
  }
};

export const deleteCardImage = async (id: string): Promise<void> => {
  const savedImages = await getSavedCardImages();
  const imageToDelete = savedImages.find((img) => img.id === id);

  if (imageToDelete) {
    try {
      await FileSystem.deleteAsync(imageToDelete.uri, { idempotent: true });
    } catch (error) {
      console.error('Error deleting image file:', error);
    }

    const CARDS_DIR = getCardsDir();
    const updatedImages = savedImages.filter((img) => img.id !== id);
    await FileSystem.writeAsStringAsync(
      `${CARDS_DIR}${STORAGE_KEY}.json`,
      JSON.stringify(updatedImages)
    );
  }
};

export const clearAllCardImages = async (): Promise<void> => {
  const savedImages = await getSavedCardImages();

  for (const image of savedImages) {
    try {
      await FileSystem.deleteAsync(image.uri, { idempotent: true });
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  }

  const CARDS_DIR = getCardsDir();
  await FileSystem.writeAsStringAsync(
    `${CARDS_DIR}${STORAGE_KEY}.json`,
    JSON.stringify([])
  );
};
