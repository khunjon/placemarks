import React from 'react';
import { icons, LucideProps } from 'lucide-react-native';
import { ColorValue } from 'react-native';

interface DynamicIconProps {
  name: keyof typeof icons;
  color?: ColorValue;
  size?: LucideProps['size'];
  strokeWidth?: number;
  style?: any;
}

/**
 * Dynamic icon component that uses the icons export from lucide-react-native.
 * This implementation has better compatibility with production builds.
 */
const DynamicIcon: React.FC<DynamicIconProps> = ({ 
  name, 
  color = '#000', 
  size = 24, 
  strokeWidth = 2,
  style,
  ...props 
}) => {
  const LucideIcon = icons[name] as React.FC<LucideProps & { color?: ColorValue }>;
  
  if (!LucideIcon) {
    console.warn(`Icon "${name}" not found in lucide-react-native`);
    return null;
  }
  
  return (
    <LucideIcon 
      color={color} 
      size={size} 
      strokeWidth={strokeWidth}
      style={style}
      {...props}
    />
  );
};

export default DynamicIcon;