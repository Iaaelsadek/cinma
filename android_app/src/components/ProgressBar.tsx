import React from 'react';
import { View, StyleSheet } from 'react-native';

type Props = {
  ratio: number; // 0 to 1
  color?: string;
  height?: number;
};

export const ProgressBar: React.FC<Props> = ({ ratio, color = '#e50914', height = 3 }) => {
  const clampedRatio = Math.min(1, Math.max(0, ratio));
  if (clampedRatio <= 0) return null;

  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: `${clampedRatio * 100}%`, backgroundColor: color, height }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 2,
  },
});
