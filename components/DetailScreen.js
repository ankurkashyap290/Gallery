import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SavedPopup from './Popup';
import RNFS from 'react-native-fs';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

const DetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {group, allPhotos} = route.params;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedImages, setSelectedImages] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [memorySaved, setMemorySaved] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef(null);

  const photos = group?.data || allPhotos || [];

  useEffect(() => {
    if (allPhotos && allPhotos.length > 0) {
      const imageUri = route.params.image;
      if (imageUri) {
        const index = allPhotos.findIndex(
          photo => photo.node.image.uri === imageUri,
        );
        if (index !== -1) {
          setCurrentIndex(index);
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({index, animated: false});
          }, 100);
        }
      }
    }
  }, [allPhotos, route.params.image]);

  const getImageFileSize = async uri => {
    try {
      const stats = await RNFS.stat(uri);
      return stats.size; // Size in bytes
    } catch (error) {
      console.error('Error getting file size for', uri, ':', error);
      // Return a more reasonable fallback based on typical image sizes
      return 1024 * 1024; // 1MB fallback instead of 2MB
    }
  };

  const formatFileSize = bytes => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const calculateTotalSize = async imageUris => {
    let totalSize = 0;
    for (const uri of imageUris) {
      const size = await getImageFileSize(uri);
      totalSize += size;
    }
    return totalSize;
  };

  const toggleImageSelection = uri => {
    setSelectedImages(prev => {
      if (prev.includes(uri)) {
        return prev.filter(item => item !== uri);
      } else {
        return [...prev, uri];
      }
    });
  };

  const enterSelectionMode = () => {
    setIsSelectionMode(true);
    const currentImageUri = photos[currentIndex]?.node.image.uri;
    if (currentImageUri) {
      setSelectedImages([currentImageUri]);
    }
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedImages([]);
  };

  const saveSelectedPhotos = async () => {
    if (selectedImages.length === 0) return;

    try {
      setIsLoading(true);
      
      // Calculate actual total size of selected images
      const totalSize = await calculateTotalSize(selectedImages);
      const formattedSize = formatFileSize(totalSize);

      // Get existing saved photo IDs
      const existingSaved = await AsyncStorage.getItem('savedPhotoIds');
      const savedIds = existingSaved ? JSON.parse(existingSaved) : [];

      // Get IDs of selected photos
      const selectedPhotoIds = photos
        .filter(photo => selectedImages.includes(photo.node.image.uri))
        .map(photo => photo.node.id);

      // Add new IDs to saved list
      const updatedSavedIds = [...savedIds, ...selectedPhotoIds];
      await AsyncStorage.setItem(
        'savedPhotoIds',
        JSON.stringify(updatedSavedIds),
      );

      // Show popup with actual size
      setMemorySaved(formattedSize);
      setShowPopup(true);
      exitSelectionMode();
    } catch (error) {
      console.error('Error saving photos:', error);
      Alert.alert('Error', 'Failed to save photos. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSelectedImages = async () => {
    if (selectedImages.length === 0) return;

    try {
      setIsLoading(true);
      
      // Calculate actual total size before deletion
      const totalSize = await calculateTotalSize(selectedImages);
      const formattedSize = formatFileSize(totalSize);

      Alert.alert(
        'Delete Images',
        `Are you sure you want to delete ${selectedImages.length} image(s)? This will free up ${formattedSize} of storage.`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                // Delete images from device
                await CameraRoll.deletePhotos(selectedImages);
                
                // Show success message with actual size
                Alert.alert(
                  'Success', 
                  `Successfully deleted ${selectedImages.length} image(s) and freed up ${formattedSize} of storage.`
                );
                
                exitSelectionMode();
                navigation.goBack();
              } catch (error) {
                console.error('Error deleting images:', error);
                Alert.alert('Error', 'Failed to delete some images. Please try again.');
              }
            },
          },
        ],
      );
    } catch (error) {
      console.error('Error calculating size for deletion:', error);
      Alert.alert('Error', 'Failed to calculate image sizes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderImage = ({item, index}) => {
    const isSelected = selectedImages.includes(item.node.image.uri);
    
    return (
      <View style={styles.imageContainer}>
        <TouchableOpacity
          style={styles.imageWrapper}
          onPress={() => {
            if (isSelectionMode) {
              toggleImageSelection(item.node.image.uri);
            }
          }}
          onLongPress={() => {
            if (!isSelectionMode) {
              enterSelectionMode();
            }
          }}>
          <Image source={{uri: item.node.image.uri}} style={styles.image} />
          {isSelectionMode && (
            <View style={styles.selectionOverlay}>
              <View
                style={[
                  styles.checkbox,
                  isSelected && styles.checkboxSelected,
                ]}>
                {isSelected && <Feather name="check" size={16} color="#fff" />}
              </View>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const onViewableItemsChanged = useRef(({viewableItems}) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {isSelectionMode
            ? `${selectedImages.length} selected`
            : `${currentIndex + 1} of ${photos.length}`}
        </Text>
        
        {!isSelectionMode && (
          <TouchableOpacity
            onPress={enterSelectionMode}
            style={styles.selectButton}>
            <Feather name="check-square" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Image Gallery */}
      <FlatList
        ref={flatListRef}
        data={photos}
        renderItem={renderImage}
        keyExtractor={(item, index) => `${item.node.image.uri}-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(data, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
      />

      {/* Selection Mode Actions */}
      {isSelectionMode && (
        <View style={styles.selectionActions}>
          <TouchableOpacity
            onPress={exitSelectionMode}
            style={[styles.actionButton, styles.cancelButton]}>
            <Feather name="x" size={20} color="#666" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={saveSelectedPhotos}
            style={[styles.actionButton, styles.saveButton]}
            disabled={selectedImages.length === 0 || isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="star" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>
                  Save ({selectedImages.length})
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={deleteSelectedImages}
            style={[styles.actionButton, styles.deleteButton]}
            disabled={selectedImages.length === 0 || isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="trash-2" size={20} color="#fff" />
                <Text style={styles.deleteButtonText}>
                  Delete ({selectedImages.length})
                </Text>
              </>
            )}
          </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  selectButton: {
    padding: 8,
  },
  imageContainer: {
    width: screenWidth,
    height: screenHeight - 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  selectionOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#6A77FF',
    borderColor: '#6A77FF',
  },
  selectionActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  saveButton: {
    backgroundColor: '#6A77FF',
  },
  deleteButton: {
    backgroundColor: '#FF4444',
  },
  cancelButtonText: {
    color: '#666',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DetailScreen;