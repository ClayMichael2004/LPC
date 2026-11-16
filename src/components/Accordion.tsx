import React, { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../constants/theme';

interface AccordionProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export default function Accordion({
  title,
  defaultExpanded = true,
  children,
}: AccordionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [contentHeight, setContentHeight] = useState(0);
  const [progress] = useState(() => new Animated.Value(defaultExpanded ? 1 : 0));
  const [rotation] = useState(() => new Animated.Value(defaultExpanded ? 1 : 0));

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);

    Animated.timing(progress, {
      toValue: next ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();

    Animated.timing(rotation, {
      toValue: next ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const animatedHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight],
  });

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.header}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}, ${expanded ? 'collapse' : 'expand'}`}
      >
        <Text style={styles.title}>{title}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronDown size={20} color={COLORS.text} strokeWidth={2.2} />
        </Animated.View>
      </Pressable>

      {/* Off-screen twin element to measure natural height before expanding */}
      <View
        pointerEvents="none"
        style={styles.measuringTwin}
        onLayout={(e) => {
          const { height } = e.nativeEvent.layout;
          if (height > 0 && Math.abs(height - contentHeight) > 1) {
            setContentHeight(height);
          }
        }}
      >
        <View style={styles.body}>{children}</View>
      </View>

      {/* Animated container */}
      <Animated.View style={[styles.collapsible, { height: animatedHeight }]}>
        <View style={styles.body}>{children}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    marginVertical: SPACING.xs,
    overflow: 'hidden',
    ...SHADOW.soft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZE.md,
    color: COLORS.heading,
  },
  collapsible: {
    overflow: 'hidden',
  },
  measuringTwin: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -9999,
    opacity: 0,
  },
  body: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
});
