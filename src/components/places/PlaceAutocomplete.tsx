import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { CACHE_CONFIG } from '../../config/cacheConfig';
import { PlaceSuggestion, Location } from '../../types';
import { placesService } from '../../services/places';
import { DarkTheme } from '../../constants/theme';
import { getPrimaryDisplayType } from '../../utils/placeTypeMapping';

interface PlaceAutocompleteProps {
  // Updated callback to provide Google Place ID directly
  onPlaceSelect: (suggestion: PlaceSuggestion) => void;
  onGooglePlaceIdSelect?: (googlePlaceId: string, placeName: string) => void;
  placeholder?: string;
  location?: Location;
  style?: any;
  inputStyle?: any;
  listStyle?: any;
  maxResults?: number;
  clearOnSelect?: boolean;
  showFullAddress?: boolean;
}

export default function PlaceAutocomplete({
  onPlaceSelect,
  onGooglePlaceIdSelect,
  placeholder = 'Search places in Bangkok...',
  location,
  style,
  inputStyle,
  listStyle,
  maxResults = 5,
  clearOnSelect = true,
  showFullAddress = true,
}: PlaceAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't search for very short queries
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Debounce the search
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await placesService.getPlaceAutocomplete(query, location);
        setSuggestions(results.slice(0, maxResults));
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error getting autocomplete suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, CACHE_CONFIG.DEBOUNCE.AUTOCOMPLETE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, location, maxResults]);

  const handlePlaceSelect = (suggestion: PlaceSuggestion) => {
    // Set input text to the selected place name
    if (clearOnSelect) {
      setQuery(suggestion.main_text);
    }
    setShowSuggestions(false);
    
    // Call both callbacks for backwards compatibility
    onPlaceSelect(suggestion);
    
    // New callback that provides Google Place ID directly
    if (onGooglePlaceIdSelect) {
      onGooglePlaceIdSelect(suggestion.place_id, suggestion.main_text);
    }
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for tap
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  };

  const clearInput = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  /**
   * Get display type for autocomplete suggestions (using unified mapping)
   */
  const getDisplayTypeForSuggestion = (types: string[]): string => {
    return getPrimaryDisplayType(types);
  };

  const renderSuggestion = ({ item }: { item: PlaceSuggestion }) => {
    const displayType = getDisplayTypeForSuggestion(item.types || []);
    
    return (
      <TouchableOpacity
        style={styles.suggestionItem}
        onPress={() => handlePlaceSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.suggestionContent}>
          <View style={styles.suggestionHeader}>
            <Text style={styles.mainText} numberOfLines={1}>
              {item.main_text}
            </Text>
          </View>
          {showFullAddress && (
            <Text style={styles.secondaryText} numberOfLines={1}>
              {item.secondary_text}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, inputStyle]}
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor={DarkTheme.colors.semantic.tertiaryLabel}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          autoCorrect={false}
          autoCapitalize="words"
        />
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={DarkTheme.colors.bangkok.gold} />
          </View>
        )}
        {query.length > 0 && !loading && (
          <TouchableOpacity
            onPress={clearInput}
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={[styles.suggestionsContainer, listStyle]}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item.place_id}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {showSuggestions && !loading && query.length >= 2 && suggestions.length === 0 && (
        <View style={[styles.suggestionsContainer, listStyle]}>
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>
              No places found for "{query}"
            </Text>
            <Text style={styles.noResultsSubtext}>
              Try a different search term
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
    borderRadius: DarkTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: DarkTheme.colors.semantic.separator,
    paddingHorizontal: DarkTheme.spacing.md,
    ...DarkTheme.shadows.small,
  },
  input: {
    flex: 1,
    height: 48,
    ...DarkTheme.typography.body,
    color: DarkTheme.colors.semantic.label,
  },
  loadingContainer: {
    marginLeft: DarkTheme.spacing.sm,
  },
  clearButton: {
    marginLeft: DarkTheme.spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: DarkTheme.colors.semantic.separator,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 12,
    color: DarkTheme.colors.semantic.label,
    fontWeight: 'bold',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
    borderRadius: DarkTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: DarkTheme.colors.semantic.separator,
    maxHeight: 250,
    ...DarkTheme.shadows.medium,
    zIndex: 1001,
  },
  suggestionItem: {
    paddingHorizontal: DarkTheme.spacing.md,
    paddingVertical: DarkTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: DarkTheme.colors.semantic.separator,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  mainText: {
    fontSize: 16,
    fontWeight: '500',
    color: DarkTheme.colors.semantic.label,
    flex: 1,
    marginRight: DarkTheme.spacing.sm,
  },
  secondaryText: {
    fontSize: 14,
    color: DarkTheme.colors.semantic.secondaryLabel,
  },
  noResultsContainer: {
    padding: DarkTheme.spacing.lg,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '500',
    color: DarkTheme.colors.semantic.secondaryLabel,
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: DarkTheme.colors.semantic.tertiaryLabel,
  },
});