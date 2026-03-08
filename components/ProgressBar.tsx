import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';

interface ProgressBarProps {
  current: number;
  total: number;
  showLabel?: boolean;
  height?: number;
  color?: string;
  backgroundColor?: string;
}

export default function ProgressBar({
  current,
  total,
  showLabel = true,
  height = 6,
  color,
  backgroundColor,
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  // Color based on progress
  const getProgressColor = () => {
    if (color) return color;
    if (percentage >= 100) return colors.success;
    if (percentage >= 60) return colors.primary;
    if (percentage >= 30) return colors.warning;
    return colors.accent;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.track, { height, backgroundColor: backgroundColor || colors.surfaceSecondary }]}>
        <View
          style={[
            styles.fill,
            {
              height,
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: getProgressColor(),
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text style={styles.label}>
          {current}/{total} ({percentage}%)
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  track: {
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: borderRadius.pill,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
