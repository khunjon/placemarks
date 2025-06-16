import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image,
  RefreshControl,
  Alert
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { CheckIn } from '../../types/checkins';
import { checkInsService } from '../../services/checkins';

type CheckInHistoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CheckInHistory'>;

interface Props {
  navigation: CheckInHistoryScreenNavigationProp;
}

export default function CheckInHistoryScreen({ navigation }: Props) {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadCheckIns();
    loadStats();
  }, []);

  const loadCheckIns = async () => {
    try {
      const data = await checkInsService.getUserCheckIns(20, 0);
      setCheckIns(data);
    } catch (error) {
      console.error('Error loading check-ins:', error);
      Alert.alert('Error', 'Failed to load check-ins');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await checkInsService.getUserCheckInStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadCheckIns(), loadStats()]);
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const renderCheckInItem = ({ item }: { item: CheckIn }) => (
    <TouchableOpacity style={styles.checkInCard}>
      <View style={styles.checkInHeader}>
        <View style={styles.checkInInfo}>
          <Text style={styles.placeName}>{item.places?.name || 'Unknown Place'}</Text>
          <Text style={styles.address}>{item.places?.address || 'No address'}</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.stars}>{renderStars(item.rating)}</Text>
            <Text style={styles.ratingText}>{item.rating}/5</Text>
          </View>
        </View>
        <View style={styles.dateContainer}>
          <Text style={styles.date}>{formatDate(item.timestamp)}</Text>
          <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
        </View>
      </View>

      {/* Context Tags */}
      <View style={styles.contextContainer}>
        <View style={styles.contextTag}>
          <Text style={styles.contextText}>
            {item.context.environment === 'indoor' ? '🏢' : 
             item.context.environment === 'outdoor' ? '🌳' : '🏪'} {item.context.environment}
          </Text>
        </View>
        <View style={styles.contextTag}>
          <Text style={styles.contextText}>
            {item.context.price_tier === 'street' ? '฿' :
             item.context.price_tier === 'casual' ? '฿฿' :
             item.context.price_tier === 'mid' ? '฿฿฿' :
             item.context.price_tier === 'upscale' ? '฿฿฿฿' : '฿฿฿฿฿'}
          </Text>
        </View>
        {item.companion_type && (
          <View style={styles.contextTag}>
            <Text style={styles.contextText}>
              {item.companion_type === 'solo' ? '🧘' :
               item.companion_type === 'partner' ? '💑' :
               item.companion_type === 'friends' ? '👥' :
               item.companion_type === 'family' ? '👨‍👩‍👧‍👦' :
               item.companion_type === 'business' ? '💼' : '💕'} {item.companion_type}
            </Text>
          </View>
        )}
      </View>

      {/* Photos */}
      {item.photos && item.photos.length > 0 && (
        <View style={styles.photosContainer}>
          {item.photos.slice(0, 3).map((photo, index) => (
            <Image key={index} source={{ uri: photo }} style={styles.photo} />
          ))}
          {item.photos.length > 3 && (
            <View style={styles.morePhotos}>
              <Text style={styles.morePhotosText}>+{item.photos.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      {/* Notes */}
      {item.notes && (
        <Text style={styles.notes} numberOfLines={2}>
          "{item.notes}"
        </Text>
      )}

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {item.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag.replace(/_/g, ' ')}</Text>
            </View>
          ))}
          {item.tags.length > 3 && (
            <Text style={styles.moreTags}>+{item.tags.length - 3} more</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderStatsHeader = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Your Check-in Stats</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalCheckIns}</Text>
            <Text style={styles.statLabel}>Total Check-ins</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.averageRating}</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.mostUsedTags.length}</Text>
            <Text style={styles.statLabel}>Favorite Tags</Text>
          </View>
        </View>
        {stats.mostUsedTags.length > 0 && (
          <View style={styles.favoriteTagsContainer}>
            <Text style={styles.favoriteTagsTitle}>Most Used Tags:</Text>
            <View style={styles.favoriteTagsList}>
              {stats.mostUsedTags.slice(0, 3).map((tag: string, index: number) => (
                <View key={index} style={styles.favoriteTag}>
                  <Text style={styles.favoriteTagText}>{tag.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your check-ins...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={checkIns}
        renderItem={renderCheckInItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderStatsHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Check-ins Yet</Text>
            <Text style={styles.emptyText}>
              Start exploring Bangkok and check in at your favorite places!
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
  listContent: {
    padding: 16,
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  favoriteTagsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  favoriteTagsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
  },
  favoriteTagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  favoriteTag: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  favoriteTagText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  checkInCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  checkInInfo: {
    flex: 1,
    marginRight: 12,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    fontSize: 16,
    color: '#FFD700',
    marginRight: 6,
  },
  ratingText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  date: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  time: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  contextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  contextTag: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  contextText: {
    fontSize: 12,
    color: '#333333',
  },
  photosContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  photo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  morePhotos: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  notes: {
    fontSize: 14,
    color: '#333333',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#E8F5E8',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '500',
  },
  moreTags: {
    fontSize: 11,
    color: '#666666',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
}); 