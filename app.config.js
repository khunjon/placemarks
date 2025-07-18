export default () => {
  return {
    expo: {
      name: "Placemarks",
      slug: "placemarks",
      version: "1.0.0",
      orientation: "portrait",
      icon: "./assets/icon.png",
      userInterfaceStyle: "light",
      newArchEnabled: true,
      scheme: "placemarks",
      splash: {
        image: "./assets/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#2563eb"
      },
      ios: {
        supportsTablet: true,
        bundleIdentifier: "xyz.placemarks.app",
        associatedDomains: [
          "applinks:placemarks.xyz",
          "webcredentials:placemarks.xyz"
        ],
        infoPlist: {
          NSLocationWhenInUseUsageDescription: "Placemarks uses your location to help you discover nearby places, show relevant recommendations, and save your favorite spots with location context.",
          NSLocationAlwaysAndWhenInUseUsageDescription: "Placemarks uses your location to help you discover nearby places, show relevant recommendations, and save your favorite spots with location context.",
          NSCameraUsageDescription: "Placemarks needs access to your camera to let you take photos of places you visit and add them to your check-ins.",
          NSPhotoLibraryUsageDescription: "Placemarks needs access to your photo library to let you select photos of places you visit and add them to your check-ins.",
          NSPhotoLibraryAddUsageDescription: "Placemarks needs permission to save photos you take of places to your photo library.",
          ITSAppUsesNonExemptEncryption: false
        }
      },
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/adaptive-icon.png",
          backgroundColor: "#2563eb"
        },
        edgeToEdgeEnabled: true,
        package: "xyz.placemarks.app",
        permissions: [
          "ACCESS_FINE_LOCATION",
          "ACCESS_COARSE_LOCATION",
          "android.permission.ACCESS_COARSE_LOCATION",
          "android.permission.ACCESS_FINE_LOCATION"
        ]
      },
      web: {
        favicon: "./assets/favicon.png"
      },
      plugins: [
        "expo-location",
        "expo-image-picker",
        "expo-camera"
      ],
      extra: {
        eas: {
          projectId: "bd50644d-541a-485f-a6e2-43992ad3145f"
        },
        // Environment variables accessible at runtime
        googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        amplitudeApiKey: process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY,
        googlePlacesCacheDays: process.env.EXPO_PUBLIC_GOOGLE_PLACES_CACHE_DAYS || "90",
      },
      owner: "khunjon"
    }
  };
};