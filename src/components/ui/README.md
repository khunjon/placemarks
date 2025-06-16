# Dark-Themed UI Components

A collection of reusable dark-themed UI components for the Bangkok Placemarks app, built with React Native Elements, NativeWind, and TypeScript.

## Components

### 1. BangkokPlaceCard

A location card component with dark styling and Bangkok-specific features.

```tsx
import { BangkokPlaceCard } from '../components/ui';

<BangkokPlaceCard
  id="place-1"
  name="Wat Pho Temple"
  description="Famous temple with reclining Buddha"
  category="temple"
  imageUrl="https://example.com/image.jpg"
  rating={4.8}
  priceLevel={2}
  distance="1.2km"
  btsStation="Saphan Taksin"
  isBookmarked={false}
  tags={["temple", "culture", "historic"]}
  variant="featured"
  onPress={() => console.log('Place pressed')}
  onBookmarkPress={() => console.log('Bookmark pressed')}
  onSharePress={() => console.log('Share pressed')}
/>
```

**Props:**
- `variant`: 'default' | 'compact' | 'featured'
- `category`: 'temple' | 'food' | 'market' | 'culture' | 'nightlife' | 'shopping'
- `priceLevel`: 1-4 (฿ to ฿฿฿฿)

### 2. DarkButton

iOS-style dark button with multiple variants.

```tsx
import { DarkButton, PrimaryButton, BangkokButton } from '../components/ui';

// Basic usage
<DarkButton
  title="Explore Bangkok"
  onPress={() => console.log('Button pressed')}
  variant="primary"
  size="medium"
  icon="location-on"
  loading={false}
  fullWidth={true}
/>

// Preset variants
<PrimaryButton title="Primary" onPress={() => {}} />
<BangkokButton title="Bangkok Gold" onPress={() => {}} />
```

**Variants:**
- `primary`: Blue accent
- `secondary`: Gray background
- `outline`: Transparent with border
- `ghost`: Transparent
- `destructive`: Red for dangerous actions
- `bangkok`: Bangkok gold theme

### 3. DarkInput

Dark-themed form inputs with iOS styling.

```tsx
import { DarkInput, EmailInput, PasswordInput, SearchInput } from '../components/ui';

// Basic usage
<DarkInput
  label="Location Name"
  placeholder="Enter place name"
  value={locationName}
  onChangeText={setLocationName}
  variant="filled"
  size="medium"
  leftIcon="place"
  required={true}
  error={error}
  helperText="This will be visible to other users"
/>

// Preset variants
<EmailInput
  value={email}
  onChangeText={setEmail}
  label="Email Address"
/>

<PasswordInput
  value={password}
  onChangeText={setPassword}
  label="Password"
/>

<SearchInput
  value={searchQuery}
  onChangeText={setSearchQuery}
/>
```

**Variants:**
- `default`: Standard input
- `filled`: Filled background
- `outline`: Outlined border
- `underline`: Bottom border only

### 4. LocationBadge

Badges for BTS proximity, price tiers, and other location metadata.

```tsx
import { 
  LocationBadge, 
  BTSBadge, 
  PriceBadge, 
  BangkokBTSBadge,
  BangkokPriceTierBadge 
} from '../components/ui';

// Basic usage
<LocationBadge
  type="bts"
  value="Siam"
  variant="filled"
  size="small"
  onPress={() => console.log('BTS badge pressed')}
/>

// Preset badges
<BTSBadge value="Asok" size="small" />
<PriceBadge value={3} size="medium" />

// Bangkok-specific combinations
<BangkokBTSBadge 
  station="Phrom Phong" 
  distance="200m" 
/>

<BangkokPriceTierBadge 
  level={2} 
  category="Street Food" 
/>
```

**Badge Types:**
- `bts`: BTS station proximity
- `price`: Price level (฿ to ฿฿฿฿)
- `distance`: Distance from user
- `category`: Place category
- `rating`: Star rating
- `status`: General status

## Usage Examples

### Complete Place Card Example

```tsx
import React from 'react';
import { View } from 'react-native';
import { 
  BangkokPlaceCard, 
  BangkokBTSBadge, 
  BangkokPriceTierBadge 
} from '../components/ui';

const PlaceExample = () => {
  return (
    <View className="p-4">
      <BangkokPlaceCard
        id="chatuchak-market"
        name="Chatuchak Weekend Market"
        description="Massive weekend market with everything from food to antiques"
        category="market"
        imageUrl="https://example.com/chatuchak.jpg"
        rating={4.6}
        priceLevel={2}
        distance="3.2km"
        btsStation="Mo Chit"
        isBookmarked={true}
        tags={["market", "shopping", "food", "weekend"]}
        variant="featured"
        onPress={() => navigateToPlace('chatuchak-market')}
        onBookmarkPress={() => toggleBookmark('chatuchak-market')}
        onSharePress={() => sharePlace('chatuchak-market')}
      />
      
      <View className="flex-row mt-2">
        <BangkokBTSBadge station="Mo Chit" distance="50m" />
        <BangkokPriceTierBadge level={2} category="Market" />
      </View>
    </View>
  );
};
```

### Form Example

```tsx
import React, { useState } from 'react';
import { View } from 'react-native';
import { 
  DarkInput, 
  EmailInput, 
  PasswordInput, 
  BangkokButton 
} from '../components/ui';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <View className="p-4">
      <EmailInput
        value={email}
        onChangeText={setEmail}
        label="Email"
        required
      />
      
      <PasswordInput
        value={password}
        onChangeText={setPassword}
        label="Password"
        required
      />
      
      <BangkokButton
        title="Sign In"
        onPress={handleLogin}
        loading={loading}
        fullWidth
        icon="login"
      />
    </View>
  );
};
```

## Styling

All components use the centralized `DarkTheme` from `src/constants/theme.ts` and support:

- **NativeWind classes** for layout and spacing
- **Theme object styles** for colors and typography
- **Custom style props** for component-specific overrides
- **iOS dark mode** color palette
- **Bangkok-specific** brand colors and themes

## TypeScript Support

All components are fully typed with TypeScript interfaces exported for reuse in your application. 