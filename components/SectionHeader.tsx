import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';
import { scale } from '../constants/responsive';

export default function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.diamond} />
      <Text style={styles.title}>{title}</Text>
      <View style={styles.diamond} />
    </View>
  );
}

const styles = StyleSheet.create({
container: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing.md,
  marginTop: scale(6),
  paddingHorizontal: theme.spacing.xs,
},
  line: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  diamond: {
    width: 5,
    height: 5,
    backgroundColor: theme.colors.gold,
    transform: [{ rotate: '45deg' }],
    marginHorizontal: scale(6),
  },
  title: {
    fontFamily: theme.fonts.display,
    fontSize: theme.fontSize.xs,
    color: theme.colors.goldLight,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    textShadowColor: 'rgba(200,160,48,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
});