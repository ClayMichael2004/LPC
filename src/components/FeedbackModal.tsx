import React from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  Pressable,
} from 'react-native';
import { CheckCircle2, AlertCircle, Info, HelpCircle } from 'lucide-react-native';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../constants/theme';

export interface FeedbackModalProps {
  visible: boolean;
  type?: 'info' | 'success' | 'error' | 'confirm';
  title: string;
  message: string;
  primaryText?: string;
  onPrimaryPress: () => void;
  secondaryText?: string;
  onSecondaryPress?: () => void;
  destructive?: boolean;
}

export default function FeedbackModal({
  visible,
  type = 'info',
  title,
  message,
  primaryText = 'OK',
  onPrimaryPress,
  secondaryText,
  onSecondaryPress,
  destructive = false,
}: FeedbackModalProps) {
  if (!visible) return null;

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
            <CheckCircle2 size={28} color="#075B35" strokeWidth={2.4} />
          </View>
        );
      case 'error':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#FCE7F3' }]}>
            <AlertCircle size={28} color="#691414" strokeWidth={2.4} />
          </View>
        );
      case 'confirm':
        return (
          <View style={[styles.iconCircle, { backgroundColor: destructive ? '#FCE7F3' : '#DBEAFE' }]}>
            {destructive ? (
              <AlertCircle size={28} color="#691414" strokeWidth={2.4} />
            ) : (
              <HelpCircle size={28} color="#07345F" strokeWidth={2.4} />
            )}
          </View>
        );
      default:
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#DBEAFE' }]}>
            <Info size={28} color="#07345F" strokeWidth={2.4} />
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSecondaryPress || onPrimaryPress}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onSecondaryPress || onPrimaryPress}
        />
        <View style={styles.card}>
          {renderIcon()}

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actionsRow}>
            {secondaryText && onSecondaryPress ? (
              <Pressable
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
                onPress={onSecondaryPress}
                accessibilityRole="button"
                accessibilityLabel={secondaryText}
              >
                <Text style={styles.secondaryBtnText}>{secondaryText}</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                destructive && styles.destructiveBtn,
                pressed && styles.btnPressed,
              ]}
              onPress={onPrimaryPress}
              accessibilityRole="button"
              accessibilityLabel={primaryText}
            >
              <Text style={styles.primaryBtnText}>{primaryText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOW.card,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.heading,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  message: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  secondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#4B5563',
  },
  primaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.full,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
  },
  destructiveBtn: {
    backgroundColor: '#691414',
  },
  primaryBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
