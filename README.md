# Placemarks

A React Native Expo app for discovering, saving, and sharing your favorite places.

## Features

- 📍 **Location Discovery**: Find and save interesting places
- 🗺️ **Interactive Maps**: View places on an interactive map
- 📝 **Check-ins**: Record visits with notes and photos
- 📋 **Lists**: Organize places into custom lists
- 👤 **User Profiles**: Personal accounts with authentication
- 🔄 **Offline Support**: Works offline with local caching
- 🔐 **Secure**: Built with Supabase authentication and database

## Tech Stack

- **Frontend**: React Native with Expo
- **Language**: TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Navigation**: React Navigation
- **Maps**: React Native Maps
- **Location**: Expo Location
- **Storage**: AsyncStorage + Expo SQLite

## Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio/Emulator (for Android development)

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/khunjon/placemarks.git
   cd placemarks
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Fill in your Supabase credentials and other API keys:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

4. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the database migrations (see Database Schema section)
   - Configure authentication providers if needed

5. **Start the development server**
   ```bash
   npm start
   ```

## Database Schema

The app requires the following Supabase tables:

### Users Table
```sql
CREATE TABLE users (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Places Table
```sql
CREATE TABLE places (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  category TEXT,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Check-ins Table
```sql
CREATE TABLE checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  place_id UUID REFERENCES places(id) ON DELETE CASCADE,
  notes TEXT,
  photos TEXT[],
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Lists Table
```sql
CREATE TABLE lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  place_ids UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Development

### Running the App

- **iOS**: `npm run ios`
- **Android**: `npm run android`
- **Web**: `npm run web`

### Project Structure

```
placemarks/
├── src/
│   ├── components/      # Reusable UI components
│   ├── screens/         # Screen components
│   ├── services/        # API services and utilities
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Helper functions
│   └── constants/       # App constants
├── App.tsx              # Main app component
└── package.json
```

### Key Files

- `src/services/supabase.ts` - Supabase client and API functions
- `src/services/auth-context.tsx` - Authentication context provider
- `src/types/database.ts` - TypeScript interfaces and types
- `src/utils/location.ts` - Location utilities and permissions
- `src/components/Navigation.tsx` - App navigation setup

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue on GitHub or contact the development team.
