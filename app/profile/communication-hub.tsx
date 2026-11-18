import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Mail,
  MessageCircle,
  Users,
  Send,
  History,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../../src/constants/theme';
import { adminApi } from '../../src/services/api';
import { BroadcastLog, BroadcastRecipient } from '../../src/types';

export default function CommunicationHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [audienceCount, setAudienceCount] = useState<number>(0);
  const [audienceRecipients, setAudienceRecipients] = useState<
    Array<{ id: string; name: string; target: string }>
  >([]);
  const [showAudienceList, setShowAudienceList] = useState(false);
  const [loadingAudience, setLoadingAudience] = useState(true);

  // Sending state
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessModalVisible, setSendSuccessModalVisible] = useState(false);
  const [lastSentLog, setLastSentLog] = useState<BroadcastLog | null>(null);

  // Logs modal
  const [logsModalVisible, setLogsModalVisible] = useState(false);
  const [logs, setLogs] = useState<BroadcastLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Fetch Audience for active channel
  const fetchAudience = useCallback(async (chan: 'email' | 'whatsapp') => {
    setLoadingAudience(true);
    try {
      const data = await adminApi.getAudience(chan);
      setAudienceCount(data.count);
      setAudienceRecipients(data.recipients || []);
    } catch {
      setAudienceCount(0);
      setAudienceRecipients([]);
    } finally {
      setLoadingAudience(false);
    }
  }, []);

  useEffect(() => {
    fetchAudience(channel);
  }, [channel, fetchAudience]);

  // Fetch Sent Broadcast Logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await adminApi.getBroadcastLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleOpenLogsModal = () => {
    fetchLogs();
    setLogsModalVisible(true);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  const handleConfirmSend = () => {
    if (channel === 'email' && !subject.trim()) {
      Alert.alert('Subject Required', 'Please provide a clear subject line for your email announcement.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Message Required', 'Please enter your message before sending.');
      return;
    }

    Alert.alert(
      'Confirm Broadcast',
      `Send this ${channel.toUpperCase()} announcement to ${audienceCount} registered customer${
        audienceCount === 1 ? '' : 's'
      } who opted in?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Now',
          style: 'default',
          onPress: executeSendBroadcast,
        },
      ]
    );
  };

  const executeSendBroadcast = async () => {
    setIsSending(true);
    try {
      const result = await adminApi.sendBroadcast(
        channel,
        subject.trim(),
        message.trim()
      );
      setLastSentLog(result);
      setSubject('');
      setMessage('');
      setSendSuccessModalVisible(true);
    } catch (err: any) {
      Alert.alert('Broadcast Error', err.message || 'Could not dispatch broadcast. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const formatLogDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Symmetrical Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Back to Profile"
        >
          <ChevronLeft size={24} color={COLORS.heading} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Communications Hub</Text>
          <Text style={styles.headerSubtitle}>Broadcast Updates & Specials</Text>
        </View>

        {/* Symmetrical spacer matching back button */}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]}
      >
        {/* Intro Card */}
        <View style={styles.introCard}>
          <View style={styles.introIconCircle}>
            <Sparkles size={20} color={COLORS.serviceBlueIcon} strokeWidth={2.2} />
          </View>
          <View style={styles.introTextGroup}>
            <Text style={styles.introTitle}>Customer Notifications</Text>
            <Text style={styles.introDesc}>
              Messages are strictly delivered to customers who gave consent in their Communication Preferences.
            </Text>
          </View>
        </View>

        {/* View Sent Logs Button */}
        <Pressable
          style={styles.viewLogsBtn}
          onPress={handleOpenLogsModal}
          accessibilityRole="button"
          accessibilityLabel="View All Sent Notifications"
        >
          <History size={18} color={COLORS.primary} strokeWidth={2.2} />
          <Text style={styles.viewLogsBtnText}>View All Sent Notifications</Text>
        </Pressable>

        {/* Channel Selector Tabs */}
        <Text style={styles.sectionLabel}>DELIVERY CHANNEL</Text>
        <View style={styles.channelTabs}>
          <Pressable
            style={[
              styles.channelTab,
              channel === 'email' && styles.channelTabActiveEmail,
            ]}
            onPress={() => setChannel('email')}
            accessibilityRole="tab"
            accessibilityState={{ selected: channel === 'email' }}
          >
            <Mail
              size={18}
              color={channel === 'email' ? COLORS.serviceBlueIcon : COLORS.textSecondary}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.channelTabText,
                channel === 'email' && styles.channelTabTextActiveEmail,
              ]}
            >
              Email Broadcast
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.channelTab,
              channel === 'whatsapp' && styles.channelTabActiveWhatsApp,
            ]}
            onPress={() => setChannel('whatsapp')}
            accessibilityRole="tab"
            accessibilityState={{ selected: channel === 'whatsapp' }}
          >
            <MessageCircle
              size={18}
              color={channel === 'whatsapp' ? '#075B35' : COLORS.textSecondary}
              strokeWidth={2.2}
            />
            <Text
              style={[
                styles.channelTabText,
                channel === 'whatsapp' && styles.channelTabTextActiveWhatsApp,
              ]}
            >
              WhatsApp Updates
            </Text>
          </Pressable>
        </View>

        {/* Live Audience Info Card */}
        <View style={styles.audienceCard}>
          <View style={styles.audienceHeaderRow}>
            <View style={styles.audienceLeft}>
              <View style={styles.audienceIconCircle}>
                <Users size={18} color={COLORS.primary} strokeWidth={2.2} />
              </View>
              <View>
                {loadingAudience ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Text style={styles.audienceCountText}>
                    {audienceCount} Eligible Customer{audienceCount === 1 ? '' : 's'}
                  </Text>
                )}
                <Text style={styles.audienceSubText}>
                  Opted in to {channel === 'email' ? 'Email specials & receipts' : 'WhatsApp updates'}
                </Text>
              </View>
            </View>

            {audienceRecipients.length > 0 && (
              <Pressable
                style={styles.previewRecipientsBtn}
                onPress={() => setShowAudienceList((prev) => !prev)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.previewRecipientsBtnText}>
                  {showAudienceList ? 'Hide' : 'Preview'}
                </Text>
                {showAudienceList ? (
                  <ChevronUp size={14} color={COLORS.primary} />
                ) : (
                  <ChevronDown size={14} color={COLORS.primary} />
                )}
              </Pressable>
            )}
          </View>

          {/* Expandable Recipient Preview List */}
          {showAudienceList && (
            <View style={styles.audienceListContainer}>
              <View style={styles.audienceDivider} />
              <Text style={styles.audienceListHeader}>Consenting Recipients:</Text>
              {audienceRecipients.map((rec) => (
                <View key={rec.id} style={styles.audienceListItem}>
                  <Text style={styles.recipientName}>{rec.name}</Text>
                  <Text style={styles.recipientTarget}>{rec.target}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Message Composition Form */}
        <View style={styles.formCard}>
          {channel === 'email' && (
            <>
              <Text style={styles.fieldLabel}>SUBJECT LINE</Text>
              <TextInput
                style={styles.subjectInput}
                placeholder="e.g. Sunday Family Oil Painting & Fresh Brioche"
                placeholderTextColor={COLORS.textSecondary}
                value={subject}
                onChangeText={setSubject}
              />
            </>
          )}

          <View style={styles.messageLabelRow}>
            <Text style={styles.fieldLabel}>MESSAGE BODY</Text>
            <Text style={styles.charCount}>{message.length} chars</Text>
          </View>
          <TextInput
            style={styles.messageInput}
            placeholder={
              channel === 'email'
                ? 'Type your announcement here. Your Little Polo Cafe branding will be wrapped automatically...'
                : 'Type your WhatsApp update. Keep it friendly and concise...'
            }
            placeholderTextColor={COLORS.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
          />

          <Pressable
            style={[
              styles.sendButton,
              (isSending || audienceCount === 0 || !message.trim()) && styles.sendButtonDisabled,
            ]}
            onPress={handleConfirmSend}
            disabled={isSending || audienceCount === 0 || !message.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send Announcement"
          >
            {isSending ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <Send size={18} color={COLORS.white} strokeWidth={2.4} />
                <Text style={styles.sendButtonText}>
                  Send {channel === 'email' ? 'Email' : 'WhatsApp'} Announcement
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        visible={sendSuccessModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSendSuccessModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <CheckCircle2 size={36} color="#075B35" strokeWidth={2.4} />
            </View>
            <Text style={styles.successModalTitle}>Broadcast Dispatched</Text>
            <Text style={styles.successModalMessage}>
              Your announcement was successfully queued and delivered to{' '}
              <Text style={{ fontFamily: FONTS.bold }}>
                {lastSentLog?.totalSent || audienceCount} recipients
              </Text>.
            </Text>

            <Pressable
              style={styles.successDoneBtn}
              onPress={() => setSendSuccessModalVisible(false)}
            >
              <Text style={styles.successDoneBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Sent Notifications Audit Trail Modal */}
      <Modal
        visible={logsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLogsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.logsModalCard}>
            <View style={styles.logsModalHeader}>
              <View>
                <Text style={styles.logsModalTitle}>Sent Notifications</Text>
                <Text style={styles.logsModalSub}>Transparent dispatch history</Text>
              </View>
              <Pressable
                onPress={() => setLogsModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color={COLORS.heading} strokeWidth={2.4} />
              </Pressable>
            </View>

            {loadingLogs ? (
              <View style={styles.logsLoadingBox}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.logsLoadingText}>Loading delivery logs...</Text>
              </View>
            ) : logs.length === 0 ? (
              <View style={styles.logsEmptyBox}>
                <History size={36} color={COLORS.textSecondary} strokeWidth={1.5} />
                <Text style={styles.logsEmptyTitle}>No broadcast history yet</Text>
                <Text style={styles.logsEmptyDesc}>
                  Announcements sent from this hub will be logged here with timestamps and recipient details.
                </Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.logsList}
              >
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const isEmail = log.channel === 'email';
                  return (
                    <View key={log.id} style={styles.logCard}>
                      <View style={styles.logCardHeader}>
                        <View style={styles.logBadgeRow}>
                          <View
                            style={[
                              styles.logChannelPill,
                              isEmail
                                ? { backgroundColor: COLORS.serviceBlueTint }
                                : { backgroundColor: '#DCFCE7' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.logChannelPillText,
                                isEmail
                                  ? { color: COLORS.serviceBlueIcon }
                                  : { color: '#075B35' },
                              ]}
                            >
                              {log.channel.toUpperCase()}
                            </Text>
                          </View>

                          <View style={styles.logDateRow}>
                            <Clock size={12} color={COLORS.textSecondary} />
                            <Text style={styles.logDateText}>{formatLogDate(log.sentAt)}</Text>
                          </View>
                        </View>

                        <View style={styles.logRecipientsCountBadge}>
                          <Text style={styles.logRecipientsCountText}>
                            {log.totalSent} Sent
                          </Text>
                        </View>
                      </View>

                      {log.subject ? (
                        <Text style={styles.logSubjectText}>{log.subject}</Text>
                      ) : null}

                      <Text
                        style={styles.logMessageText}
                        numberOfLines={isExpanded ? undefined : 2}
                      >
                        {log.message}
                      </Text>

                      {/* Expand / Collapse Recipients */}
                      <Pressable
                        style={styles.logExpandBtn}
                        onPress={() =>
                          setExpandedLogId(isExpanded ? null : log.id)
                        }
                      >
                        <Text style={styles.logExpandBtnText}>
                          {isExpanded
                            ? 'Hide Recipients'
                            : `View Recipients (${log.recipients?.length || log.totalSent})`}
                        </Text>
                        {isExpanded ? (
                          <ChevronUp size={14} color={COLORS.primary} />
                        ) : (
                          <ChevronDown size={14} color={COLORS.primary} />
                        )}
                      </Pressable>

                      {isExpanded && log.recipients && (
                        <View style={styles.logRecipientsBox}>
                          <Text style={styles.logRecipientsTitle}>Delivered To:</Text>
                          {log.recipients.map((r, idx) => (
                            <View key={idx} style={styles.logRecipientRow}>
                              <Text style={styles.logRecipientName}>{r.name}</Text>
                              <Text style={styles.logRecipientTarget}>{r.target}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.heading,
  },
  headerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  introCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.serviceBlueTint,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  introIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTextGroup: {
    flex: 1,
  },
  introTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.serviceBlueIcon,
    marginBottom: 2,
  },
  introDesc: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.text,
    lineHeight: 16,
  },
  viewLogsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: SPACING.lg,
    ...SHADOW.soft,
  },
  viewLogsBtnText: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    color: COLORS.primary,
  },
  sectionLabel: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  channelTabs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.lg,
  },
  channelTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.soft,
  },
  channelTabActiveEmail: {
    backgroundColor: COLORS.serviceBlueTint,
    borderColor: '#BFDBFE',
  },
  channelTabActiveWhatsApp: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  channelTabText: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  channelTabTextActiveEmail: {
    color: COLORS.serviceBlueIcon,
  },
  channelTabTextActiveWhatsApp: {
    color: '#075B35',
  },
  audienceCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.lg,
    ...SHADOW.soft,
  },
  audienceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  audienceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  audienceIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audienceCountText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.heading,
  },
  audienceSubText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  previewRecipientsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  previewRecipientsBtnText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.primary,
  },
  audienceDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.sm,
  },
  audienceListContainer: {
    marginTop: SPACING.xs,
  },
  audienceListHeader: {
    fontFamily: FONTS.semibold,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  audienceListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  recipientName: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.heading,
  },
  recipientTarget: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOW.soft,
  },
  fieldLabel: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  messageLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: 6,
  },
  charCount: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  subjectInput: {
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.heading,
  },
  messageInput: {
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.heading,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: SPACING.lg,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.full,
    ...SHADOW.soft,
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  sendButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  successModalCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOW.soft,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  successModalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.heading,
    marginBottom: 6,
  },
  successModalMessage: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: SPACING.xl,
  },
  successDoneBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: SPACING.xxl,
    borderRadius: RADIUS.full,
  },
  successDoneBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },
  logsModalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    padding: SPACING.lg,
    ...SHADOW.soft,
  },
  logsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  logsModalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.heading,
  },
  logsModalSub: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  logsLoadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  logsLoadingText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  logsEmptyBox: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 8,
  },
  logsEmptyTitle: {
    fontFamily: FONTS.semibold,
    fontSize: 15,
    color: COLORS.heading,
    marginTop: 8,
  },
  logsEmptyDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
    lineHeight: 17,
  },
  logsList: {
    gap: 12,
    paddingBottom: SPACING.md,
  },
  logCard: {
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  logBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logChannelPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  logChannelPillText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  logDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logDateText: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  logRecipientsCountBadge: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  logRecipientsCountText: {
    fontFamily: FONTS.semibold,
    fontSize: 11,
    color: COLORS.heading,
  },
  logSubjectText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.heading,
    marginBottom: 4,
  },
  logMessageText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 17,
    marginBottom: 6,
  },
  logExpandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  logExpandBtnText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.primary,
  },
  logRecipientsBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: 6,
    gap: 4,
  },
  logRecipientsTitle: {
    fontFamily: FONTS.semibold,
    fontSize: 10,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  logRecipientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logRecipientName: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.heading,
  },
  logRecipientTarget: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
});
