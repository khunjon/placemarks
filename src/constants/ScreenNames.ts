/**
 * Standardized screen names for analytics tracking
 * These names are used consistently across the app for screen view events
 */

// Main Tab Screens
export const SCREEN_NAMES = {
  // Auth Flow
  LOGIN: 'Login',
  PROFILE_SETUP: 'ProfileSetup',
  WELCOME: 'Welcome',
  SIGNUP: 'SignUp',

  // Main Tabs (Root level)
  DECIDE: 'Decide',
  LISTS: 'Lists',
  CHECK_IN: 'CheckIn',
  PROFILE: 'Profile',

  // Decide Stack
  DECIDE_LIST_DETAIL: 'Decide_ListDetail',
  DECIDE_PLACE_DETAIL: 'Decide_PlaceDetail',

  // Lists Stack
  LISTS_LIST_DETAIL: 'Lists_ListDetail',
  LISTS_EDIT_LIST: 'Lists_EditList',
  LISTS_CREATE_LIST: 'Lists_CreateList',
  LISTS_ADD_PLACE: 'Lists_AddPlace',
  LISTS_PLACE_DETAIL: 'Lists_PlaceDetail',

  // Check-in Stack
  CHECKIN_SEARCH: 'CheckIn_Search',
  CHECKIN_FORM: 'CheckIn_Form',
  CHECKIN_DETAIL: 'CheckIn_Detail',

  // Profile Stack
  PROFILE_EDIT: 'Profile_Edit',
  PROFILE_PREFERENCES: 'Profile_Preferences',
  PROFILE_ACHIEVEMENT_DETAIL: 'Profile_AchievementDetail',

  // Common/Shared Screens
  PLACE_SEARCH: 'PlaceSearch',
  PLACE_DETAIL: 'PlaceDetail',
} as const;

// Type for screen names
export type ScreenName = typeof SCREEN_NAMES[keyof typeof SCREEN_NAMES];

// Navigation method types
export const NAVIGATION_METHODS = {
  TAB_PRESS: 'tab_press',
  BACK_BUTTON: 'back_button',
  HEADER_BACK: 'header_back',
  DEEP_LINK: 'deep_link',
  PUSH: 'push',
  REPLACE: 'replace',
  MODAL: 'modal',
  SWIPE_BACK: 'swipe_back',
  PROGRAMMATIC: 'programmatic',
  INITIAL_LOAD: 'initial_load',
} as const;

export type NavigationMethod = typeof NAVIGATION_METHODS[keyof typeof NAVIGATION_METHODS];

// Stack name to screen name mapping for nested navigation
export const STACK_SCREEN_MAPPING = {
  // Main Tab Navigator (maps tab stacks to their default screens)
  MainTabs: {
    DecideStack: SCREEN_NAMES.DECIDE,
    ListsStack: SCREEN_NAMES.LISTS,
    CheckInStack: SCREEN_NAMES.CHECK_IN,
    ProfileStack: SCREEN_NAMES.PROFILE,
  },
  // Bottom Tab Stacks
  DecideStack: {
    Decide: SCREEN_NAMES.DECIDE,
    ListDetail: SCREEN_NAMES.DECIDE_LIST_DETAIL,
    PlaceInListDetail: SCREEN_NAMES.DECIDE_PLACE_DETAIL,
  },
  ListsStack: {
    Lists: SCREEN_NAMES.LISTS,
    ListDetail: SCREEN_NAMES.LISTS_LIST_DETAIL,
    EditList: SCREEN_NAMES.LISTS_EDIT_LIST,
    CreateList: SCREEN_NAMES.LISTS_CREATE_LIST,
    AddPlaceToList: SCREEN_NAMES.LISTS_ADD_PLACE,
    PlaceInListDetail: SCREEN_NAMES.LISTS_PLACE_DETAIL,
  },
  CheckInStack: {
    CheckIn: SCREEN_NAMES.CHECK_IN,
    CheckInSearch: SCREEN_NAMES.CHECKIN_SEARCH,
    CheckInForm: SCREEN_NAMES.CHECKIN_FORM,
    CheckInDetail: SCREEN_NAMES.CHECKIN_DETAIL,
  },
  ProfileStack: {
    Profile: SCREEN_NAMES.PROFILE,
    EditProfile: SCREEN_NAMES.PROFILE_EDIT,
    Preferences: SCREEN_NAMES.PROFILE_PREFERENCES,
    AchievementDetail: SCREEN_NAMES.PROFILE_ACHIEVEMENT_DETAIL,
  },
  // Auth Stack
  Login: SCREEN_NAMES.LOGIN,
  ProfileSetup: SCREEN_NAMES.PROFILE_SETUP,
  Welcome: SCREEN_NAMES.WELCOME,
  SignUp: SCREEN_NAMES.SIGNUP,
} as const;

/**
 * Get standardized screen name from navigation state
 */
export function getScreenNameFromRoute(routeName: string, stackName?: string): ScreenName {
  // Handle nested navigation
  if (stackName && STACK_SCREEN_MAPPING[stackName as keyof typeof STACK_SCREEN_MAPPING]) {
    const stackMapping = STACK_SCREEN_MAPPING[stackName as keyof typeof STACK_SCREEN_MAPPING];
    const screenName = stackMapping[routeName as keyof typeof stackMapping];
    if (screenName) {
      return screenName;
    }
  }

  // Handle direct screen mapping - only for individual screens, not stacks
  const directMapping = STACK_SCREEN_MAPPING[routeName as keyof typeof STACK_SCREEN_MAPPING];
  if (directMapping && typeof directMapping === 'string') {
    return directMapping as ScreenName;
  }

  // Fallback to route name if no mapping found
  console.warn(`No screen name mapping found for route: ${routeName} in stack: ${stackName}`);
  return routeName as ScreenName;
}

/**
 * Get user-friendly screen title for analytics
 */
export function getScreenTitle(screenName: ScreenName): string {
  const titles: Record<ScreenName, string> = {
    [SCREEN_NAMES.LOGIN]: 'Login',
    [SCREEN_NAMES.PROFILE_SETUP]: 'Profile Setup',
    [SCREEN_NAMES.WELCOME]: 'Welcome',
    [SCREEN_NAMES.SIGNUP]: 'Sign Up',
    [SCREEN_NAMES.DECIDE]: 'Decide',
    [SCREEN_NAMES.LISTS]: 'Lists',
    [SCREEN_NAMES.CHECK_IN]: 'Check In',
    [SCREEN_NAMES.PROFILE]: 'Profile',
    [SCREEN_NAMES.DECIDE_LIST_DETAIL]: 'List Detail (Decide)',
    [SCREEN_NAMES.DECIDE_PLACE_DETAIL]: 'Place Detail (Decide)',
    [SCREEN_NAMES.LISTS_LIST_DETAIL]: 'List Detail',
    [SCREEN_NAMES.LISTS_EDIT_LIST]: 'Edit List',
    [SCREEN_NAMES.LISTS_CREATE_LIST]: 'Create List',
    [SCREEN_NAMES.LISTS_ADD_PLACE]: 'Add Place to List',
    [SCREEN_NAMES.LISTS_PLACE_DETAIL]: 'Place Detail (Lists)',
    [SCREEN_NAMES.CHECKIN_SEARCH]: 'Check-in Search',
    [SCREEN_NAMES.CHECKIN_FORM]: 'Check-in Form',
    [SCREEN_NAMES.CHECKIN_DETAIL]: 'Check-in Detail',
    [SCREEN_NAMES.PROFILE_EDIT]: 'Edit Profile',
    [SCREEN_NAMES.PROFILE_PREFERENCES]: 'Preferences',
    [SCREEN_NAMES.PROFILE_ACHIEVEMENT_DETAIL]: 'Achievement Detail',
    [SCREEN_NAMES.PLACE_SEARCH]: 'Place Search',
    [SCREEN_NAMES.PLACE_DETAIL]: 'Place Detail',
  };

  return titles[screenName] || screenName;
} 