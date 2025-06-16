import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AspectRatings } from '../../types/checkins';

interface RatingSystemProps {
  overallRating: number;
  aspectRatings: AspectRatings;
  onOverallRatingChange: (rating: number) => void;
  onAspectRatingChange: (aspect: keyof AspectRatings, rating: number) => void;
  showAspectRatings?: boolean;
}

export default function RatingSystem({
  overallRating,
  aspectRatings,
  onOverallRatingChange,
  onAspectRatingChange,
  showAspectRatings = true,
}: RatingSystemProps) {
  const renderStars = (rating: number, onPress: (rating: number) => void, size: number = 24) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress(star)}
            style={styles.starButton}
          >
            <Text style={[styles.star, { fontSize: size, color: star <= rating ? '#FFD700' : '#E0E0E0' }]}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const aspectLabels: Record<keyof AspectRatings, string> = {
    food_quality: 'Food Quality',
    service: 'Service',
    atmosphere: 'Atmosphere',
    value_for_money: 'Value for Money',
    cleanliness: 'Cleanliness',
    location_convenience: 'Location & Convenience',
  };

  return (
    <View style={styles.container}>
      {/* Overall Rating */}
      <View style={styles.overallSection}>
        <Text style={styles.sectionTitle}>Overall Rating</Text>
        {renderStars(overallRating, onOverallRatingChange, 32)}
        <Text style={styles.ratingText}>
          {overallRating > 0 ? `${overallRating}/5` : 'Tap to rate'}
        </Text>
      </View>

      {/* Aspect Ratings */}
      {showAspectRatings && (
        <View style={styles.aspectSection}>
          <Text style={styles.sectionTitle}>Rate Specific Aspects</Text>
          <Text style={styles.sectionSubtitle}>Optional - helps improve recommendations</Text>
          
          {Object.entries(aspectLabels).map(([aspect, label]) => (
            <View key={aspect} style={styles.aspectRow}>
              <Text style={styles.aspectLabel}>{label}</Text>
              {renderStars(
                aspectRatings[aspect as keyof AspectRatings] || 0,
                (rating) => onAspectRatingChange(aspect as keyof AspectRatings, rating),
                20
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overallSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  aspectSection: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 8,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 24,
  },
  ratingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 4,
  },
  aspectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  aspectLabel: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
    marginRight: 12,
  },
}); 