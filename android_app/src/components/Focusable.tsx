import React, { useState } from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface FocusableProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  focusedStyle?: StyleProp<ViewStyle>;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const Focusable: React.FC<FocusableProps> = ({
  children,
  onPress,
  style,
  focusedStyle,
  onFocus,
  onBlur,
}) => {
  const isTV = Platform.isTV;
  const [isFocused, setIsFocused] = useState(false);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleFocus = () => {
    if (!isTV) return;
    setIsFocused(true);
    scale.value = withSpring(1.05, { damping: 10, stiffness: 200 });
    onFocus?.();
  };

  const handleBlur = () => {
    if (!isTV) return;
    setIsFocused(false);
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
    onBlur?.();
  };

  if (!isTV) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={style}>
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
      style={[style, isFocused && (focusedStyle || styles.defaultFocused)]}
    >
      <Animated.View style={[styles.contentWrapper, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  defaultFocused: {
    borderColor: '#00e5ff',
    borderWidth: 2,
    borderRadius: 8,
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  contentWrapper: {
    flex: 1,
  },
});
