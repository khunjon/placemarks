import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EnrichedPlace, PlaceSuggestion, Location } from '../../types';
import { placesService } from '../../services/places';
import PlaceAutocomplete from './PlaceAutocomplete';
import PlaceCard from './PlaceCard';
import { DarkTheme } from '../../constants/theme';

interface PlaceSelectorProps {
  onPlaceSelect: (googlePlaceId: string, place?: EnrichedPlace) => void;
  selectedGooglePlaceId?: string;
  location?: Location;
  placeholder?: string;
  showSelectedPlace?: boolean;
  allowDeselection?: boolean;
  style?: any;
  title?: string;
}

export default function PlaceSelector({
  onPlaceSelect,
  selectedGooglePlaceId,
  location,
  placeholder = 'Search for a place...',
  showSelectedPlace = true,
  allowDeselection = true,
  style,
  title,
}: PlaceSelectorProps) {
  const [selectedPlace, setSelectedPlace] = useState<EnrichedPlace | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePlaceSelection = async (googlePlaceId: string, placeName: string) => {
    try {
      setLoading(true);
      
      // Get enriched place data
      const enrichedPlace = await placesService.getEnrichedPlace(googlePlaceId);
      
      if (enrichedPlace) {
        setSelectedPlace(enrichedPlace);
        onPlaceSelect(googlePlaceId, enrichedPlace);
      } else {
        // Fallback: create minimal place object from available data
        const minimalPlace: Partial<EnrichedPlace> = {
          google_place_id: googlePlaceId,
          name: placeName,
          formatted_address: '',
          types: [],
          business_status: 'OPERATIONAL'
        };
        onPlaceSelect(googlePlaceId, minimalPlace as EnrichedPlace);
      }
    } catch (error) {
      console.error('Error selecting place:', error);
      // Still call the callback with just the Google Place ID
      onPlaceSelect(googlePlaceId);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionSelect = (suggestion: PlaceSuggestion) => {
    handlePlaceSelection(suggestion.place_id, suggestion.main_text);
  };

  const handleDeselectPlace = () => {
    setSelectedPlace(null);
    onPlaceSelect(''); // Empty string indicates deselection
  };

  // Load selected place on mount if googlePlaceId provided
  React.useEffect(() => {
    if (selectedGooglePlaceId && !selectedPlace) {
      (async () => {
        try {
          const enrichedPlace = await placesService.getEnrichedPlace(selectedGooglePlaceId);
          if (enrichedPlace) {
            setSelectedPlace(enrichedPlace);
          }
        } catch (error) {
          console.error('Error loading selected place:', error);
        }
      })();
    }
  }, [selectedGooglePlaceId, selectedPlace]);

  return (
    <View style={[styles.container, style]}>
      {title && (
        <Text style={styles.title}>{title}</Text>
      )}
      
      {/* Show autocomplete if no place selected or if allowing deselection */}
      {(!selectedPlace || allowDeselection) && (
        <PlaceAutocomplete
          onPlaceSelect={handleSuggestionSelect}
          onGooglePlaceIdSelect={handlePlaceSelection}
          placeholder={placeholder}
          location={location}
          style={styles.autocomplete}
        />
      )}

      {/* Show selected place */}
      {showSelectedPlace && selectedPlace && (
        <View style={styles.selectedPlaceContainer}>
          <Text style={styles.selectedLabel}>Selected Place:</Text>
          <PlaceCard
            googlePlaceId={selectedPlace.google_place_id}
            place={selectedPlace}
            name={selectedPlace.name || 'Unknown Place'}
            address={selectedPlace.formatted_address || 'Address not available'}
            onCheckIn={() => {}} // Disabled in selector
            onPress={allowDeselection ? handleDeselectPlace : undefined}
            showCheckInButton={false}
            style={styles.selectedPlaceCard}
          />
          {allowDeselection && (
            <Text style={styles.deselectHint}>
              Tap the place card to change selection
            </Text>
          )}
        </View>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading place details...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: DarkTheme.colors.semantic.label,
    marginBottom: DarkTheme.spacing.md,
  },
  autocomplete: {
    marginBottom: DarkTheme.spacing.md,
  },
  selectedPlaceContainer: {
    marginTop: DarkTheme.spacing.md,
  },
  selectedLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: DarkTheme.colors.semantic.secondaryLabel,
    marginBottom: DarkTheme.spacing.sm,
  },
  selectedPlaceCard: {
    marginBottom: 0, // Remove default bottom margin
  },
  deselectHint: {
    fontSize: 12,
    color: DarkTheme.colors.semantic.tertiaryLabel,
    textAlign: 'center',
    marginTop: DarkTheme.spacing.xs,
    fontStyle: 'italic',
  },
  loadingContainer: {
    padding: DarkTheme.spacing.md,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: DarkTheme.colors.semantic.secondaryLabel,
  },
});