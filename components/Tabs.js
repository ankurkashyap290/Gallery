// import React, {useState, useEffect} from 'react';
// import {
//   View,
//   Text,
//   Image,
//   FlatList,
//   StyleSheet,
//   PermissionsAndroid,
//   Platform,
//   TouchableOpacity,
//   Pressable,
//   Dimensions,
//   ActivityIndicator,
//   Modal
// } from 'react-native';
// import {CameraRoll} from '@react-native-camera-roll/camera-roll';
// import {useNavigation, useFocusEffect} from '@react-navigation/native';
// import Header from './Header';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const screenWidth = Dimensions.get('window').width;
// const GROUPS_PER_BATCH = 10;
// const spacing = 4;
// const box = (screenWidth - spacing * 4) / 3;

// const GalleryScreen = () => {
//   const [photos, setPhotos] = useState([]);
//   const [visiblePhotos, setVisiblePhotos] = useState([]);
//   const [loadedGroups, setLoadedGroups] = useState(1);
//   const [activeTab, setActiveTab] = useState('list');
//   const [loading, setLoading] = useState(false);
//   const [hasMore, setHasMore] = useState(true);
//   const [selectedGroup, setSelectedGroup] = useState(null);
//   const [refreshing, setRefreshing] = useState(false);

//   const [menuVisible, setMenuVisible] = useState(false); 

//   const navigation = useNavigation();

//   useEffect(() => {
//     requestPermissions().then(fetchImages);
//   }, []);

//   useFocusEffect(
//     React.useCallback(() => {
//       fetchImages();
//     }, []),
//   );

//   const getSavedPhotoIds = async () => {
//     try {
//       const saved = await AsyncStorage.getItem('savedPhotoIds');
//       return saved ? JSON.parse(saved) : [];
//     } catch (error) {
//       console.error('Error fetching photo IDs:', error);
//       return [];
//     }
//   };
//   const onRefresh = async () => {
//     setRefreshing(true);
//     await fetchImages();
//     setRefreshing(false);
//   };

//   const requestPermissions = async () => {
//     if (Platform.OS === 'android') {
//       try {
//         const permission =
//           Platform.Version >= 33
//             ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
//             : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
//         const granted = await PermissionsAndroid.request(permission, {
//           title: 'Access to your gallery',
//           message: 'We need access to display your photos',
//           buttonPositive: 'OK',
//         });
//         if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
//           console.warn('Permission denied');
//         }
//       } catch (err) {
//         console.error('Permission error:', err);
//       }
//     }
//   };

//   const fetchImages = async () => {
//     try {
//       setLoading(true);
//       const result = await CameraRoll.getPhotos({
//         first: 500, // Increased to get more photos
//         assetType: 'Photos',
//       });
//       const groupedPhotos = groupPhotosByTimeWindow(result.edges, 10);
//       console.log(groupedPhotos);

//       const savedPhotoIds = await getSavedPhotoIds();
//       const filteredGroups = groupedPhotos
//         .map(group => ({
//           ...group,
//           data: group.data.filter(
//             photo => !savedPhotoIds.includes(photo.node.id),
//           ),
//         }))

//         .filter(group => group.data.length > 0); // Optional: remove empty groups
//       console.log(groupedPhotos);
//       // Step 3: Set filtered photos
//       setPhotos(filteredGroups);

//       // Initialize visible photos
//       const initialVisible = filteredGroups.slice(0, GROUPS_PER_BATCH);
//       setVisiblePhotos(initialVisible);
//       setLoadedGroups(1);
//       setHasMore(filteredGroups.length > GROUPS_PER_BATCH);
//     } catch (error) {
//       console.error('Failed to fetch images:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const groupPhotosByTimeWindow = (photos, windowSeconds = 10) => {
//     if (!photos.length) return [];

//     const sorted = [...photos].sort(
//       (a, b) => b.node.timestamp - a.node.timestamp,
//     );

//     const groups = [];
//     let currentGroup = [sorted[0]];
//     let lastTimestamp = sorted[0].node.timestamp;

//     for (let i = 1; i < sorted.length; i++) {
//       const photo = sorted[i];
//       const currentTimestamp = photo.node.timestamp;

//       if (lastTimestamp - currentTimestamp <= windowSeconds) {
//         currentGroup.push(photo);
//       } else {
//         groups.push({
//           timeRange: new Date(
//             currentGroup[0].node.timestamp * 1000,
//           ).toLocaleTimeString(),
//           data: currentGroup,
//         });
//         currentGroup = [photo];
//       }
//       lastTimestamp = currentTimestamp;
//     }

//     if (currentGroup.length) {
//       groups.push({
//         timeRange: new Date(
//           currentGroup[0].node.timestamp * 1000,
//         ).toLocaleTimeString(),
//         data: currentGroup,
//       });
//     }

//     return groups;
//   };

//   const getFlatPhotoList = () => {
//     return photos.flatMap(group => group.data);
//   };

//   const deleteImage = async uri => {
//     try {
//       await CameraRoll.deletePhotos([uri]);
//       const updated = photos
//         .map(group => ({
//           ...group,
//           data: group.data.filter(photo => photo.node.image.uri !== uri),
//         }))
//         .filter(group => group.data.length > 0);
//       setPhotos(updated);

//       // Update visible photos as well
//       const updatedVisible = visiblePhotos
//         .map(group => ({
//           ...group,
//           data: group.data.filter(photo => photo.node.image.uri !== uri),
//         }))
//         .filter(group => group.data.length > 0);
//       setVisiblePhotos(updatedVisible);
//     } catch (error) {
//       console.error('Failed to delete image:', error);
//     }
//   };

//   const handleLoadMore = () => {
//     // Prevent multiple simultaneous loads
//     if (loading || !hasMore) return;

//     setLoading(true);

//     setTimeout(() => {
//       const nextGroupCount = loadedGroups + 1;
//       const startIndex = 0;
//       const endIndex = nextGroupCount * GROUPS_PER_BATCH;

//       const nextVisible = photos.slice(startIndex, endIndex);

//       console.log('Loading more:', {
//         currentGroups: loadedGroups,
//         nextGroupCount,
//         totalPhotos: photos.length,
//         visibleCount: nextVisible.length,
//         endIndex,
//       });

//       if (nextVisible.length > visiblePhotos.length) {
//         setVisiblePhotos(nextVisible);
//         setLoadedGroups(nextGroupCount);

//         // Check if we've loaded all available groups
//         if (endIndex >= photos.length) {
//           setHasMore(false);
//         }
//       } else {
//         setHasMore(false);
//       }

//       setLoading(false);
//     }, 500); // Small delay to prevent rapid firing
//   };

//   // Reset visible photos when tab changes
//   useEffect(() => {
//     const initialVisible = photos.slice(0, GROUPS_PER_BATCH);
//     setVisiblePhotos(initialVisible);
//     setLoadedGroups(1);
//     setHasMore(photos.length > GROUPS_PER_BATCH);
//   }, [activeTab, photos]);

//   const renderTabs = () => (
//     <View style={styles.tabWrapper}>
//       <View style={styles.tabContainer}>
//         <Pressable
//           onPress={() => setActiveTab('list')}
//           style={[styles.tab, activeTab === 'list' && styles.activeTab]}>
//           <Text
//             style={[styles.tabText, activeTab === 'list' && styles.activeText]}>
//             List View
//           </Text>
//         </Pressable>
//         <Pressable
//           onPress={() => setActiveTab('grid')}
//           style={[styles.tab, activeTab === 'grid' && styles.activeTab]}>
//           <Text
//             style={[styles.tabText, activeTab === 'grid' && styles.activeText]}>
//             Grid View
//           </Text>
//         </Pressable>
//       </View>
//     </View>
//   );

//   const renderGroupCard = ({item}) => {
//     const thumbnail = item.data[0]?.node.image.uri;
//     console.log('item', item);
//     return (
//       <TouchableOpacity
//         style={styles.gridGroupCard}
//         onPress={() => {
//           setSelectedGroup(item);
//           navigation.navigate('Detail', {group: item});
//         }}>
//         <Image
//           source={{uri: thumbnail}}
//           style={styles.gridThumbnail}
//           resizeMode="cover"
//         />
//         <Text style={styles.gridDateText}>{item.timeRange}</Text>
//         <Text style={styles.photoCount}>{item.data.length} Photos</Text>
//       </TouchableOpacity>
//     );
//   };

//   const renderImageItem = ({item}) => (
//     <TouchableOpacity
//       onPress={() =>
//         navigation.navigate('Detail', {
//           image: item.node.image.uri,
//           allPhotos: getFlatPhotoList(),
//         })
//       }
//       style={[
//         styles.imageContainer,
//         activeTab === 'list' && styles.listItemContainer,
//       ]}>
//       <Image
//         source={{uri: item.node.image.uri}}
//         style={[styles.images, activeTab === 'list' && styles.listImage]}
//       />
//     </TouchableOpacity>
//   );

//   const renderFooter = () => {
//     if (!loading) return null;
//     return (
//       <View style={styles.loadingFooter}>
//         <ActivityIndicator size="small" color="#0F1E5D" />
//         <Text style={styles.loadingText}>Loading more photos...</Text>
//       </View>
//     );
//   };

//   const renderListView = images => {
//     console.log('images', images);
//     const count = images.length;
//     return (
//       <TouchableOpacity
//         // style={styles.gridGroupCard}
//         onPress={() =>
//           navigation.navigate('Detail', {
//             // image: images[0].node.image.uri,
//             allPhotos: images,
//           })
//         }>
//         <View style={styles.container}>
//           {count === 1 && (
//             <Image
//               source={{uri: images[0].node.image.uri}}
//               style={styles.fullWidthImage}
//             />
//           )}

//           {count === 2 && (
//             <View style={styles.row}>
//               {images.map((img, i) => (
//                 <Image
//                   key={i}
//                   source={{uri: img.node.image.uri}}
//                   style={styles.halfWidthImage}
//                 />
//               ))}
//             </View>
//           )}

//           {count === 3 && (
//             <>
//               <View style={styles.row}>
//                 <Image
//                   source={{uri: images[0].node.image.uri}}
//                   style={styles.smallImage}
//                 />
//                 <Image
//                   source={{uri: images[1].node.image.uri}}
//                   style={styles.smallImage}
//                 />
//               </View>
//               <Image
//                 source={{uri: images[2].node.image.uri}}
//                 style={styles.fullWidthImage}
//               />
//             </>
//           )}

//           {count === 4 && (
//             <>
//               <View style={styles.row}>
//                 <Image
//                   source={{uri: images[0].node.image.uri}}
//                   style={styles.smallImage}
//                 />
//                 <Image
//                   source={{uri: images[1].node.image.uri}}
//                   style={styles.smallImage}
//                 />
//               </View>
//               <View style={styles.row}>
//                 <Image
//                   source={{uri: images[2].node.image.uri}}
//                   style={styles.smallImage}
//                 />
//                 <Image
//                   source={{uri: images[3].node.image.uri}}
//                   style={styles.smallImage}
//                 />
//               </View>
//             </>
//           )}

//           {count === 5 && (
//             <>
//               <View style={styles.row}>
//                 <Image
//                   source={{uri: images[0].node.image.uri}}
//                   style={styles.smallImage}
//                 />
//                 <Image
//                   source={{uri: images[1].node.image.uri}}
//                   style={styles.smallImage}
//                 />
//                 <Image
//                   source={{uri: images[2].node.image.uri}}
//                   style={styles.smallImage}
//                 />
//               </View>
//               <View style={styles.row}>
//                 <Image
//                   source={{uri: images[3].node.image.uri}}
//                   style={styles.smallImage}
//                 />
//                 <Image
//                   source={{uri: images[4].node.image.uri}}
//                   style={styles.mediumImage}
//                 />
//               </View>
//             </>
//           )}
//           {count > 5 && Math.floor(Math.random() * 2) + 1 === 1 && (
//             <View>
//               {/* Top Row */}
//               <View style={styles.row}>
//                 <Image
//                   source={{uri: images[0].node.image.uri}}
//                   style={styles.smallImage}
//                 />
//                 <Image
//                   source={{uri: images[1].node.image.uri}}
//                   style={styles.smallImage}
//                 />
//                 <Image
//                   source={{uri: images[2].node.image.uri}}
//                   style={styles.smallImage}
//                 />
//               </View>

//               {/* Bottom Mosaic */}
//               <View style={styles.row}>
//                 <View style={styles.leftStack}>
//                   <Image
//                     source={{uri: images[3].node.image.uri}}
//                     style={styles.squareImage}
//                   />
//                   <Image
//                     source={{uri: images[5].node.image.uri}}
//                     style={styles.squareImage}
//                   />
//                 </View>
//                 <Image
//                   source={{uri: images[4].node.image.uri}}
//                   style={styles.tallImage}
//                 />
//               </View>
//             </View>
//           )}
//         </View>
//       </TouchableOpacity>
//     );
//   };

//   const handleMenuPress = () => {
//   setMenuVisible(true); // Open menu
// };

// const closeMenu = () => {
//   setMenuVisible(false); // Close menu
// };


//   return (
//     <View style={styles.outerContainer}>
//       <Header onMenuPress={handleMenuPress} />
//           <Modal
//   visible={menuVisible}
//   transparent
//   animationType="slide"
//   onRequestClose={closeMenu}>
  
//   {/* Overlay to detect outside press */}
//   <TouchableOpacity style={styles.modalOverlay} onPress={closeMenu}>
//     <View style={styles.menuContainer}>
//       <Text style={styles.menuItem}>Option 1</Text>
//       <Text style={styles.menuItem}>Option 2</Text>
//       <Text style={styles.menuItem}>Option 3</Text>
//     </View>
//   </TouchableOpacity>
// </Modal>
//       {renderTabs()}
//       <FlatList
//         data={visiblePhotos} // Now correctly using visiblePhotos
//         key={activeTab}
//         keyExtractor={(item, index) => `${item.timeRange}-${index}`}
//         renderItem={({item}) =>
//           activeTab === 'grid' ? (
//             renderGroupCard({item})
//           ) : (
//             <View style={{marginBottom: 16, paddingHorizontal: 10}}>
//               <Text style={styles.listDateText}>{item.timeRange}</Text>
//               {renderListView(item.data)}
//               {/* <FlatList
//                 data={item.data}
//                 keyExtractor={(imgItem, index) =>
//                   `${imgItem.node.image.uri}-${index}`
//                 }
//                 renderItem={renderImageItem}
//               /> */}
//             </View>
//           )
//         }
//         numColumns={activeTab === 'grid' ? 2 : 1}
//         columnWrapperStyle={
//           activeTab === 'grid' ? {justifyContent: 'space-between'} : null
//         }
//         contentContainerStyle={{paddingBottom: 100}}
//         showsVerticalScrollIndicator={false}
//         onEndReached={handleLoadMore}
//         onEndReachedThreshold={0.3} // Reduced threshold
//         ListFooterComponent={renderFooter}
//         refreshing={refreshing} // <- NEW
//         onRefresh={onRefresh}
//       />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   outerContainer: {flex: 1, backgroundColor: '#E4EAFD'},
//   tabWrapper: {
//     backgroundColor: '#e7edff',
//     borderTopLeftRadius: 35,
//     borderTopRightRadius: 35,
//     marginTop: -40,
//   },
//   tabContainer: {
//     flexDirection: 'row',
//     backgroundColor: '#E4EAFD',
//     borderRadius: 40,
//     marginHorizontal: 20,
//     padding: 5,
//     alignSelf: 'center',
//     zIndex: 10,
//     width: '90%',
//     marginTop: 20,
//   },
//   tab: {flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 30},
//   activeTab: {backgroundColor: '#fff'},
//   tabText: {fontSize: 14, fontWeight: '600', color: '#6b6b6b'},
//   activeText: {color: '#1a1a1a', fontWeight: '700'},
//   imageContainer: {
//     margin: 5,
//     position: 'relative',
//     height: 120,
//     borderRadius: 10,
//   },
//   listItemContainer: {flexDirection: 'row', alignItems: 'center', height: 100},
//   images: {width: '100%', height: '100%', borderRadius: 10},
//   listImage: {width: 100, height: 100, marginRight: 10},
//   gridGroupCard: {
//     borderRadius: 16,
//     paddingVertical: 16,
//     paddingHorizontal: 10,
//     margin: 4,
//     alignItems: 'center',
//     width: '45%',
//     marginBottom: -20,
//   },
//   gridThumbnail: {
//     width: 150,
//     height: 150,
//     borderRadius: 12,
//     marginBottom: 10,
//   },
//   gridDateText: {
//     fontSize: 15,
//     fontWeight: 'bold',
//     color: '#0F1E5D',
//     textAlign: 'center',
//   },
//   listDateText: {
//     fontSize: 15,
//     fontWeight: 'bold',
//     color: '#0F1E5D',
//     textAlign: 'left',
//     margin: 10,
//   },
//   photoCount: {fontSize: 13, color: '#888', textAlign: 'center'},
//   loadingFooter: {
//     paddingVertical: 20,
//     alignItems: 'center',
//   },
//   loadingText: {
//     marginTop: 10,
//     fontSize: 14,
//     color: '#666',
//   },
//   fullWidthImage: {
//     width: screenWidth - 30,
//     height: box * 2,
//     borderRadius: 10,
//   },
//   halfWidthImage: {
//     flex: 1,
//     height: box * 1.5,
//     marginRight: spacing,
//     borderRadius: 10,
//   },
//   smallImage: {
//     flex: 1,
//     aspectRatio: 1,
//     marginRight: spacing,
//     borderRadius: 10,
//     height: 10,
//     width: 10,
//   },
//   mediumImage: {
//     flex: 1,
//     aspectRatio: 1.2,
//     marginRight: spacing,
//     borderRadius: 10,
//   },
//   container: {
//     padding: spacing,
//   },
//   row: {
//     flexDirection: 'row',
//     marginBottom: spacing,
//   },
//   squareImage: {
//     width: box - 30,
//     height: box,
//     borderRadius: 10,
//     marginRight: spacing,
//     marginBottom: spacing,
//   },
//   tallImage: {
//     width: box * 2 + spacing,
//     height: box * 2 + spacing,
//     borderRadius: 10,
//   },
//   leftStack: {
//     justifyContent: 'space-between',
//     marginRight: spacing,
//   },

//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.3)',
//     justifyContent: 'flex-start',
//   },
//   menuContainer: {
//     backgroundColor: '#fff',
//     padding: 20,
//     paddingTop: 50,
//     borderBottomRightRadius: 20,
//     borderBottomLeftRadius: 20,
//   },
//   menuItem: {
//     fontSize: 18,
//     marginVertical: 10,
//   },

// });

// export default GalleryScreen;
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  TouchableOpacity,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import Header from './Header';
import SideMenu from './SideMenu';
import AsyncStorage from '@react-native-async-storage/async-storage';

const screenWidth = Dimensions.get('window').width;
const GROUPS_PER_BATCH = 10;
const spacing = 4;
const box = (screenWidth - spacing * 4) / 3;

const GalleryScreen = () => {
  const [photos, setPhotos] = useState([]);
  const [visiblePhotos, setVisiblePhotos] = useState([]);
  const [loadedGroups, setLoadedGroups] = useState(1);
  const [activeTab, setActiveTab] = useState('list');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);

  const navigation = useNavigation();

  useEffect(() => {
    requestPermissions().then(fetchImages);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchImages();
    }, []),
  );
  const getSavedPhotoIds = async () => {
    try {
      const saved = await AsyncStorage.getItem('savedPhotoIds');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error fetching photo IDs:', error);
      return [];
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchImages();
    setRefreshing(false);
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const permission =
          Platform.Version >= 33
            ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
            : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        const granted = await PermissionsAndroid.request(permission, {
          title: 'Access to your gallery',
          message: 'We need access to display your photos',
          buttonPositive: 'OK',
        });
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Permission Required',
            'Buzzo needs access to your photos to display your gallery. Please grant permission in your device settings to use this feature.',
            [
              {text: 'Cancel', style: 'cancel'},
              {text: 'Open Settings', onPress: () => {
                Linking.openSettings();
              }},
            ]
          );
          return false;
        }
        return true;
      } catch (err) {
        console.error('Permission error:', err);
        Alert.alert(
          'Error',
          'An error occurred while requesting permissions. Please try again or check your device settings.',
        );
        return false;
      }
    }
    return true;
  };

  const fetchImages = async () => {
    try {
      setLoading(true);
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setLoading(false);
        return;
      }

      const result = await CameraRoll.getPhotos({
        first: 500, // Increased to get more photos
        assetType: 'Photos',
      });
      const groupedPhotos = groupPhotosByTimeWindow(result.edges, 10);
      console.log(groupedPhotos);

      const savedPhotoIds = await getSavedPhotoIds();
      const filteredGroups = groupedPhotos
        .map(group => ({
          ...group,
          data: group.data.filter(
            photo => !savedPhotoIds.includes(photo.node.id),
          ),
        }))

        .filter(group => group.data.length > 0); // Optional: remove empty groups
      console.log(groupedPhotos);
      // Step 3: Set filtered photos
      setPhotos(filteredGroups);

      // Initialize visible photos
      const initialVisible = filteredGroups.slice(0, GROUPS_PER_BATCH);
      setVisiblePhotos(initialVisible);
      setLoadedGroups(1);
      setHasMore(filteredGroups.length > GROUPS_PER_BATCH);
    } catch (error) {
      console.error('Failed to fetch images:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupPhotosByTimeWindow = (photos, windowSeconds = 10) => {
    if (!photos.length) return [];

    const sorted = [...photos].sort(
      (a, b) => b.node.timestamp - a.node.timestamp,
    );

    const groups = [];
    let currentGroup = [sorted[0]];
    let lastTimestamp = sorted[0].node.timestamp;

    for (let i = 1; i < sorted.length; i++) {
      const photo = sorted[i];
      const currentTimestamp = photo.node.timestamp;

      if (lastTimestamp - currentTimestamp <= windowSeconds) {
        currentGroup.push(photo);
      } else {
        groups.push({
          timeRange: new Date(
            currentGroup[0].node.timestamp * 1000,
          ).toLocaleTimeString(),
          data: currentGroup,
        });
        currentGroup = [photo];
      }
      lastTimestamp = currentTimestamp;
    }

    if (currentGroup.length) {
      groups.push({
        timeRange: new Date(
          currentGroup[0].node.timestamp * 1000,
        ).toLocaleTimeString(),
        data: currentGroup,
      });
    }

    return groups;
  };

  const getFlatPhotoList = () => {
    return photos.flatMap(group => group.data);
  };

  const deleteImage = async uri => {
    try {
      await CameraRoll.deletePhotos([uri]);
      const updated = photos
        .map(group => ({
          ...group,
          data: group.data.filter(photo => photo.node.image.uri !== uri),
        }))
        .filter(group => group.data.length > 0);
      setPhotos(updated);

      // Update visible photos as well
      const updatedVisible = visiblePhotos
        .map(group => ({
          ...group,
          data: group.data.filter(photo => photo.node.image.uri !== uri),
        }))
        .filter(group => group.data.length > 0);
      setVisiblePhotos(updatedVisible);
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  const handleLoadMore = () => {
    // Prevent multiple simultaneous loads
    if (loading || !hasMore) return;

    setLoading(true);

    setTimeout(() => {
      const nextGroupCount = loadedGroups + 1;
      const startIndex = 0;
      const endIndex = nextGroupCount * GROUPS_PER_BATCH;

      const nextVisible = photos.slice(startIndex, endIndex);

      console.log('Loading more:', {
        currentGroups: loadedGroups,
        nextGroupCount,
        totalPhotos: photos.length,
        visibleCount: nextVisible.length,
        endIndex,
      });

      if (nextVisible.length > visiblePhotos.length) {
        setVisiblePhotos(nextVisible);
        setLoadedGroups(nextGroupCount);

        // Check if we've loaded all available groups
        if (endIndex >= photos.length) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }

      setLoading(false);
    }, 500); // Small delay to prevent rapid firing
  };

  // Reset visible photos when tab changes
  useEffect(() => {
    const initialVisible = photos.slice(0, GROUPS_PER_BATCH);
    setVisiblePhotos(initialVisible);
    setLoadedGroups(1);
    setHasMore(photos.length > GROUPS_PER_BATCH);
  }, [activeTab, photos]);

  const renderTabs = () => (
    <View style={styles.tabWrapper}>
      <View style={styles.tabContainer}>
        <Pressable
          onPress={() => setActiveTab('list')}
          style={[styles.tab, activeTab === 'list' && styles.activeTab]}>
          <Text
            style={[styles.tabText, activeTab === 'list' && styles.activeText]}>
            List View
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('grid')}
          style={[styles.tab, activeTab === 'grid' && styles.activeTab]}>
          <Text
            style={[styles.tabText, activeTab === 'grid' && styles.activeText]}>
            Grid View
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const renderGroupCard = ({item}) => {
    const thumbnail = item.data[0]?.node.image.uri;
    console.log('item', item);
    return (
      <TouchableOpacity
        style={styles.gridGroupCard}
        onPress={() => {
          setSelectedGroup(item);
          navigation.navigate('Detail', {group: item});
        }}>
        <Image
          source={{uri: thumbnail}}
          style={styles.gridThumbnail}
          resizeMode="cover"
        />
        <Text style={styles.gridDateText}>{item.timeRange}</Text>
        <Text style={styles.photoCount}>{item.data.length} Photos</Text>
      </TouchableOpacity>
    );
  };

  const renderImageItem = ({item}) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate('Detail', {
          image: item.node.image.uri,
          allPhotos: getFlatPhotoList(),
        })
      }
      style={[
        styles.imageContainer,
        activeTab === 'list' && styles.listItemContainer,
      ]}>
      <Image
        source={{uri: item.node.image.uri}}
        style={[styles.images, activeTab === 'list' && styles.listImage]}
      />
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#0F1E5D" />
        <Text style={styles.loadingText}>Loading more photos...</Text>
      </View>
    );
  };

  const renderListView = images => {
    console.log('images', images);
    const count = images.length;
    return (
      <TouchableOpacity
        // style={styles.gridGroupCard}
        onPress={() =>
          navigation.navigate('Detail', {
            // image: images[0].node.image.uri,
            allPhotos: images,
          })
        }>
        <View style={styles.container}>
          {count === 1 && (
            <Image
              source={{uri: images[0].node.image.uri}}
              style={styles.fullWidthImage}
            />
          )}

          {count === 2 && (
            <View style={styles.row}>
              {images.map((img, i) => (
                <Image
                  key={i}
                  source={{uri: img.node.image.uri}}
                  style={styles.halfWidthImage}
                />
              ))}
            </View>
          )}

          {count === 3 && (
            <>
              <View style={styles.row}>
                <Image
                  source={{uri: images[0].node.image.uri}}
                  style={styles.smallImage}
                />
                <Image
                  source={{uri: images[1].node.image.uri}}
                  style={styles.smallImage}
                />
              </View>
              <Image
                source={{uri: images[2].node.image.uri}}
                style={styles.fullWidthImage}
              />
            </>
          )}

          {count === 4 && (
            <>
              <View style={styles.row}>
                <Image
                  source={{uri: images[0].node.image.uri}}
                  style={styles.smallImage}
                />
                <Image
                  source={{uri: images[1].node.image.uri}}
                  style={styles.smallImage}
                />
              </View>
              <View style={styles.row}>
                <Image
                  source={{uri: images[2].node.image.uri}}
                  style={styles.smallImage}
                />
                <Image
                  source={{uri: images[3].node.image.uri}}
                  style={styles.smallImage}
                />
              </View>
            </>
          )}

          {count === 5 && (
            <>
              <View style={styles.row}>
                <Image
                  source={{uri: images[0].node.image.uri}}
                  style={styles.smallImage}
                />
                <Image
                  source={{uri: images[1].node.image.uri}}
                  style={styles.smallImage}
                />
                <Image
                  source={{uri: images[2].node.image.uri}}
                  style={styles.smallImage}
                />
              </View>
              <View style={styles.row}>
                <Image
                  source={{uri: images[3].node.image.uri}}
                  style={styles.smallImage}
                />
                <Image
                  source={{uri: images[4].node.image.uri}}
                  style={styles.mediumImage}
                />
              </View>
            </>
          )}
          {count > 5 && Math.floor(Math.random() * 2) + 1 === 1 && (
            <View>
              {/* Top Row */}
              <View style={styles.row}>
                <Image
                  source={{uri: images[0].node.image.uri}}
                  style={styles.smallImage}
                />
                <Image
                  source={{uri: images[1].node.image.uri}}
                  style={styles.smallImage}
                />
                <Image
                  source={{uri: images[2].node.image.uri}}
                  style={styles.smallImage}
                />
              </View>

              {/* Bottom Mosaic */}
              <View style={styles.row}>
                <View style={styles.leftStack}>
                  <Image
                    source={{uri: images[3].node.image.uri}}
                    style={styles.squareImage}
                  />
                  <Image
                    source={{uri: images[5].node.image.uri}}
                    style={styles.squareImage}
                  />
                </View>
                <Image
                  source={{uri: images[4].node.image.uri}}
                  style={styles.tallImage}
                />
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.outerContainer}>
      <Header onMenuPress={() => setShowSideMenu(true)} />
      {renderTabs()}
      <FlatList
        data={visiblePhotos} // Now correctly using visiblePhotos
        key={activeTab}
        keyExtractor={(item, index) => `${item.timeRange}-${index}`}
        renderItem={({item}) =>
          activeTab === 'grid' ? (
            renderGroupCard({item})
          ) : (
            <View style={{marginBottom: 16, paddingHorizontal: 10}}>
              <Text style={styles.listDateText}>{item.timeRange}</Text>
              {renderListView(item.data)}
              {/* <FlatList
                data={item.data}
                keyExtractor={(imgItem, index) =>
                  `${imgItem.node.image.uri}-${index}`
                }
                renderItem={renderImageItem}
              /> */}
            </View>
          )
        }
        numColumns={activeTab === 'grid' ? 2 : 1}
        columnWrapperStyle={
          activeTab === 'grid' ? {justifyContent: 'space-between'} : null
        }
        contentContainerStyle={{paddingBottom: 100}}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3} // Reduced threshold
        ListFooterComponent={renderFooter}
        refreshing={refreshing} // <- NEW
        onRefresh={onRefresh}
      />
      <SideMenu
        visible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {flex: 1, backgroundColor: '#E4EAFD'},
  tabWrapper: {
    backgroundColor: '#e7edff',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    marginTop: -40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E4EAFD',
    borderRadius: 40,
    marginHorizontal: 20,
    padding: 5,
    alignSelf: 'center',
    zIndex: 10,
    width: '90%',
    marginTop: 20,
  },
  tab: {flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 30},
  activeTab: {backgroundColor: '#fff'},
  tabText: {fontSize: 14, fontWeight: '600', color: '#6b6b6b'},
  activeText: {color: '#1a1a1a', fontWeight: '700'},
  imageContainer: {
    margin: 5,
    position: 'relative',
    height: 120,
    borderRadius: 10,
  },
  listItemContainer: {flexDirection: 'row', alignItems: 'center', height: 100},
  images: {width: '100%', height: '100%', borderRadius: 10},
  listImage: {width: 100, height: 100, marginRight: 10},
  gridGroupCard: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 10,
    margin: 4,
    alignItems: 'center',
    width: '45%',
    marginBottom: -20,
  },
  gridThumbnail: {
    width: 150,
    height: 150,
    borderRadius: 12,
    marginBottom: 10,
  },
  gridDateText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F1E5D',
    textAlign: 'center',
  },
  listDateText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F1E5D',
    textAlign: 'left',
    margin: 10,
  },
  photoCount: {fontSize: 13, color: '#888', textAlign: 'center'},
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  fullWidthImage: {
    width: screenWidth - 30,
    height: box * 2,
    borderRadius: 10,
  },
  halfWidthImage: {
    flex: 1,
    height: box * 1.5,
    marginRight: spacing,
    borderRadius: 10,
  },
  smallImage: {
    flex: 1,
    aspectRatio: 1,
    marginRight: spacing,
    borderRadius: 10,
    height: 10,
    width: 10,
  },
  mediumImage: {
    flex: 1,
    aspectRatio: 1.2,
    marginRight: spacing,
    borderRadius: 10,
  },
  container: {
    padding: spacing,
  },
  row: {
    flexDirection: 'row',
    marginBottom: spacing,
  },
  squareImage: {
    width: box - 30,
    height: box,
    borderRadius: 10,
    marginRight: spacing,
    marginBottom: spacing,
  },
  tallImage: {
    width: box * 2 + spacing,
    height: box * 2 + spacing,
    borderRadius: 10,
  },
  leftStack: {
    justifyContent: 'space-between',
    marginRight: spacing,
  },
});

export default GalleryScreen;