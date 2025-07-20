import React from 'react';
import { MaterialIcons, Ionicons, FontAwesome, AntDesign, Feather } from '@expo/vector-icons';

// Icon props interface matching Lucide's API
export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: any;
}

// Helper function to create icon components
const createIcon = (IconFamily: any, iconName: string) => {
  return ({ size = 24, color = '#000', style, ...props }: IconProps) => (
    <IconFamily name={iconName} size={size} color={color} style={style} {...props} />
  );
};

// Export all Lucide icons as Expo Vector Icons equivalents
export const AlertCircle = createIcon(MaterialIcons, 'error');
export const Award = createIcon(MaterialIcons, 'emoji-events');
export const Bell = createIcon(MaterialIcons, 'notifications');
export const Bookmark = createIcon(MaterialIcons, 'bookmark');
export const Calendar = createIcon(MaterialIcons, 'event');
export const Camera = createIcon(MaterialIcons, 'camera-alt');
export const Check = createIcon(MaterialIcons, 'check');
export const ChevronRight = createIcon(MaterialIcons, 'chevron-right');
export const Clock = createIcon(MaterialIcons, 'access-time');
export const Coffee = createIcon(MaterialIcons, 'local-cafe');
export const Database = createIcon(MaterialIcons, 'storage');
export const Edit3 = createIcon(MaterialIcons, 'edit');
export const Heart = createIcon(MaterialIcons, 'favorite');
export const Info = createIcon(MaterialIcons, 'info');
export const List = createIcon(MaterialIcons, 'list');
export const MapPin = createIcon(MaterialIcons, 'place');
export const MessageCircle = createIcon(MaterialIcons, 'chat-bubble');
export const Plus = createIcon(MaterialIcons, 'add');
export const Search = createIcon(MaterialIcons, 'search');
export const Settings = createIcon(MaterialIcons, 'settings');
export const Shield = createIcon(MaterialIcons, 'security');
export const ShoppingBag = createIcon(MaterialIcons, 'shopping-cart');
export const Shuffle = createIcon(MaterialIcons, 'shuffle');
export const Sparkles = createIcon(MaterialIcons, 'auto-awesome');
export const Star = createIcon(MaterialIcons, 'star');
export const Target = createIcon(MaterialIcons, 'gps-fixed');
export const Trash2 = createIcon(MaterialIcons, 'delete');
export const TrendingUp = createIcon(MaterialIcons, 'trending-up');
export const Trophy = createIcon(MaterialIcons, 'emoji-events');
export const User = createIcon(MaterialIcons, 'person');
export const Users = createIcon(MaterialIcons, 'group');
export const Utensils = createIcon(MaterialIcons, 'restaurant');
export const Wine = createIcon(MaterialIcons, 'wine-bar');
export const X = createIcon(MaterialIcons, 'close');
export const Zap = createIcon(MaterialIcons, 'flash-on');

// Additional icons used in the app
export const ArrowLeft = createIcon(MaterialIcons, 'arrow-back');
export const Globe = createIcon(MaterialIcons, 'public');
export const Phone = createIcon(MaterialIcons, 'phone');
export const Navigation = createIcon(MaterialIcons, 'navigation');
export const Share = createIcon(MaterialIcons, 'share');
export const CheckSquare = createIcon(MaterialIcons, 'check-box');
export const Square = createIcon(MaterialIcons, 'check-box-outline-blank');
export const ExternalLink = createIcon(MaterialIcons, 'open-in-new');
export const Eye = createIcon(MaterialIcons, 'visibility');
export const EyeOff = createIcon(MaterialIcons, 'visibility-off');
export const Building = createIcon(MaterialIcons, 'account-balance');
export const TreePine = createIcon(MaterialIcons, 'park');
export const SortAsc = createIcon(MaterialIcons, 'sort');
export const CheckCircle = createIcon(MaterialIcons, 'check-circle');
export const Briefcase = createIcon(MaterialIcons, 'work');
export const Music = createIcon(MaterialIcons, 'music-note');
export const Trees = createIcon(MaterialIcons, 'park');
export const Plane = createIcon(MaterialIcons, 'flight');
export const Home = createIcon(MaterialIcons, 'home');
export const Book = createIcon(MaterialIcons, 'book');
export const Gamepad2 = createIcon(MaterialIcons, 'sports-esports');
export const Dumbbell = createIcon(MaterialIcons, 'fitness-center');
export const Pin = createIcon(MaterialIcons, 'push-pin');
export const MoreVertical = createIcon(MaterialIcons, 'more-vert');
export const DollarSign = createIcon(MaterialIcons, 'attach-money');
export const Map = createIcon(MaterialIcons, 'map');
export const BarChart3 = createIcon(MaterialIcons, 'bar-chart');
export const Lock = createIcon(MaterialIcons, 'lock');
export const ThumbsUp = createIcon(MaterialIcons, 'thumb-up');
export const ThumbsDown = createIcon(MaterialIcons, 'thumb-down');
export const LogOut = createIcon(MaterialIcons, 'logout');

// Legacy compatibility - some components might import these
export const LucideIcon = MaterialIcons;
export type LucideIcon = React.ComponentType<IconProps>;

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
  SortAsc,
  CheckCircle,
  Briefcase,
  Music,
  Trees,
  Plane,
  DollarSign,
  Map,
  BarChart3,
  Lock,
  ThumbsUp,
  ThumbsDown,
  LogOut,
};