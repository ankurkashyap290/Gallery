import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  PermissionsAndroid,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import SavedPopup from './Popup';
import ImageZoom from 'react-native-image-pan-zoom';
import {
  check,
  request,
  openSettings,
  PERMISSIONS,
  RESULTS,
} from 'react-native-permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs'; // Added for file size calculation

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const DetailScreen = ({ route, navigation }) => {
  const { group, image, allPhotos } = route.params;
  const initialPhotos =
    group?.data ||
    allPhotos ||
    (image
      ? [{ node: { image: { uri: image }, timestamp: Date.now() / 1000 } }]
      : []);
  const [photos, setPhotos] = useState(initialPhotos);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [favoritedIndices, setFavoritedIndices] = useState(new Set());
  const [showPopup, setShowPopup] = useState(false);
  const [memorySaved, setMemorySaved] = useState('0 MB');
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (image && allPhotos?.length) {
      const startIndex = allPhotos.findIndex(
        item => item.node.image.uri === image,
      );
      if (startIndex >= 0) setCurrentIndex(startIndex);
    }
  }, [image, allPhotos]);

  const handleScroll = event => {
    const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setCurrentIndex(index);
  };

  const toggleFavorite = index => {
    setFavoritedIndices(prev => {
      const newSet = new Set(prev);
      newSet.has(index) ? newSet.delete(index) : newSet.add(index);
      return newSet;
    });
  };

  const requestPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        let permissions = [];
        if (Platform.Version >= 33) {
          permissions = [PERMISSIONS.ANDROID.READ_MEDIA_IMAGES];
        } else if (Platform.Version >= 30) {
          permissions = [
            PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
            PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
          ];
        } else {
          permissions = [
            PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
            PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
          ];
        }
        const validPermissions = permissions.filter(
          permission => permission != null,
        );
        for (const permission of validPermissions) {
          try {
            const result = await check(permission);
            if (result === RESULTS.DENIED) {
              const requestResult = await request(permission);
              if (requestResult !== RESULTS.GRANTED) {
                Alert.alert(
                  'Permission Required',
                  'Please enable storage access in Settings to delete photos',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: openSettings },
                  ],
                );
                return false;
              }
            } else if (result === RESULTS.BLOCKED) {
              Alert.alert(
                'Permission Required',
                'Please enable storage access in Settings to delete photos',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open Settings', onPress: openSettings },
                ],
              );
              return false;
            }
          } catch (permError) {
            console.error(`Error checking permission ${permission}:`, permError);
          }
        }
        if (Platform.Version >= 30) {
          try {
            const manageStorageResult = await check(
              PERMISSIONS.ANDROID.MANAGE_EXTERNAL_STORAGE,
            );
            if (manageStorageResult === RESULTS.DENIED) {
              Alert.alert(
                'Additional Permission Required',
                'For Android 11+, you may need to grant "All files access" permission for photo deletion. This will redirect you to settings.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Open Settings',
                    onPress: () => Linking.openSettings(),
                  },
                ],
              );
            }
          } catch (manageError) {
            console.log('MANAGE_EXTERNAL_STORAGE not available or not needed');
          }
        }
        return true;
      }
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  };

  const isDeleteAvailable = () => {
    return CameraRoll && typeof CameraRoll.deletePhotos === 'function';
  };

  // Function to get file size of a single image
  const getImageFileSize = async uri => {
    try {
      const stats = await RNFS.stat(uri);
      return stats.size; // Size in bytes
    } catch (error) {
      console.error('Error getting file size for', uri, ':', error);
      return 1024 * 1024; // 1MB fallback
    }
  };

  // Function to format file size
  const formatFileSize = bytes => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Function to calculate total size of multiple images
  const calculateTotalSize = async imageUris => {
    let totalSize = 0;
    for (const uri of imageUris) {
      const size = await getImageFileSize(uri);
      totalSize += size;
    }
    return totalSize;
  };

  const saveAllPhotoIds = async photoArray => {
    try {
      const ids = photoArray.map(photo => photo.node.id);
      await AsyncStorage.setItem('savedPhotoIds', JSON.stringify(ids));
      console.log('Photo IDs saved successfully!');
    } catch (error) {
      console.error('Error saving photo IDs:', error);
    }
  };

  const deleteUnstarredPhotos = async () => {
    try {
      if (!isDeleteAvailable()) {
        Alert.alert(
          'Feature Not Available',
          'Photo deletion is not supported. This might be due to:\n\n1. Outdated library version\n2. Platform limitations\n3. Missing permissions\n\nPhotos will be hidden instead.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Hide Photos', onPress: hideUnstarredPhotos },
          ],
        );
        return;
      }

      const hasPermission = await requestPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please grant all required permissions to delete photos.',
        );
        return;
      }

      const unstarredPhotos = photos.filter(
        (_, index) => !favoritedIndices.has(index),
      );
      const unstarredUris = unstarredPhotos.map(item => item.node.image.uri);

      if (unstarredUris.length === 0) {
        Alert.alert('Nothing to delete', 'All photos are starred.');
        return;
      }

      // Calculate total size of unstarred photos
      const totalSize = await calculateTotalSize(unstarredUris);
      const formattedSize = formatFileSize(totalSize);

      Alert.alert(
        'Confirm Delete',
        `Are you sure you want to permanently delete ${unstarredUris.length} photo(s) from your device? This will free up ${formattedSize} of storage.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Permanently',
            style: 'destructive',
            onPress: async () => {
              try {
                await CameraRoll.deletePhotos(unstarredUris);
                const newPhotos = photos.filter((_, index) =>
                  favoritedIndices.has(index),
                );
                setPhotos(newPhotos);
                saveAllPhotoIds(newPhotos);
                setFavoritedIndices(new Set());
                setCurrentIndex(0);
                setMemorySaved(formattedSize);
                setShowPopup(true);
              } catch (err) {
                console.error('Delete error:', err);
                Alert.alert(
                  'Deletion Failed',
                  `Could not delete photos: ${err.message}\n\nWould you like to hide them instead?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Hide Photos', onPress: hideUnstarredPhotos },
                  ],
                );
              }
            },
          },
        ],
      );
    } catch (error) {
      console.error('Delete photos error:', error);
      Alert.alert('Error', 'An error occurred while trying to delete photos.');
    }
  };

  const hideUnstarredPhotos = () => {
    const starredPhotos = photos.filter((_, index) =>
      favoritedIndices.has(index),
    );
    const hiddenCount = photos.length - starredPhotos.length;
    setPhotos(starredPhotos);
    setFavoritedIndices(new Set());
    setCurrentIndex(0);
    const estimatedSizePerPhoto = 2; // Fallback to estimated size for hiding
    const memorySavedAmount = `${hiddenCount * estimatedSizePerPhoto} MB`;
    setMemorySaved(memorySavedAmount);
    setShowPopup(true);
  };

  const keepAllPhotos = async () => {
    const starredPhotos = photos.filter((_, index) =>
      favoritedIndices.has(index),
    );
    setPhotos(starredPhotos);
    setFavoritedIndices(new Set());
    setCurrentIndex(0);
    try {
      const hiddenPhotos = photos.filter(
        (_, index) => !favoritedIndices.has(index),
      );
      const hiddenIds = hiddenPhotos.map(photo => photo.node.id);
      const existing = await AsyncStorage.getItem('savedPhotoIds');
      const parsed = existing ? JSON.parse(existing) : [];
      const combined = [...new Set([...parsed, ...hiddenIds])];
      await AsyncStorage.setItem('savedPhotoIds', JSON.stringify(combined));
    } catch (err) {
      console.error('Error saving hidden IDs:', err);
    }
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
    Alert.alert(
      'All Photos Kept',
      'All photos remain in your gallery, but unstarred ones are hidden in this app.',
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View>
          {group?.date && <Text style={styles.dateText}>{group.date}</Text>}
          {photos[currentIndex]?.node.timestamp && (
            <Text style={styles.timeText}>
              {new Date(
                photos[currentIndex].node.timestamp * 1000,
              ).toLocaleTimeString()}
            </Text>
          )}
        </View>
        <Text style={styles.counterText}>
          {photos.length > 0 ? currentIndex + 1 : 0} of {photos.length}
        </Text>
      </View>
      {photos.length > 0 ? (
        <>
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            onScroll={handleScroll}
            scrollEventThrottle={16}
            scrollEnabled={!isZoomed}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, idx) => idx.toString()}
            getItemLayout={(_, idx) => ({
              length: screenWidth,
              offset: screenWidth * idx,
              index: idx,
            })}
            renderItem={({ item, index }) => (
              <View style={styles.imageWrapper}>
                <ImageZoom
                  cropWidth={screenWidth}
                  cropHeight={screenHeight - 250}
                  imageWidth={screenWidth - 40}
                  imageHeight={400}
                  minScale={1}
                  maxScale={3}
                  enableSwipeDown={false}
                  enableCenterFocus
                  enableDoubleClickZoom
                  doubleClickInterval={250}
                  onMove={({ scale }) => setIsZoomed(scale > 1.01)}
                  onStartShouldSetPanResponder={evt =>
                    isZoomed || evt.nativeEvent.touches?.length > 1
                  }
                  onMoveShouldSetPanResponder={(_, gestureState) => {
                    const { dx, dy, numberActiveTouches } = gestureState;
                    if (numberActiveTouches > 1) return true;
                    if (isZoomed) return true;
                    return Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10;
                  }}
                >
                  <Image
                    source={{ uri: item.node.image.uri }}
                    style={styles.fullImage}
                    resizeMode="contain"
                  />
                </ImageZoom>
                <TouchableOpacity
                  style={styles.starIcon}
                  onPress={() => toggleFavorite(index)}
                  activeOpacity={0.7}
                >
                  <Feather
                    name="star"
                    color={favoritedIndices.has(index) ? '#FFD700' : '#fff'}
                    size={22}
                  />
                </TouchableOpacity>
              </View>
            )}
          />
          <View style={styles.dotsContainer}>
            {photos.map((_, idx) => (
              <View
                key={idx}
                style={[styles.dot, currentIndex === idx && styles.activeDot]}
              />
            ))}
          </View>
          <View style={[styles.buttons, { marginBottom: isZoomed ? 20 : 50 }]}>
            {photos.length === 1 ? (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={async () => {
                  const onlyPhoto = photos[0];
                  const onlyIndex = 0;
                  const isFavorited = favoritedIndices.has(onlyIndex);
                  if (isFavorited) {
                    Alert.alert(
                      'Info',
                      'This photo is starred and will be kept.',
                    );
                    return;
                  }
                  const hasPermission = await requestPermission();
                  if (!hasPermission) return;

                  // Calculate file size of the single photo
                  const fileSize = await getImageFileSize(onlyPhoto.node.image.uri);
                  const formattedSize = formatFileSize(fileSize);

                  Alert.alert(
                    'Delete Photo',
                    `Are you sure you want to delete this photo? This will free up ${formattedSize} of storage.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            const uri = onlyPhoto.node.image.uri;
                            const id = onlyPhoto.node.id;
                            if (isDeleteAvailable()) {
                              await CameraRoll.deletePhotos([uri]);
                            }
                            const existing = await AsyncStorage.getItem(
                              'savedPhotoIds',
                            );
                            const parsed = existing ? JSON.parse(existing) : [];
                            await AsyncStorage.setItem(
                              'savedPhotoIds',
                              JSON.stringify([...parsed, id]),
                            );
                            setPhotos([]);
                            setFavoritedIndices(new Set());
                            setCurrentIndex(0);
                            setMemorySaved(formattedSize);
                            setShowPopup(true);
                            setTimeout(() => {
                              navigation.goBack();
                            }, 1000);
                          } catch (err) {
                            console.error('Delete error:', err);
                            Alert.alert('Error', 'Failed to delete the image.');
                          }
                        },
                      },
                    ],
                  );
                }}
              >
                <Feather name="trash-2" size={18} color="#fff" />
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.keepButton}
                  onPress={keepAllPhotos}
                  activeOpacity={0.8}
                >
                  <Feather name="star" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Keep All</Text>
                </TouchableOpacity>
                {favoritedIndices.size > 0 && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={deleteUnstarredPhotos}
                    activeOpacity={0.8}
                  >
                    <Feather name="trash-2" size={18} color="#fff" />
                    <Text style={styles.buttonText}>Delete Unstarred</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No photos to display</Text>
        </View>
      )}
      <SavedPopup
        visible={showPopup}
        onClose={() => setShowPopup(false)}
        memorySaved={memorySaved}
      />
    </View>
  );
};

export default DetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F2C',
    paddingTop: 40,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dateText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  timeText: { color: '#fff', fontSize: 12 },
  counterText: { color: '#fff', fontSize: 14 },
  imageWrapper: {
    width: screenWidth,
    alignItems: 'flex-end',
    padding: 10,
  },
  fullImage: {
    width: screenWidth - 40,
    height: 400,
    borderRadius: 10,
    alignSelf: 'center',
  },
  starIcon: {
    position: 'absolute',
    bottom: 50,
    right: 10,
    borderRadius: 20,
    padding: 6,
    zIndex: 1000,
    elevation: 1000,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff60',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#fff',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  keepButton: {
    backgroundColor: '#1C1F3C',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  deleteButton: {
    backgroundColor: '#1C1F3C',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginLeft: 10,
  },
  buttonText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
  },
});