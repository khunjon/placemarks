import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Card, Rating } from 'react-native-elements';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DarkTheme } from '../../constants/theme';

export interface BangkokPlaceCardProps {
  id: string;
  name: string;
  description?: string;
  category: 'temple' | 'food' | 'market' | 'culture' | 'nightlife' | 'shopping';
  imageUrl?: string;
  rating?: number;
  priceLevel?: 1 | 2 | 3 | 4; // 1 = ฿, 2 = ฿฿, 3 = ฿฿฿, 4 = ฿฿฿฿
  distance?: string;
  btsStation?: string;
  isBookmarked?: boolean;
  tags?: string[];
  onPress?: () => void;
  onBookmarkPress?: () => void;
  onSharePress?: () => void;
  variant?: 'default' | 'compact' | 'featured';
}

const categoryConfig = {
  temple: {
    icon: 'temple-buddhist',
    color: DarkTheme.colors.bangkok.temple,
    gradient: DarkTheme.colors.bangkok.templeGradient,
  },
  food: {
    icon: 'restaurant',
    color: DarkTheme.colors.bangkok.market,
    gradient: DarkTheme.colors.bangkok.sunset,
  },
  market: {
    icon: 'store',
    color: DarkTheme.colors.bangkok.tukTuk,
    gradient: DarkTheme.colors.bangkok.sunset,
  },
  culture: {
    icon: 'museum',
    color: DarkTheme.colors.bangkok.gold,
    gradient: DarkTheme.colors.bangkok.sunset,
  },
  nightlife: {
    icon: 'nightlife',
    color: DarkTheme.colors.accent.purple,
    gradient: DarkTheme.colors.bangkok.riverGradient,
  },
  shopping: {
    icon: 'shopping-bag',
    color: DarkTheme.colors.accent.pink,
    gradient: DarkTheme.colors.bangkok.sunset,
  },
};

const getPriceLevelDisplay = (level?: number) => {
  if (!level) return null;
  return '฿'.repeat(level);
};

export default function BangkokPlaceCard({
  id,
  name,
  description,
  category,
  imageUrl,
  rating,
  priceLevel,
  distance,
  btsStation,
  isBookmarked = false,
  tags = [],
  onPress,
  onBookmarkPress,
  onSharePress,
  variant = 'default',
}: BangkokPlaceCardProps) {
  const categoryInfo = categoryConfig[category];
  const isCompact = variant === 'compact';
  const isFeatured = variant === 'featured';

  const renderHeader = () => (
    <View className="flex-row items-center justify-between mb-2">
      <View className="flex-row items-center flex-1">
        <View 
          className="w-8 h-8 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: categoryInfo.color }}
        >
          <Icon 
            name={categoryInfo.icon} 
            size={16} 
            color={DarkTheme.colors.system.white} 
          />
        </View>
        <View className="flex-1">
          <Text 
            style={[
              isCompact ? DarkTheme.typography.callout : DarkTheme.typography.headline,
              { color: DarkTheme.colors.semantic.label }
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {btsStation && (
            <View className="flex-row items-center mt-1">
              <Icon 
                name="train" 
                size={12} 
                color={DarkTheme.colors.bangkok.sapphire} 
              />
              <Text 
                style={[
                  DarkTheme.typography.caption2,
                  { 
                    color: DarkTheme.colors.bangkok.sapphire,
                    marginLeft: DarkTheme.spacing.xs 
                  }
                ]}
              >
                {btsStation}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      <View className="flex-row items-center">
        {distance && (
          <Text 
            style={[
              DarkTheme.typography.caption1,
              { 
                color: DarkTheme.colors.semantic.secondaryLabel,
                marginRight: DarkTheme.spacing.sm 
              }
            ]}
          >
            {distance}
          </Text>
        )}
        <TouchableOpacity onPress={onBookmarkPress}>
          <Icon 
            name={isBookmarked ? "bookmark" : "bookmark-border"} 
            size={20} 
            color={isBookmarked ? DarkTheme.colors.bangkok.gold : DarkTheme.colors.semantic.secondaryLabel} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderImage = () => {
    if (!imageUrl || isCompact) return null;
    
    return (
      <View className="mb-3 rounded-lg overflow-hidden">
        <Image 
          source={{ uri: imageUrl }}
          className="w-full h-32"
          style={{ backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground }}
        />
        {isFeatured && (
          <View 
            className="absolute top-2 left-2 px-2 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          >
            <Text 
              style={[
                DarkTheme.typography.caption2,
                { color: DarkTheme.colors.bangkok.gold }
              ]}
            >
              FEATURED
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderContent = () => (
    <View>
      {description && !isCompact && (
        <Text 
          style={[
            DarkTheme.typography.subhead,
            { 
              color: DarkTheme.colors.semantic.secondaryLabel,
              marginBottom: DarkTheme.spacing.sm 
            }
          ]}
          numberOfLines={2}
        >
          {description}
        </Text>
      )}
      
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          {rating && (
            <View className="flex-row items-center mr-4">
              <Rating
                readonly
                startingValue={rating}
                imageSize={14}
                style={{ marginRight: DarkTheme.spacing.xs }}
              />
              <Text 
                style={[
                  DarkTheme.typography.caption1,
                  { color: DarkTheme.colors.semantic.secondaryLabel }
                ]}
              >
                {rating.toFixed(1)}
              </Text>
            </View>
          )}
          
          {priceLevel && (
            <View className="flex-row items-center">
              <Text 
                style={[
                  DarkTheme.typography.caption1,
                  { 
                    color: DarkTheme.colors.bangkok.gold,
                    fontWeight: '600' 
                  }
                ]}
              >
                {getPriceLevelDisplay(priceLevel)}
              </Text>
            </View>
          )}
        </View>
        
        {onSharePress && (
          <TouchableOpacity onPress={onSharePress}>
            <Icon 
              name="share" 
              size={18} 
              color={DarkTheme.colors.semantic.secondaryLabel} 
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderTags = () => {
    if (!tags.length || isCompact) return null;
    
    return (
      <View className="flex-row flex-wrap mt-3">
        {tags.slice(0, 3).map((tag, index) => (
          <View 
            key={index}
            className="px-2 py-1 rounded-full mr-2 mb-1"
            style={{ backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground }}
          >
            <Text 
              style={[
                DarkTheme.typography.caption2,
                { color: DarkTheme.colors.semantic.secondaryLabel }
              ]}
            >
              {tag}
            </Text>
          </View>
        ))}
        {tags.length > 3 && (
          <View 
            className="px-2 py-1 rounded-full"
            style={{ backgroundColor: DarkTheme.colors.semantic.tertiarySystemBackground }}
          >
            <Text 
              style={[
                DarkTheme.typography.caption2,
                { color: DarkTheme.colors.semantic.secondaryLabel }
              ]}
            >
              +{tags.length - 3}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (isCompact) {
    return (
      <TouchableOpacity onPress={onPress}>
        <View 
          className="p-4 rounded-lg mb-2"
          style={{ 
            backgroundColor: DarkTheme.colors.semantic.secondarySystemBackground,
            borderColor: DarkTheme.colors.semantic.separator,
            borderWidth: 1,
          }}
        >
          {renderHeader()}
          {renderContent()}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress}>
      <View
        style={[
          DarkTheme.bangkok.placeCard.container,
          {
            margin: 0,
            marginBottom: DarkTheme.spacing.md,
            borderWidth: isFeatured ? 2 : 1,
            borderColor: isFeatured ? DarkTheme.colors.bangkok.gold : DarkTheme.colors.semantic.separator,
            padding: DarkTheme.spacing.md,
          }
        ]}
      >
        {renderHeader()}
        {renderImage()}
        {renderContent()}
        {renderTags()}
      </View>
    </TouchableOpacity>
  );
} 