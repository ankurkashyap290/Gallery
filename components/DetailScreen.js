import React, {useEffect, useState} from 'react';
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
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
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

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

const DetailScreen = ({route, navigation}) => {
  const {group, image, allPhotos} = route.params;

  const initialPhotos =
    group?.data ||
    allPhotos ||
    (image
      ? [{node: {image: {uri: image}, timestamp: Date.now() / 1000}}]
      : []);

  const [photos, setPhotos] = useState(initialPhotos);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [favoritedIndices, setFavoritedIndices] = useState(new Set());
  const [showPopup, setShowPopup] = useState(false);
  const [memorySaved, setMemorySaved] = useState('0 MB');
  const [isZoomed, setIsZoomed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

        // Handle different Android versions properly
        if (Platform.Version >= 33) {
          // Android 13+ (API 33+)
          permissions = [PERMISSIONS.ANDROID.READ_MEDIA_IMAGES];
        } else if (Platform.Version >= 30) {
          // Android 11+ (API 30+)
          permissions = [
            PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
            PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
          ];
        } else {
          // Android 10 and below
          permissions = [
            PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
            PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
          ];
        }

        // Filter out any undefined permissions
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
                  'Buzo needs storage access to manage your photos. Please grant permission in your device settings to delete or manage photos.',
                  [
                    {text: 'Cancel', style: 'cancel'},
                    {text: 'Open Settings', onPress: () => Linking.openSettings()},
                  ],
                );
                return false;
              }
            } else if (result === RESULTS.BLOCKED) {
              Alert.alert(
                'Permission Required',
                'Buzo needs storage access to manage your photos. Please enable storage access in Settings to delete photos.',
                [
                  {text: 'Cancel', style: 'cancel'},
                  {text: 'Open Settings', onPress: () => Linking.openSettings()},
                ],
              );
              return false;
            }
          } catch (permError) {
            console.error(
              `Error checking permission ${permission}:`,
              permError,
            );
            // Continue with other permissions
          }
        }

        // For Android 11+, we might need MANAGE_EXTERNAL_STORAGE for deletion
        if (Platform.Version >= 30) {
          try {
            // Check if we can request MANAGE_EXTERNAL_STORAGE
            const manageStorageResult = await check(
              PERMISSIONS.ANDROID.MANAGE_EXTERNAL_STORAGE,
            );
            if (manageStorageResult === RESULTS.DENIED) {
              Alert.alert(
                'Additional Permission Required',
                'Buzo requires "All files access" permission on Android 11+ for photo deletion. This will redirect you to settings where you can grant this permission.',
                [
                  {text: 'Cancel', style: 'cancel'},
                  {
                    text: 'Open Settings',
                    onPress: () => {
                      // Open the specific settings page for manage external storage
                      if (Platform.OS === 'android') {
                        Linking.sendIntent('android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION');
                      } else {
                        Linking.openSettings();
                      }
                    },
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

      // iOS permissions would go here if needed
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      Alert.alert(
        'Permission Error',
        'An error occurred while requesting permissions. Please check your device settings and try again.',
      );
      return false;
    }
  };

  // const requestPermission = async () => {
  //   try {
  //     if (Platform.OS === 'android') {
  //       const permissions = [];

  //       if (Platform.Version >= 33) {
  //         permissions.push(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
  //       } else {
  //         permissions.push(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
  //       }

  //       // For deletion, we might need MANAGE_EXTERNAL_STORAGE on Android 11+
  //       if (Platform.Version >= 30) {
  //         permissions.push(PERMISSIONS.ANDROID.MANAGE_EXTERNAL_STORAGE);
  //       }

  //       for (const permission of permissions) {
  //         const result = await check(permission);

  //         if (result === RESULTS.DENIED) {
  //           const requestResult = await request(permission);
  //           if (requestResult !== RESULTS.GRANTED) {
  //             return false;
  //           }
  //         } else if (result === RESULTS.BLOCKED) {
  //           Alert.alert(
  //             'Permission Required',
  //             'Please enable photo access in Settings to delete photos',
  //             [
  //               {text: 'Cancel', style: 'cancel'},
  //               {text: 'Open Settings', onPress: openSettings},
  //             ],
  //           );
  //           return false;
  //         }
  //       }
  //       return true;
  //     }
  //     return true;
  //   } catch (error) {
  //     console.error('Permission error:', error);
  //     return false;
  //   }
  // };

  const isDeleteAvailable = () => {
    return CameraRoll && typeof CameraRoll.deletePhotos === 'function';
  };

  const saveAllPhotoIds = async photoArray => {
    try {
      // Extract just the IDs
      const ids = photoArray.map(photo => photo.node.id);

      // Save the array of IDs in AsyncStorage
      await AsyncStorage.setItem('savedPhotoIds', JSON.stringify(ids));

      console.log('Photo IDs saved successfully!');
    } catch (error) {
      console.error('Error saving photo IDs:', error);
    }
  };

  const deleteUnstarredPhotos = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      console.log('Delete function called');
      console.log('CameraRoll object:', CameraRoll);
      console.log('deletePhotos available:', typeof CameraRoll.deletePhotos);

      if (!isDeleteAvailable()) {
        Alert.alert(
          'Feature Not Available',
          'Photo deletion is not supported on your device. This might be due to:\n\n1. Platform limitations\n2. Missing permissions\n3. Device restrictions\n\nBuzo will hide the photos instead of deleting them.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Hide Photos', onPress: hideUnstarredPhotos},
          ],
        );
        setIsProcessing(false);
        return;
      }

      const hasPermission = await requestPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Buzo needs storage permissions to delete photos. Please grant the required permissions in your device settings.',
        );
        setIsProcessing(false);
        return;
      }

      const unstarredPhotos = photos.filter(
        (_, index) => !favoritedIndices.has(index),
      );

      const unstarredUris = unstarredPhotos.map(item => item.node.image.uri);

      if (unstarredUris.length === 0) {
        Alert.alert('Nothing to delete', 'All photos are starred.');
        setIsProcessing(false);
        return;
      }

      console.log('Photos to delete:', unstarredUris);

      Alert.alert(
        'Confirm Delete',
        `Are you sure you want to permanently delete ${unstarredUris.length} photo(s) from your device?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Delete Permanently',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('Attempting to delete photos...');

                // Try to delete photos
                const result = await CameraRoll.deletePhotos(unstarredUris);
                // const result = await CameraRoll.getPhotos`(unstarredUris)`;
                console.log('Delete result:', result);

                // Update UI - keep only starred photos
                const newPhotos = photos.filter((_, index) =>
                  favoritedIndices.has(index),
                );
                setPhotos(newPhotos);
                saveAllPhotoIds(newPhotos);
                setFavoritedIndices(new Set());
                setCurrentIndex(0);

                // Calculate memory saved
                const deletedCount = unstarredUris.length;
                const estimatedSizePerPhoto = 2; // MB
                const memorySavedAmount = `${
                  deletedCount * estimatedSizePerPhoto
                } MB`;
                setMemorySaved(memorySavedAmount);
                
                // Show popup only once
                setTimeout(() => {
                  setShowPopup(true);
                  setIsProcessing(false);
                }, 100);
              } catch (err) {
                console.error('Delete error:', err);

                // If deletion fails, offer to hide instead
                Alert.alert(
                  'Deletion Failed',
                  `Buzo could not delete photos: ${err.message}\n\nWould you like to hide them from the gallery instead?`,
                  [
                    {text: 'Cancel', style: 'cancel'},
                    {text: 'Hide Photos', onPress: hideUnstarredPhotos},
                  ],
                );
                setIsProcessing(false);
              }
            },
          },
        ],
      );
    } catch (error) {
      console.error('Delete photos error:', error);
      Alert.alert(
        'Error', 
        'Buzo encountered an error while trying to delete photos. Please try again or check your device permissions.'
      );
      setIsProcessing(false);
    }
  };

  const hideUnstarredPhotos = () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const starredPhotos = photos.filter((_, index) =>
      favoritedIndices.has(index),
    );
    const hiddenCount = photos.length - starredPhotos.length;

    setPhotos(starredPhotos);
    setFavoritedIndices(new Set());
    setCurrentIndex(0);

    const estimatedSizePerPhoto = 2;
    const memorySavedAmount = `${hiddenCount * estimatedSizePerPhoto} MB`;
    setMemorySaved(memorySavedAmount);
    
    setTimeout(() => {
      setShowPopup(true);
      setIsProcessing(false);
    }, 100);
  };

  const keepAllPhotos = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

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

    // Delay navigation to show popup
    setTimeout(() => {
      navigation.goBack();
      setIsProcessing(false);
    }, 1000);

    Alert.alert(
      'All Photos Kept',
      'All photos remain in your device gallery, but unstarred ones are now hidden in Buzo.',
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
            renderItem={({item, index}) => (
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
                  onMove={({scale}) => setIsZoomed(scale > 1.01)}
                  onStartShouldSetPanResponder={evt =>
                    isZoomed || evt.nativeEvent.touches?.length > 1
                  }
                  onMoveShouldSetPanResponder={(_, gestureState) => {
                    const {dx, dy, numberActiveTouches} = gestureState;
                    if (numberActiveTouches > 1) return true;
                    if (isZoomed) return true;
                    return Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10;
                  }}>
                  <Image
                    source={{uri: item.node.image.uri}}
                    style={styles.fullImage}
                    resizeMode="contain"
                  />
                </ImageZoom>

                <TouchableOpacity
                  style={styles.starIcon}
                  onPress={() => toggleFavorite(index)}
                  activeOpacity={0.7}>
                  <Feather
                    name="star"
                    color={favoritedIndices.has(index) ? '#FFD700' : '#fff'}
                    size={22}
                  />
                </TouchableOpacity>
              </View>
            )}
          />
          {/* {photos.length === 1 && (
            <TouchableOpacity
              onPress={async () => {
                const photoToDelete = photos[0];
                const hasPermission = await requestPermission();
                if (!hasPermission) return;

                Alert.alert(
                  'Delete Photo',
                  'Are you sure you want to delete this photo?',
                  [
                    {text: 'Cancel', style: 'cancel'},
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          const uri = photoToDelete.node.image.uri;
                          const id = photoToDelete.node.id;

                          await CameraRoll.deletePhotos([uri]);

                          // Save the deleted photo ID to AsyncStorage
                          const existing = await AsyncStorage.getItem(
                            'savedPhotoIds',
                          );
                          const parsed = existing ? JSON.parse(existing) : [];
                          await AsyncStorage.setItem(
                            'savedPhotoIds',
                            JSON.stringify([...parsed, id]),
                          );

                          Alert.alert('Deleted', 'Photo was deleted.');
                          navigation.goBack();
                        } catch (err) {
                          console.error('Delete error:', err);
                          Alert.alert('Error', 'Failed to delete the image.');
                        }
                      },
                    },
                  ],
                );
              }}
              style={{
                marginTop: 10,
                backgroundColor: '#ff3b30',
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 10,
              }}>
              <Text style={{color: 'white', fontWeight: '600'}}>Delete</Text>
            </TouchableOpacity>
          )} */}

          <View style={styles.dotsContainer}>
            {photos.map((_, idx) => (
              <View
                key={idx}
                style={[styles.dot, currentIndex === idx && styles.activeDot]}
              />
            ))}
          </View>

          <View style={[styles.buttons, {marginBottom: isZoomed ? 20 : 50}]}>
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

                  Alert.alert(
                    'Delete Photo',
                    'Are you sure you want to delete this photo?',
                    [
                      {text: 'Cancel', style: 'cancel'},
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

                            // Save deleted photo ID to AsyncStorage
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
                            setMemorySaved(`2 MB`);
                            
                            setTimeout(() => {
                              setShowPopup(true);
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
                }}>
                <Feather name="trash-2" size={18} color="#fff" />
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.keepButton}
                  onPress={keepAllPhotos}
                  activeOpacity={0.8}>
                  <Feather name="star" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Keep All</Text>
                </TouchableOpacity>

                {favoritedIndices.size > 0 && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={deleteUnstarredPhotos}
                    activeOpacity={0.8}>
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
        onClose={() => {
          setShowPopup(false);
          setIsProcessing(false);
        }}
        memorySaved={memorySaved}
      />
    </View>
  );
};

export default DetailScreen;

// ... rest of your styles remain the same
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
  dateText: {color: '#fff', fontSize: 14, fontWeight: '600'},
  timeText: {color: '#fff', fontSize: 12},
  counterText: {color: '#fff', fontSize: 14},
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
    // marginBottom: 60,
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
});
