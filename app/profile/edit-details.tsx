import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Calendar as CalendarIcon, X, ChevronRight } from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import FeedbackModal from '../../src/components/FeedbackModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TUMBLER_ITEM_HEIGHT = 44;
const TUMBLER_VISIBLE_ITEMS = 5;
const TUMBLER_HEIGHT = TUMBLER_ITEM_HEIGHT * TUMBLER_VISIBLE_ITEMS; // 220
const TUMBLER_PADDING = TUMBLER_ITEM_HEIGHT * 2; // 88

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const CURRENT_YEAR = 2026;
const YEARS = Array.from({ length: 87 }, (_, i) => String(CURRENT_YEAR - i)); // 2026 down to 1940

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const WEEKDAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function EditPersonalDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();

  const nameParts = (user?.name || '').trim().split(/\s+/).filter(Boolean);
  const [firstName, setFirstName] = useState(nameParts[0] || '');
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') || '');
  const [email, setEmail] = useState(user?.email === '—' ? '' : user?.email || '');
  const [phone, setPhone] = useState(user?.phone === '—' ? '' : user?.phone || '');
  const [dob, setDob] = useState(user?.dob === '—' ? '' : user?.dob || '');

  // Input Editability states
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  const emailInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);

  // Modals for Date selection
  const [isCalendarModalVisible, setIsCalendarModalVisible] = useState(false);
  const [isLockModalVisible, setIsLockModalVisible] = useState(false);

  // Parsed date components
  const parseCurrentDob = () => {
    if (dob && dob.includes('/')) {
      const [d, m, y] = dob.split('/');
      return {
        day: d.padStart(2, '0'),
        month: m.padStart(2, '0'),
        year: y || '1998',
      };
    }
    return { day: '15', month: '06', year: '1998' };
  };

  const currentParsed = parseCurrentDob();
  const [selectedDay, setSelectedDay] = useState(currentParsed.day);
  const [selectedMonth, setSelectedMonth] = useState(currentParsed.month);
  const [selectedYear, setSelectedYear] = useState(currentParsed.year);

  // For calendar view
  const [calendarViewYear, setCalendarViewYear] = useState(parseInt(currentParsed.year, 10) || 1998);
  const [calendarViewMonth, setCalendarViewMonth] = useState(parseInt(currentParsed.month, 10) || 6); // 1-12
  const [calendarSelectedDate, setCalendarSelectedDate] = useState({
    day: parseInt(currentParsed.day, 10) || 15,
    month: parseInt(currentParsed.month, 10) || 6,
    year: parseInt(currentParsed.year, 10) || 1998,
  });

  // Tumbler Scroll References
  const dayScrollRef = useRef<ScrollView>(null);
  const monthScrollRef = useRef<ScrollView>(null);
  const yearScrollRef = useRef<ScrollView>(null);

  // Synchronize tumbler on open
  useEffect(() => {
    if (isLockModalVisible) {
      const parsed = parseCurrentDob();
      setSelectedDay(parsed.day);
      setSelectedMonth(parsed.month);
      setSelectedYear(parsed.year);

      const dayIdx = Math.max(0, DAYS.indexOf(parsed.day));
      const monthIdx = Math.max(0, MONTHS.indexOf(parsed.month));
      const yearIdx = Math.max(0, YEARS.indexOf(parsed.year));

      setTimeout(() => {
        dayScrollRef.current?.scrollTo({ y: dayIdx * TUMBLER_ITEM_HEIGHT, animated: false });
        monthScrollRef.current?.scrollTo({ y: monthIdx * TUMBLER_ITEM_HEIGHT, animated: false });
        yearScrollRef.current?.scrollTo({ y: yearIdx * TUMBLER_ITEM_HEIGHT, animated: false });
      }, 50);
    }
  }, [isLockModalVisible]);

  // Synchronize calendar on open
  useEffect(() => {
    if (isCalendarModalVisible) {
      const parsed = parseCurrentDob();
      const y = parseInt(parsed.year, 10) || 1998;
      const m = parseInt(parsed.month, 10) || 6;
      const d = parseInt(parsed.day, 10) || 15;
      setCalendarViewYear(y);
      setCalendarViewMonth(m);
      setCalendarSelectedDate({ day: d, month: m, year: y });
    }
  }, [isCalendarModalVisible]);

  // Modern Feedback Modal
  const [feedbackModalState, setFeedbackModalState] = useState<{
    visible: boolean;
    type: 'info' | 'success' | 'error' | 'confirm';
    title: string;
    message: string;
    onPrimaryPress: () => void;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    onPrimaryPress: () => {},
  });

  const handleSaveDetails = async () => {
    if (!firstName.trim()) {
      setFeedbackModalState({
        visible: true,
        type: 'error',
        title: 'First Name Required',
        message: 'Please enter your first name before saving.',
        onPrimaryPress: () => setFeedbackModalState((s) => ({ ...s, visible: false })),
      });
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const initials = `${firstName[0] || 'L'}${lastName[0] || firstName[1] || 'P'}`.toUpperCase();

    await updateProfile({
      name: fullName,
      initials,
      phone: phone.trim() || '—',
      email: email.trim() || '—',
      dob: dob.trim() || '—',
    });

    setFeedbackModalState({
      visible: true,
      type: 'success',
      title: 'Details Saved',
      message: 'Your personal details have been updated successfully.',
      onPrimaryPress: () => {
        setFeedbackModalState((s) => ({ ...s, visible: false }));
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/profile/personal-info');
        }
      },
    });
  };

  // Toggle Email editing
  const handleToggleEmailEdit = () => {
    if (!isEditingEmail) {
      setIsEditingEmail(true);
      setTimeout(() => emailInputRef.current?.focus(), 100);
    } else {
      setIsEditingEmail(false);
    }
  };

  // Toggle Phone editing
  const handleTogglePhoneEdit = () => {
    if (!isEditingPhone) {
      setIsEditingPhone(true);
      setTimeout(() => phoneInputRef.current?.focus(), 100);
    } else {
      setIsEditingPhone(false);
    }
  };

  // Open combination lock
  const handleOpenCombinationLock = () => {
    setIsLockModalVisible(true);
  };

  // Open calendar
  const handleOpenCalendar = () => {
    setIsCalendarModalVisible(true);
  };

  // Apply Combination Lock
  const handleApplyLockDate = () => {
    const formatted = `${selectedDay}/${selectedMonth}/${selectedYear}`;
    setDob(formatted);
    setIsLockModalVisible(false);
  };

  // Apply Calendar Date
  const handleApplyCalendarDate = () => {
    const formatted = `${String(calendarSelectedDate.day).padStart(2, '0')}/${String(calendarSelectedDate.month).padStart(2, '0')}/${calendarSelectedDate.year}`;
    setDob(formatted);
    setIsCalendarModalVisible(false);
  };

  // Calendar helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const handlePrevMonth = () => {
    if (calendarViewMonth === 1) {
      setCalendarViewMonth(12);
      setCalendarViewYear(calendarViewYear - 1);
    } else {
      setCalendarViewMonth(calendarViewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarViewMonth === 12) {
      setCalendarViewMonth(1);
      setCalendarViewYear(calendarViewYear + 1);
    } else {
      setCalendarViewMonth(calendarViewMonth + 1);
    }
  };

  const daysInCurrentMonth = getDaysInMonth(calendarViewYear, calendarViewMonth);
  const firstDayOfWeek = getFirstDayOfMonth(calendarViewYear, calendarViewMonth);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Symmetrical Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile/personal-info'))}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ChevronLeft size={24} color={COLORS.heading} strokeWidth={2.4} />
        </Pressable>

        <Text style={styles.headerTitle}>Personal details</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 90 },
        ]}
      >
        {/* Brand Logo (Little Polo Mascot) */}
        <View style={styles.brandLogoRow}>
          <Image
            source={require('../../assets/images/little-polo-logo.png')}
            style={styles.brandLogoImage}
            resizeMode="contain"
          />
        </View>

        {/* Input 1: First name* (Always Editable) */}
        <View style={styles.inputGroup}>
          <Text style={styles.floatingLabel}>First name*</Text>
          <View style={styles.outlinedBox}>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor="#9CA3AF"
              style={styles.textInput}
            />
          </View>
        </View>

        {/* Input 2: Last name* (Always Editable) */}
        <View style={styles.inputGroup}>
          <Text style={styles.floatingLabel}>Last name*</Text>
          <View style={styles.outlinedBox}>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor="#9CA3AF"
              style={styles.textInput}
            />
          </View>
        </View>

        {/* Input 3: Email address* (Locked until 'Change' is pressed) */}
        <View style={styles.inputGroup}>
          <Text style={styles.floatingLabel}>Email address*</Text>
          <View style={[styles.outlinedBox, !isEditingEmail && styles.outlinedBoxLocked]}>
            <TextInput
              ref={emailInputRef}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              editable={isEditingEmail}
              style={[styles.textInput, !isEditingEmail && styles.textInputLocked]}
            />
            <Pressable
              onPress={handleToggleEmailEdit}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.changeActionText}>
                {isEditingEmail ? 'Done' : 'Change'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Input 4: Phone number (Locked until 'Change' is pressed) */}
        <View style={styles.inputGroup}>
          <Text style={styles.floatingLabel}>Phone number</Text>
          <View style={[styles.outlinedBox, !isEditingPhone && styles.outlinedBoxLocked]}>
            <TextInput
              ref={phoneInputRef}
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              editable={isEditingPhone}
              style={[styles.textInput, !isEditingPhone && styles.textInputLocked]}
            />
            <Pressable
              onPress={handleTogglePhoneEdit}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.changeActionText}>
                {isEditingPhone ? 'Done' : 'Change'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Input 5: Date of birth (Dual Mode: Segments open combination lock, Calendar icon opens calendar) */}
        <View style={styles.inputGroup}>
          <Text style={styles.floatingLabel}>Date of birth (optional)</Text>
          <View style={styles.outlinedBox}>
            {/* Interactive DD/MM/YYYY Segments */}
            <Pressable
              style={styles.dobSegmentContainer}
              onPress={handleOpenCombinationLock}
              accessibilityRole="button"
              accessibilityLabel="Select date using scroll lock"
            >
              <View style={styles.dobSegment}>
                <Text style={styles.dobSegmentText}>
                  {currentParsed.day || 'DD'}
                </Text>
              </View>
              <Text style={styles.dobSeparator}>/</Text>
              <View style={styles.dobSegment}>
                <Text style={styles.dobSegmentText}>
                  {currentParsed.month || 'MM'}
                </Text>
              </View>
              <Text style={styles.dobSeparator}>/</Text>
              <View style={styles.dobSegment}>
                <Text style={styles.dobSegmentText}>
                  {currentParsed.year || 'YYYY'}
                </Text>
              </View>
            </Pressable>

            {/* Calendar Icon Button */}
            <Pressable
              onPress={handleOpenCalendar}
              style={styles.calendarIconButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Open calendar date picker"
            >
              <CalendarIcon size={20} color="#111827" strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Save Details Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 10 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleSaveDetails}
          accessibilityRole="button"
          accessibilityLabel="Save details"
        >
          <Text style={styles.saveButtonText}>Save details</Text>
        </Pressable>
      </View>

      {/* MODAL 1: Minimalist Black & White Scroll Combination Lock */}
      <Modal
        visible={isLockModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLockModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsLockModalVisible(false)}
          />
          <View style={styles.tumblerCard}>
            {/* Header */}
            <View style={styles.tumblerHeader}>
              <View>
                <Text style={styles.tumblerTitle}>DATE OF BIRTH</Text>
                <Text style={styles.tumblerSubtitle}>Scroll lock combination</Text>
              </View>
              <Pressable
                onPress={() => setIsLockModalVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color="#111827" />
              </Pressable>
            </View>

            {/* Column Labels */}
            <View style={styles.tumblerLabelsRow}>
              <Text style={styles.tumblerColLabel}>DAY (DD)</Text>
              <Text style={styles.tumblerColLabel}>MONTH (MM)</Text>
              <Text style={styles.tumblerColLabel}>YEAR (YYYY)</Text>
            </View>

            {/* 3-Column Tumbler Container */}
            <View style={styles.tumblerBody}>
              {/* Central Lock Horizon Indicator */}
              <View pointerEvents="none" style={styles.tumblerHorizonBar} />

              {/* Day Column */}
              <View style={styles.tumblerColumn}>
                <ScrollView
                  ref={dayScrollRef}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={TUMBLER_ITEM_HEIGHT}
                  decelerationRate="fast"
                  contentContainerStyle={{ paddingVertical: TUMBLER_PADDING }}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.y / TUMBLER_ITEM_HEIGHT);
                    const clamped = Math.max(0, Math.min(idx, DAYS.length - 1));
                    setSelectedDay(DAYS[clamped]);
                  }}
                >
                  {DAYS.map((item) => {
                    const isSelected = item === selectedDay;
                    return (
                      <Pressable
                        key={`day-${item}`}
                        style={styles.tumblerItem}
                        onPress={() => {
                          setSelectedDay(item);
                          const idx = DAYS.indexOf(item);
                          dayScrollRef.current?.scrollTo({ y: idx * TUMBLER_ITEM_HEIGHT, animated: true });
                        }}
                      >
                        <Text style={[styles.tumblerItemText, isSelected && styles.tumblerItemTextActive]}>
                          {item}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Month Column */}
              <View style={styles.tumblerColumn}>
                <ScrollView
                  ref={monthScrollRef}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={TUMBLER_ITEM_HEIGHT}
                  decelerationRate="fast"
                  contentContainerStyle={{ paddingVertical: TUMBLER_PADDING }}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.y / TUMBLER_ITEM_HEIGHT);
                    const clamped = Math.max(0, Math.min(idx, MONTHS.length - 1));
                    setSelectedMonth(MONTHS[clamped]);
                  }}
                >
                  {MONTHS.map((item) => {
                    const isSelected = item === selectedMonth;
                    return (
                      <Pressable
                        key={`month-${item}`}
                        style={styles.tumblerItem}
                        onPress={() => {
                          setSelectedMonth(item);
                          const idx = MONTHS.indexOf(item);
                          monthScrollRef.current?.scrollTo({ y: idx * TUMBLER_ITEM_HEIGHT, animated: true });
                        }}
                      >
                        <Text style={[styles.tumblerItemText, isSelected && styles.tumblerItemTextActive]}>
                          {item}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Year Column */}
              <View style={styles.tumblerColumn}>
                <ScrollView
                  ref={yearScrollRef}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={TUMBLER_ITEM_HEIGHT}
                  decelerationRate="fast"
                  contentContainerStyle={{ paddingVertical: TUMBLER_PADDING }}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.y / TUMBLER_ITEM_HEIGHT);
                    const clamped = Math.max(0, Math.min(idx, YEARS.length - 1));
                    setSelectedYear(YEARS[clamped]);
                  }}
                >
                  {YEARS.map((item) => {
                    const isSelected = item === selectedYear;
                    return (
                      <Pressable
                        key={`year-${item}`}
                        style={styles.tumblerItem}
                        onPress={() => {
                          setSelectedYear(item);
                          const idx = YEARS.indexOf(item);
                          yearScrollRef.current?.scrollTo({ y: idx * TUMBLER_ITEM_HEIGHT, animated: true });
                        }}
                      >
                        <Text style={[styles.tumblerItemText, isSelected && styles.tumblerItemTextActive]}>
                          {item}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Selected Date Preview & Action */}
            <View style={styles.tumblerFooter}>
              <View style={styles.tumblerPreviewRow}>
                <Text style={styles.tumblerPreviewLabel}>Selected Date:</Text>
                <Text style={styles.tumblerPreviewValue}>
                  {selectedDay} / {selectedMonth} / {selectedYear}
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [styles.tumblerApplyBtn, pressed && styles.buttonPressed]}
                onPress={handleApplyLockDate}
                accessibilityRole="button"
                accessibilityLabel="Set date"
              >
                <Text style={styles.tumblerApplyBtnText}>Set Date</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Minimalist Black & White Calendar Grid */}
      <Modal
        visible={isCalendarModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCalendarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsCalendarModalVisible(false)}
          />
          <View style={styles.calendarCard}>
            {/* Calendar Header with Month/Year Navigation */}
            <View style={styles.calendarHeaderRow}>
              <Pressable
                onPress={handlePrevMonth}
                style={styles.calendarNavBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
              >
                <ChevronLeft size={22} color="#111827" strokeWidth={2.2} />
              </Pressable>

              <Text style={styles.calendarMonthTitle}>
                {MONTH_NAMES[calendarViewMonth - 1]} {calendarViewYear}
              </Text>

              <Pressable
                onPress={handleNextMonth}
                style={styles.calendarNavBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Next month"
              >
                <ChevronRight size={22} color="#111827" strokeWidth={2.2} />
              </Pressable>
            </View>

            {/* Day of Week Headers */}
            <View style={styles.calendarWeekdayRow}>
              {WEEKDAY_NAMES.map((name, idx) => (
                <Text key={`weekday-${idx}`} style={styles.calendarWeekdayText}>
                  {name}
                </Text>
              ))}
            </View>

            {/* Calendar Days Grid */}
            <View style={styles.calendarGrid}>
              {/* Empty leading offset cells */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <View key={`empty-${idx}`} style={styles.calendarDayCell} />
              ))}

              {/* Month Day Cells */}
              {Array.from({ length: daysInCurrentMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const isSelected =
                  calendarSelectedDate.day === dayNum &&
                  calendarSelectedDate.month === calendarViewMonth &&
                  calendarSelectedDate.year === calendarViewYear;

                return (
                  <Pressable
                    key={`cal-day-${dayNum}`}
                    style={[styles.calendarDayCell, isSelected && styles.calendarDayCellSelected]}
                    onPress={() => {
                      setCalendarSelectedDate({
                        day: dayNum,
                        month: calendarViewMonth,
                        year: calendarViewYear,
                      });
                    }}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        isSelected && styles.calendarDayTextSelected,
                      ]}
                    >
                      {dayNum}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Calendar Footer Actions */}
            <View style={styles.calendarFooterRow}>
              <Pressable
                style={styles.calendarCancelBtn}
                onPress={() => setIsCalendarModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.calendarCancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.calendarConfirmBtn, pressed && styles.buttonPressed]}
                onPress={handleApplyCalendarDate}
                accessibilityRole="button"
                accessibilityLabel="Confirm date"
              >
                <Text style={styles.calendarConfirmBtnText}>Confirm Date</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {/* Modern In-App Feedback Modal */}
      <FeedbackModal
        visible={feedbackModalState.visible}
        type={feedbackModalState.type}
        title={feedbackModalState.title}
        message={feedbackModalState.message}
        onPrimaryPress={feedbackModalState.onPrimaryPress}
      />
    </KeyboardAvoidingView>
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
    paddingTop: SPACING.md,
  },
  brandLogoRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  brandLogoImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  floatingLabel: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  outlinedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    height: 56,
    backgroundColor: COLORS.white,
  },
  outlinedBoxLocked: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.heading,
  },
  textInputLocked: {
    color: '#4B5563',
  },
  changeActionText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  dobSegmentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  dobSegment: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dobSegmentText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: COLORS.heading,
    letterSpacing: 0.5,
  },
  dobSeparator: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: '#9CA3AF',
    marginHorizontal: 4,
  },
  calendarIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
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

  // Modal Common Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },

  // Tumbler Combination Lock Styles
  tumblerCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: SPACING.lg,
    ...SHADOW.card,
  },
  tumblerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  tumblerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#111827',
    letterSpacing: 0.5,
  },
  tumblerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  tumblerLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 4,
  },
  tumblerColLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    width: '30%',
  },
  tumblerBody: {
    height: TUMBLER_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  tumblerHorizonBar: {
    position: 'absolute',
    top: TUMBLER_ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: TUMBLER_ITEM_HEIGHT,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#111827',
    backgroundColor: 'rgba(0,0,0,0.02)',
    zIndex: 1,
  },
  tumblerColumn: {
    flex: 1,
    height: TUMBLER_HEIGHT,
  },
  tumblerItem: {
    height: TUMBLER_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tumblerItemText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: '#9CA3AF',
  },
  tumblerItemTextActive: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: '#111827',
  },
  tumblerFooter: {
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: SPACING.md,
  },
  tumblerPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  tumblerPreviewLabel: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#6B7280',
  },
  tumblerPreviewValue: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#111827',
    letterSpacing: 1,
  },
  tumblerApplyBtn: {
    height: 48,
    backgroundColor: '#111827',
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tumblerApplyBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },

  // Calendar Grid Styles
  calendarCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: SPACING.lg,
    ...SHADOW.card,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  calendarNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  calendarMonthTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#111827',
  },
  calendarWeekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  calendarWeekdayText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#9CA3AF',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
  },
  calendarDayCell: {
    width: `${100 / 7}%`,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 19,
  },
  calendarDayCellSelected: {
    backgroundColor: '#111827',
  },
  calendarDayText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#111827',
  },
  calendarDayTextSelected: {
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  calendarFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: SPACING.md,
  },
  calendarCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  calendarCancelBtnText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#6B7280',
  },
  calendarConfirmBtn: {
    height: 44,
    paddingHorizontal: 20,
    backgroundColor: '#111827',
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarConfirmBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
