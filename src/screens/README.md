# Screens Directory Organization

This directory is organized by feature/domain to improve maintainability and developer experience.

## Structure

```
src/screens/
├── auth/                    # Authentication & onboarding
│   ├── LoginScreen.tsx
│   ├── SignUpScreen.tsx
│   ├── WelcomeScreen.tsx
│   ├── ProfileSetupScreen.tsx
│   └── index.ts            # Exports all auth screens
├── checkins/               # Check-in related functionality
│   ├── CheckInScreen.tsx
│   ├── CheckInSearchScreen.tsx
│   ├── CheckInFormScreen.tsx
│   ├── CheckInDetailScreen.tsx
│   └── index.ts            # Exports all check-in screens
├── decide/                 # Discovery & recommendations
│   ├── DecideScreen.tsx
│   ├── RecommendationsScreen.tsx
│   └── index.ts            # Exports all decide screens
├── lists/                  # List management
│   ├── ListsScreen.tsx
│   ├── ListDetailScreen.tsx
│   ├── CreateListScreen.tsx
│   ├── EditListScreen.tsx
│   ├── AddPlaceToListScreen.tsx
│   └── index.ts            # Exports all list screens
├── places/                 # Place-related screens
│   ├── PlacesSearchScreen.tsx
│   ├── PlaceDetailScreen.tsx
│   └── index.ts            # Exports all place screens
├── profile/                # User profile & settings
│   ├── ProfileScreen.tsx
│   ├── EditProfileScreen.tsx
│   ├── PreferencesScreen.tsx
│   ├── AchievementDetailScreen.tsx
│   └── index.ts            # Exports all profile screens
```

## Benefits

- **Logical grouping** by feature domain
- **Matches navigation stacks** (CheckInStack, ListsStack, etc.)
- **Cleaner imports** using index files
- **Better team collaboration** with clear ownership boundaries
- **Scalable structure** that grows with the app

## Import Examples

```tsx
// Before reorganization
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';

// After reorganization (cleaner)
import { ProfileScreen, EditProfileScreen } from '../screens/profile';
import { DecideScreen, RecommendationsScreen } from '../screens/decide';

// Or individual imports still work
import ProfileScreen from '../screens/profile/ProfileScreen';
import DecideScreen from '../screens/decide/DecideScreen';
```

## Guidelines

- Place screens in the subdirectory that matches their primary domain
- Shared screens (like PlaceDetails) go in the most logical domain
- Update the index.ts file when adding new screens
- Each domain folder should have a clear, focused responsibility

## Screen Responsibilities

### decide/
- **DecideScreen**: Main discovery page with curated lists and "Help me decide" entry point
- **RecommendationsScreen**: Personalized location-based recommendations with real-time context 