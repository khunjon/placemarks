import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Modal,
  ViewToken,
} from 'react-native';
import { Image } from 'expo-image';
import { X, Trash2, Star } from '../icons';
import { DarkTheme } from '../../constants/theme';
import { Spacing } from '../../constants/Spacing';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface SwipeablePhoto {
  url: string;
  thumbnailUrl?: string;
  displayUrl?: string;
  caption?: string;
  isUserPhoto: boolean;
  photoId?: string;
  isPrimary?: boolean;
  userId?: string;
}

interface SwipeablePhotoViewerProps {
  photos: SwipeablePhoto[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
  onSetPrimary?: (photoId: string) => void;
  onDelete?: (photoId: string) => void;
  currentUserId?: string;
}

const SwipeablePhotoViewer: React.FC<SwipeablePhotoViewerProps> = ({
  photos,
  initialIndex,
  visible,
  onClose,
  onSetPrimary,
  onDelete,
  currentUserId,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [deleting, setDeleting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  // Animate in when visible
  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  // Update current index when initial index changes
  useEffect(() => {
    if (visible && initialIndex !== currentIndex) {
      setCurrentIndex(initialIndex);
      flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
    }
  }, [initialIndex, visible]);

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderPhoto = ({ item, index }: { item: SwipeablePhoto; index: number }) => {
    return (
      <View style={{ width: screenWidth, height: screenHeight, justifyContent: 'center' }}>
        <Image
          source={{ uri: item.displayUrl || item.url }}
          style={{
            width: screenWidth,
            height: screenWidth,
          }}
          contentFit="contain"
          transition={300}
          cachePolicy="memory-disk"
          priority="high"
          onLoadStart={() => {}}
          onLoadEnd={() => {}}
        />
        
        {item.caption && (
          <View style={{
            position: 'absolute',
            bottom: 120,
            left: Spacing.lg,
            right: Spacing.lg,
          }}>
            <Text style={{
              fontSize: 16,
              color: 'white',
              textAlign: 'center',
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: Spacing.md,
              borderRadius: DarkTheme.borderRadius.md,
            }}>
              {item.caption}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderPageIndicator = () => {
    if (photos.length <= 1) return null;

    return (
      <View style={{
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.xs,
      }}>
        {photos.map((_, index) => (
          <View
            key={index}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: index === currentIndex ? 'white' : 'rgba(255,255,255,0.4)',
            }}
          />
        ))}
      </View>
    );
  };

  const currentPhoto = photos[currentIndex];
  const canManagePhoto = currentPhoto?.isUserPhoto && currentPhoto?.userId === currentUserId;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'black',
          opacity: fadeAnim,
        }}
      >
        {/* Header */}
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: 50,
          paddingHorizontal: Spacing.lg,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Text style={{
            color: 'white',
            fontSize: 16,
            fontWeight: '600',
          }}>
            {currentIndex + 1} / {photos.length}
          </Text>
          
          <TouchableOpacity
            onPress={handleClose}
            style={{ padding: Spacing.sm }}
          >
            <X size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Photo List */}
        <FlatList
          ref={flatListRef}
          data={photos}
          renderItem={renderPhoto}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          keyExtractor={(item, index) => `${item.url}-${index}`}
        />

        {/* Page Indicators */}
        {renderPageIndicator()}

        {/* Action Buttons */}
        {canManagePhoto && (
          <View style={{
            position: 'absolute',
            bottom: Spacing.xl * 2,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: Spacing.md,
          }}>
            {!currentPhoto.isPrimary && onSetPrimary && (
              <TouchableOpacity
                onPress={() => onSetPrimary(currentPhoto.photoId!)}
                style={{
                  backgroundColor: DarkTheme.colors.accent.blue,
                  paddingVertical: Spacing.sm,
                  paddingHorizontal: Spacing.lg,
                  borderRadius: DarkTheme.borderRadius.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Star size={16} color="white" style={{ marginRight: Spacing.xs }} />
                <Text style={{ color: 'white', fontWeight: '500' }}>
                  Set as Primary
                </Text>
              </TouchableOpacity>
            )}
            
            {onDelete && (
              <TouchableOpacity
                onPress={() => {
                  setDeleting(true);
                  onDelete(currentPhoto.photoId!);
                }}
                disabled={deleting}
                style={{
                  backgroundColor: DarkTheme.colors.status.error,
                  paddingVertical: Spacing.sm,
                  paddingHorizontal: Spacing.lg,
                  borderRadius: DarkTheme.borderRadius.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Trash2 size={16} color="white" style={{ marginRight: Spacing.xs }} />
                    <Text style={{ color: 'white', fontWeight: '500' }}>
                      Delete
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

export default SwipeablePhotoViewer;