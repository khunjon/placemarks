import React from 'react';
import {
  AlertCircle as LucideAlertCircle,
  Award as LucideAward,
  Bell as LucideBell,
  Bookmark as LucideBookmark,
  Calendar as LucideCalendar,
  Camera as LucideCamera,
  Check as LucideCheck,
  ChevronRight as LucideChevronRight,
  Clock as LucideClock,
  Coffee as LucideCoffee,
  Database as LucideDatabase,
  Edit3 as LucideEdit3,
  Heart as LucideHeart,
  Info as LucideInfo,
  List as LucideList,
  MapPin as LucideMapPin,
  MessageCircle as LucideMessageCircle,
  Plus as LucidePlus,
  Search as LucideSearch,
  Settings as LucideSettings,
  Shield as LucideShield,
  ShoppingBag as LucideShoppingBag,
  Shuffle as LucideShuffle,
  Stars as LucideStars,
  Star as LucideStar,
  Target as LucideTarget,
  Trash2 as LucideTrash2,
  TrendingUp as LucideTrendingUp,
  Trophy as LucideTrophy,
  User as LucideUser,
  Users as LucideUsers,
  Utensils as LucideUtensils,
  Wine as LucideWine,
  X as LucideX,
  Zap as LucideZap,
  ArrowLeft as LucideArrowLeft,
  Globe as LucideGlobe,
  Phone as LucidePhone,
  Navigation as LucideNavigation,
  Share as LucideShare,
  CheckSquare as LucideCheckSquare,
  Square as LucideSquare,
  ExternalLink as LucideExternalLink,
  Eye as LucideEye,
  EyeOff as LucideEyeOff,
  Building as LucideBuilding,
  Trees as LucideTrees,
  ArrowUpDown as LucideArrowUpDown,
  CheckCircle as LucideCheckCircle,
  Briefcase as LucideBriefcase,
  Music as LucideMusic,
  Plane as LucidePlane,
  Home as LucideHome,
  Book as LucideBook,
  Gamepad2 as LucideGamepad2,
  Dumbbell as LucideDumbbell,
  Pin as LucidePin,
  MoreVertical as LucideMoreVertical,
  DollarSign as LucideDollarSign,
  Map as LucideMap,
  BarChart3 as LucideBarChart3,
  Lock as LucideLock,
  ThumbsUp as LucideThumbsUp,
  ThumbsDown as LucideThumbsDown,
  LogOut as LucideLogOut,
  // Additional icons for emoji replacements
  Store as LucideStore,
  Building2 as LucideBuilding2,
  Route as LucideRoute,
  Waves as LucideWaves,
  PersonStanding as LucidePersonStanding,
  Train as LucideTrain,
  Bus as LucideBus,
  Car as LucideCar,
  Bike as LucideBike,
  Ship as LucideShip,
  Volume as LucideVolume,
  Volume1 as LucideVolume1,
  Volume2 as LucideVolume2,
  Bed as LucideBed,
  Smile as LucideSmile,
  CloudRain as LucideCloudRain,
  CloudSun as LucideCloudSun,
  Flame as LucideFlame,
  Thermometer as LucideThermometer,
  Wifi as LucideWifi,
  ParkingCircle as LucideParkingCircle,
  Sunrise as LucideSunrise,
  Sunset as LucideSunset,
  Moon as LucideMoon,
  Cross as LucideCross,
  GraduationCap as LucideGraduationCap,
  Fuel as LucideFuel,
  Film as LucideFilm,
  Church as LucideChurch,
  RotateCcw as LucideRotateCcw,
  ShoppingCart as LucideShoppingCart,
  Cookie as LucideCookie,
  Mail as LucideMail,
  Tag as LucideTag,
} from 'lucide-react-native';

// Icon props interface matching Lucide's API
export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: any;
}

// Helper function to create icon components with consistent props
const createIcon = (LucideIcon: any) => {
  return ({ size = 24, color = '#000', strokeWidth = 2, style, ...props }: IconProps) => (
    <LucideIcon size={size} color={color} strokeWidth={strokeWidth} style={style} {...props} />
  );
};

// Export all Lucide icons with consistent API
export const AlertCircle = createIcon(LucideAlertCircle);
export const Award = createIcon(LucideAward);
export const Bell = createIcon(LucideBell);
export const Bookmark = createIcon(LucideBookmark);
export const Calendar = createIcon(LucideCalendar);
export const Camera = createIcon(LucideCamera);
export const Check = createIcon(LucideCheck);
export const ChevronRight = createIcon(LucideChevronRight);
export const Clock = createIcon(LucideClock);
export const Coffee = createIcon(LucideCoffee);
export const Database = createIcon(LucideDatabase);
export const Edit3 = createIcon(LucideEdit3);
export const Heart = createIcon(LucideHeart);
export const Info = createIcon(LucideInfo);
export const List = createIcon(LucideList);
export const MapPin = createIcon(LucideMapPin);
export const MessageCircle = createIcon(LucideMessageCircle);
export const Plus = createIcon(LucidePlus);
export const Search = createIcon(LucideSearch);
export const Settings = createIcon(LucideSettings);
export const Shield = createIcon(LucideShield);
export const ShoppingBag = createIcon(LucideShoppingBag);
export const Shuffle = createIcon(LucideShuffle);
export const Sparkles = createIcon(LucideStars); // Using Stars as equivalent to Sparkles
export const Star = createIcon(LucideStar);
export const Target = createIcon(LucideTarget);
export const Trash2 = createIcon(LucideTrash2);
export const TrendingUp = createIcon(LucideTrendingUp);
export const Trophy = createIcon(LucideTrophy);
export const User = createIcon(LucideUser);
export const Users = createIcon(LucideUsers);
export const Utensils = createIcon(LucideUtensils);
export const Wine = createIcon(LucideWine);
export const X = createIcon(LucideX);
export const Zap = createIcon(LucideZap);

// Additional icons used in the app
export const ArrowLeft = createIcon(LucideArrowLeft);
export const Globe = createIcon(LucideGlobe);
export const Phone = createIcon(LucidePhone);
export const Navigation = createIcon(LucideNavigation);
export const Share = createIcon(LucideShare);
export const CheckSquare = createIcon(LucideCheckSquare);
export const Square = createIcon(LucideSquare);
export const ExternalLink = createIcon(LucideExternalLink);
export const Eye = createIcon(LucideEye);
export const EyeOff = createIcon(LucideEyeOff);
export const Building = createIcon(LucideBuilding);
export const TreePine = createIcon(LucideTrees); // Using Trees as equivalent
export const Trees = createIcon(LucideTrees);
export const SortAsc = createIcon(LucideArrowUpDown); // Using ArrowUpDown as equivalent
export const CheckCircle = createIcon(LucideCheckCircle);
export const Briefcase = createIcon(LucideBriefcase);
export const Music = createIcon(LucideMusic);
export const Plane = createIcon(LucidePlane);
export const Home = createIcon(LucideHome);
export const Book = createIcon(LucideBook);
export const Gamepad2 = createIcon(LucideGamepad2);
export const Dumbbell = createIcon(LucideDumbbell);
export const Pin = createIcon(LucidePin);
export const MoreVertical = createIcon(LucideMoreVertical);
export const DollarSign = createIcon(LucideDollarSign);
export const Map = createIcon(LucideMap);
export const BarChart3 = createIcon(LucideBarChart3);
export const Lock = createIcon(LucideLock);
export const ThumbsUp = createIcon(LucideThumbsUp);
export const ThumbsDown = createIcon(LucideThumbsDown);
export const LogOut = createIcon(LucideLogOut);

// New icons for emoji replacements
export const Store = createIcon(LucideStore);
export const Building2 = createIcon(LucideBuilding2);
export const Route = createIcon(LucideRoute);
export const Waves = createIcon(LucideWaves);
export const PersonStanding = createIcon(LucidePersonStanding);
export const Train = createIcon(LucideTrain);
export const Bus = createIcon(LucideBus);
export const Car = createIcon(LucideCar);
export const Bike = createIcon(LucideBike);
export const Ship = createIcon(LucideShip);
export const Volume = createIcon(LucideVolume);
export const Volume1 = createIcon(LucideVolume1);
export const Volume2 = createIcon(LucideVolume2);
export const Zzz = createIcon(LucideBed);
export const Smile = createIcon(LucideSmile);
export const CloudRain = createIcon(LucideCloudRain);
export const CloudSun = createIcon(LucideCloudSun);
export const Flame = createIcon(LucideFlame);
export const Thermometer = createIcon(LucideThermometer);
export const Wifi = createIcon(LucideWifi);
export const ParkingCircle = createIcon(LucideParkingCircle);
export const Sunrise = createIcon(LucideSunrise);
export const Sunset = createIcon(LucideSunset);
export const Moon = createIcon(LucideMoon);
export const Cross = createIcon(LucideCross);
export const GraduationCap = createIcon(LucideGraduationCap);
export const Fuel = createIcon(LucideFuel);
export const Film = createIcon(LucideFilm);
export const Church = createIcon(LucideChurch);
export const RotateCcw = createIcon(LucideRotateCcw);
export const ShoppingCart = createIcon(LucideShoppingCart);
export const Cookie = createIcon(LucideCookie);
export const Mail = createIcon(LucideMail);
export const Tag = createIcon(LucideTag);

// Legacy compatibility type export
export type LucideIcon = React.ComponentType<IconProps>;

// Export the dynamic icon component for production build compatibility
export { default as DynamicIcon } from './DynamicIcon';

// Default export for convenience
export default {
  AlertCircle,
  Award,
  Bell,
  Bookmark,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  Clock,
  Coffee,
  Database,
  Edit3,
  Heart,
  Info,
  List,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  Shuffle,
  Sparkles,
  Star,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  User,
  Users,
  Utensils,
  Wine,
  X,
  Zap,
  ArrowLeft,
  Globe,
  Phone,
  Navigation,
  Share,
  CheckSquare,
  Square,
  ExternalLink,
  Eye,
  EyeOff,
  Building,
  TreePine,
  Trees,
  SortAsc,
  CheckCircle,
  Briefcase,
  Music,
  Plane,
  Home,
  Book,
  Gamepad2,
  Dumbbell,
  Pin,
  MoreVertical,
  DollarSign,
  Map,
  BarChart3,
  Lock,
  ThumbsUp,
  ThumbsDown,
  LogOut,
  // New icons for emoji replacements
  Store,
  Building2,
  Route,
  Waves,
  PersonStanding,
  Train,
  Bus,
  Car,
  Bike,
  Ship,
  Volume,
  Volume1,
  Volume2,
  Zzz,
  Smile,
  CloudRain,
  CloudSun,
  Flame,
  Thermometer,
  Wifi,
  ParkingCircle,
  Sunrise,
  Sunset,
  Moon,
  Cross,
  GraduationCap,
  Fuel,
  Film,
  Church,
  RotateCcw,
  ShoppingCart,
  Cookie,
  Mail,
  Tag,
};