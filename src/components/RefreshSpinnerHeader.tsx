import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import RedSpinner from './RedSpinner';
import { COLORS, FONTS, RADIUS } from '../constants/theme';

interface RefreshSpinnerHeaderProps {
  refreshing: boolean;
  label?: string;
}

export default function RefreshSpinnerHeader({
  refreshing,
  label = 'Refreshing Little Polo...',
}: RefreshSpinnerHeaderProps) {
  if (!refreshing) return null;

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <RedSpinner size={22} />
        <Text style={styles.text}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#FFE4E6',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  text: {
    fontFamily: FONTS.semibold,
    fontSize: 12,
    color: '#E11D48',
    letterSpacing: -0.2,
  },
});
