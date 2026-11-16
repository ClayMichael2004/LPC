import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, MessageSquare, Mail, Bell, Sparkles } from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import FeedbackModal from '../../src/components/FeedbackModal';

export default function CommunicationPreferencesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [smsEnabled, setSmsEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [promoEnabled, setPromoEnabled] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSave = () => {
    setShowSuccessModal(true);
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Symmetrical Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ChevronLeft size={24} color={COLORS.heading} strokeWidth={2.4} />
        </Pressable>

        <Text style={styles.headerTitle}>Communication preferences</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 80 },
        ]}
      >
        <Text style={styles.sectionDesc}>
          Select how you would like Little Polo Cafe to notify you regarding orders, receipts, and weekend painting events.
        </Text>

        <View style={styles.cardGroup}>
          {/* SMS Notifications */}
          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#DBEAFE' }]}>
                <MessageSquare size={20} color="#07345F" strokeWidth={2.2} />
              </View>
              <View style={styles.textGroup}>
                <Text style={styles.prefTitle}>SMS Order Tracking</Text>
                <Text style={styles.prefSub}>Real-time courier dispatch & arrival alerts via text.</Text>
              </View>
            </View>
            <Switch
              value={smsEnabled}
              onValueChange={setSmsEnabled}
              trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          <View style={styles.divider} />

          {/* WhatsApp Updates */}
          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
                <Bell size={20} color="#075B35" strokeWidth={2.2} />
              </View>
              <View style={styles.textGroup}>
                <Text style={styles.prefTitle}>WhatsApp Updates</Text>
                <Text style={styles.prefSub}>Sunday family painting reminders and appointment confirmations.</Text>
              </View>
            </View>
            <Switch
              value={whatsappEnabled}
              onValueChange={setWhatsappEnabled}
              trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          <View style={styles.divider} />

          {/* Email Receipts */}
          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#FCE7F3' }]}>
                <Mail size={20} color="#691414" strokeWidth={2.2} />
              </View>
              <View style={styles.textGroup}>
                <Text style={styles.prefTitle}>Email Receipts</Text>
                <Text style={styles.prefSub}>Digital VAT receipts and monthly order summaries.</Text>
              </View>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={setEmailEnabled}
              trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          <View style={styles.divider} />

          {/* Offers & Specials */}
          <View style={styles.prefRow}>
            <View style={styles.prefLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#E5D9FF' }]}>
                <Sparkles size={20} color="#4C1D95" strokeWidth={2.2} />
              </View>
              <View style={styles.textGroup}>
                <Text style={styles.prefTitle}>Offers & Seasonal Specials</Text>
                <Text style={styles.prefSub}>Early access to holiday menus and cold brew deals.</Text>
              </View>
            </View>
            <Switch
              value={promoEnabled}
              onValueChange={setPromoEnabled}
              trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 10 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel="Save preferences"
        >
          <Text style={styles.saveButtonText}>Save preferences</Text>
        </Pressable>
      </View>

      {/* Modern In-App Feedback Modal */}
      <FeedbackModal
        visible={showSuccessModal}
        type="success"
        title="Preferences Saved"
        message="Your communication preferences have been updated."
        primaryText="Done"
        onPrimaryPress={handleModalClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.heading,
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  sectionDesc: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: SPACING.xl,
  },
  cardGroup: {
    backgroundColor: '#FAFAFA',
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    ...SHADOW.soft,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: SPACING.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  textGroup: {
    flex: 1,
  },
  prefTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.heading,
    marginBottom: 2,
  },
  prefSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  saveButton: {
    height: 52,
    backgroundColor: '#111827',
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  saveButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
  },
});
