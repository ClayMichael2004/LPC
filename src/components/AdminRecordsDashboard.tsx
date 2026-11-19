import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Share,
  Linking,
  ActivityIndicator,
  Animated,
  RefreshControl,
} from 'react-native';
import RefreshSpinnerHeader from './RefreshSpinnerHeader';
import {
  Search,
  X,
  Filter,
  Share2,
  RefreshCw,
  Clock,
  Phone,
  MapPin,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Truck,
  ChefHat,
  AlertCircle,
  XCircle,
} from 'lucide-react-native';
import { COLORS, FONT_SIZE, FONTS, RADIUS, SHADOW, SPACING } from '../constants/theme';
import { adminApi } from '../services/api';
import { Order, OrderStatus } from '../types';

export default function AdminRecordsDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);
  const [stats, setStats] = useState<{
    totalOrders: number;
    totalRevenueKES: number;
    pendingOrders: number;
    preparingOrders: number;
    activeCouriers: number;
    completedOrders: number;
    cancelledOrders: number;
  }>({
    totalOrders: 0,
    totalRevenueKES: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    activeCouriers: 0,
    completedOrders: 0,
    cancelledOrders: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const resp = await adminApi.getOrders({
        page,
        limit: 15,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch || undefined,
      });

      if (resp) {
        setOrders(resp.orders || []);
        setTotal(resp.total || 0);
        setTotalPages(resp.totalPages || 1);
        if (resp.stats) {
          setStats(resp.stats);
        }
      }
    } catch {
      // Keep existing orders on error
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setPage(1);
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    setIsUpdatingStatus(true);
    try {
      await adminApi.updateOrderStatus(orderId, nextStatus);
      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: nextStatus });
      }
      fetchOrders();
    } catch {
      // Handled silently
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleExportShare = async () => {
    try {
      const dateStr = new Date().toLocaleDateString('en-KE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      let exportText = `========================================\nLITTLE POLO CAFE · ORDERS & RECORDS\nGenerated: ${dateStr}\n========================================\n\n`;
      exportText += `Summary:\n- Total Orders: ${stats.totalOrders}\n- Total Revenue: KES ${stats.totalRevenueKES.toLocaleString()}\n- Completed: ${stats.completedOrders}\n- Pending: ${stats.pendingOrders}\n\n`;
      exportText += `Recent Orders (Current View):\n----------------------------------------\n`;

      orders.forEach((o, idx) => {
        exportText += `${idx + 1}. #${o.id} · ${o.status}\n`;
        exportText += `   Address: ${o.deliveryInfo.addressName} (${o.deliveryInfo.phone})\n`;
        exportText += `   Total: KES ${o.total.toLocaleString()} (${o.paymentMethod.toUpperCase()})\n`;
        exportText += `   Items: ${o.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}\n\n`;
      });

      await Share.share({
        title: `LPC Orders Report - ${dateStr}`,
        message: exportText,
      });
    } catch {
      // Share cancelled
    }
  };

  const getStatusBadgeStyle = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return { bg: '#FEF3C7', text: '#92400E', label: 'Pending' };
      case 'PREPARING':
        return { bg: '#DBEAFE', text: '#07345F', label: 'Preparing' };
      case 'OUT_FOR_DELIVERY':
        return { bg: '#E5D9FF', text: '#4C1D95', label: 'Out for Delivery' };
      case 'DELIVERED':
        return { bg: '#DCFCE7', text: '#075B35', label: 'Delivered' };
      case 'CANCELLED':
        return { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled' };
      default:
        return { bg: '#F3F4F6', text: '#374151', label: status };
    }
  };

  return (
    <View style={styles.container}>
      {/* Symmetrical Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerSpacer} />
        <Text style={styles.topHeaderTitle}>Records & Orders</Text>
        <Pressable
          onPress={handleExportShare}
          style={styles.headerActionBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Export orders"
        >
          <Share2 size={20} color={COLORS.heading} strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchOrders(true)}
            tintColor="transparent"
            colors={['#E11D48']}
          />
        }
      >
        <RefreshSpinnerHeader refreshing={isRefreshing} label="Refreshing cafe orders..." />
        {/* Summary Stats Carousel / Grid */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
            <Text style={[styles.statNumber, { color: '#07345F' }]}>
              KES {stats.totalRevenueKES.toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: '#07345F' }]}>Total Revenue</Text>
          </View>

          <View style={styles.statRow}>
            <View style={[styles.smallStatCard, { backgroundColor: '#F3F4F6' }]}>
              <Text style={styles.smallStatNum}>{stats.totalOrders}</Text>
              <Text style={styles.smallStatLabel}>All Orders</Text>
            </View>
            <View style={[styles.smallStatCard, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.smallStatNum, { color: '#92400E' }]}>{stats.pendingOrders}</Text>
              <Text style={[styles.smallStatLabel, { color: '#92400E' }]}>Pending</Text>
            </View>
            <View style={[styles.smallStatCard, { backgroundColor: '#DCFCE7' }]}>
              <Text style={[styles.smallStatNum, { color: '#075B35' }]}>{stats.completedOrders}</Text>
              <Text style={[styles.smallStatLabel, { color: '#075B35' }]}>Delivered</Text>
            </View>
          </View>
        </View>

        {/* Dynamic Search Bar */}
        <View style={styles.searchBar}>
          <Search size={18} color="#9CA3AF" strokeWidth={2.2} style={styles.searchIcon} />
          <TextInput
            placeholder="Search by Order ID, customer, address..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearchChange}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => handleSearchChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color="#6B7280" />
            </Pressable>
          )}
        </View>

        {/* Status Filter Scrollable Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {['all', 'PENDING', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((st) => {
            const isSelected = statusFilter === st;
            let display = 'All';
            if (st === 'PENDING') display = 'Pending';
            else if (st === 'PREPARING') display = 'In Kitchen';
            else if (st === 'OUT_FOR_DELIVERY') display = 'Dispatched';
            else if (st === 'DELIVERED') display = 'Delivered';
            else if (st === 'CANCELLED') display = 'Cancelled';

            return (
              <Pressable
                key={st}
                onPress={() => handleStatusFilterChange(st)}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextSelected,
                  ]}
                >
                  {display}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Orders List */}
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading records...</Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FileText size={48} color="#D1D5DB" strokeWidth={1.8} />
            <Text style={styles.emptyTitle}>No matching orders</Text>
            <Text style={styles.emptySubtitle}>
              Orders placed by customers through the app will be cataloged and tracked here.
            </Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {orders.map((order, index) => {
              const badge = getStatusBadgeStyle(order.status);
              return (
                <Pressable
                  key={order.id}
                  style={({ pressed }) => [
                    styles.orderCard,
                    pressed && styles.orderCardPressed,
                  ]}
                  onPress={() => setSelectedOrder(order)}
                  accessibilityRole="button"
                  accessibilityLabel={`View order ${order.id}`}
                >
                  <View style={styles.orderCardHeader}>
                    <View style={styles.orderIdGroup}>
                      <Text style={styles.orderIdText}>#{order.id}</Text>
                      <Text style={styles.orderTimeText}>
                        {new Date(order.createdAt).toLocaleTimeString('en-KE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.orderCardBody}>
                    <View style={styles.infoRow}>
                      <MapPin size={14} color="#6B7280" />
                      <Text style={styles.infoText} numberOfLines={1}>
                        {order.deliveryInfo.addressName || 'Pickup at Cafe'}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Phone size={14} color="#6B7280" />
                      <Text style={styles.infoText}>{order.deliveryInfo.phone}</Text>
                    </View>
                  </View>

                  <View style={styles.orderCardFooter}>
                    <Text style={styles.itemSummaryText} numberOfLines={1}>
                      {order.items.length} {order.items.length === 1 ? 'item' : 'items'} ·{' '}
                      {order.items.map((i) => i.productName).join(', ')}
                    </Text>
                    <Text style={styles.orderTotalText}>
                      KES {order.total.toLocaleString()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <View style={styles.paginationRow}>
            <Pressable
              disabled={page <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
            >
              <ChevronLeft size={20} color={page <= 1 ? '#D1D5DB' : COLORS.heading} />
              <Text style={[styles.pageBtnText, page <= 1 && styles.pageBtnTextDisabled]}>
                Previous
              </Text>
            </Pressable>

            <Text style={styles.pageIndicator}>
              Page {page} of {totalPages}
            </Text>

            <Pressable
              disabled={page >= totalPages}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
            >
              <Text style={[styles.pageBtnText, page >= totalPages && styles.pageBtnTextDisabled]}>
                Next
              </Text>
              <ChevronRight size={20} color={page >= totalPages ? '#D1D5DB' : COLORS.heading} />
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Order Details Modal Inspector */}
      <Modal
        visible={!!selectedOrder}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Order #{selectedOrder?.id}</Text>
                <Text style={styles.modalSubtitle}>
                  Placed on {selectedOrder && new Date(selectedOrder.createdAt).toLocaleString()}
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedOrder(null)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={22} color={COLORS.heading} />
              </Pressable>
            </View>

            {selectedOrder && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalBody}
              >
                {/* Status Action Workflow Card */}
                <View style={styles.workflowCard}>
                  <Text style={styles.workflowSectionTitle}>Update Order Status</Text>
                  <View style={styles.workflowButtonsRow}>
                    <Pressable
                      disabled={isUpdatingStatus || selectedOrder.status === 'PREPARING'}
                      onPress={() => handleUpdateStatus(selectedOrder.id, 'PREPARING')}
                      style={[
                        styles.workflowBtn,
                        { backgroundColor: '#DBEAFE' },
                        selectedOrder.status === 'PREPARING' && styles.workflowBtnActive,
                      ]}
                    >
                      <ChefHat size={16} color="#07345F" />
                      <Text style={[styles.workflowBtnText, { color: '#07345F' }]}>Preparing</Text>
                    </Pressable>

                    <Pressable
                      disabled={isUpdatingStatus || selectedOrder.status === 'OUT_FOR_DELIVERY'}
                      onPress={() => handleUpdateStatus(selectedOrder.id, 'OUT_FOR_DELIVERY')}
                      style={[
                        styles.workflowBtn,
                        { backgroundColor: '#E5D9FF' },
                        selectedOrder.status === 'OUT_FOR_DELIVERY' && styles.workflowBtnActive,
                      ]}
                    >
                      <Truck size={16} color="#4C1D95" />
                      <Text style={[styles.workflowBtnText, { color: '#4C1D95' }]}>Dispatched</Text>
                    </Pressable>

                    <Pressable
                      disabled={isUpdatingStatus || selectedOrder.status === 'DELIVERED'}
                      onPress={() => handleUpdateStatus(selectedOrder.id, 'DELIVERED')}
                      style={[
                        styles.workflowBtn,
                        { backgroundColor: '#DCFCE7' },
                        selectedOrder.status === 'DELIVERED' && styles.workflowBtnActive,
                      ]}
                    >
                      <CheckCircle2 size={16} color="#075B35" />
                      <Text style={[styles.workflowBtnText, { color: '#075B35' }]}>Delivered</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Customer & Delivery Information */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionHeaderTitle}>Delivery Destination</Text>
                  <View style={styles.detailCard}>
                    <Text style={styles.detailCardPrimary}>
                      {selectedOrder.deliveryInfo.addressName || 'Pickup at Little Polo Cafe'}
                    </Text>
                    {selectedOrder.deliveryInfo.estateBuilding ? (
                      <Text style={styles.detailCardSecondary}>
                        {selectedOrder.deliveryInfo.estateBuilding}
                      </Text>
                    ) : null}
                    {selectedOrder.deliveryInfo.landmark ? (
                      <Text style={styles.detailCardSecondary}>
                        Landmark: {selectedOrder.deliveryInfo.landmark}
                      </Text>
                    ) : null}
                    {selectedOrder.deliveryInfo.deliveryInstructions ? (
                      <Text style={styles.detailCardNotes}>
                        Notes: "{selectedOrder.deliveryInfo.deliveryInstructions}"
                      </Text>
                    ) : null}

                    <View style={styles.phoneActionRow}>
                      <Text style={styles.phoneText}>Phone: {selectedOrder.deliveryInfo.phone}</Text>
                      <View style={styles.phoneBtns}>
                        <Pressable
                          style={styles.contactBtn}
                          onPress={() => Linking.openURL(`tel:${selectedOrder.deliveryInfo.phone}`)}
                        >
                          <Phone size={14} color="#07345F" />
                          <Text style={styles.contactBtnText}>Call</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.contactBtn, { backgroundColor: '#DCFCE7' }]}
                          onPress={() =>
                            Linking.openURL(
                              `https://wa.me/${selectedOrder.deliveryInfo.phone.replace(/[^0-9]/g, '')}`
                            )
                          }
                        >
                          <Text style={[styles.contactBtnText, { color: '#075B35' }]}>WhatsApp</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Ordered Items List */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionHeaderTitle}>Items Ordered</Text>
                  <View style={styles.itemsCard}>
                    {selectedOrder.items.map((item, idx) => (
                      <View key={idx} style={styles.itemRow}>
                        <View style={styles.itemQtyPill}>
                          <Text style={styles.itemQtyText}>{item.quantity}x</Text>
                        </View>
                        <View style={styles.itemInfoCol}>
                          <Text style={styles.itemName}>{item.productName}</Text>
                          {item.optionName ? (
                            <Text style={styles.itemOption}>{item.optionName}</Text>
                          ) : null}
                        </View>
                        <Text style={styles.itemPriceText}>
                          KES {item.totalPrice.toLocaleString()}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Financial Summary */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionHeaderTitle}>Payment Details</Text>
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Subtotal</Text>
                      <Text style={styles.summaryValue}>
                        KES {selectedOrder.subtotal.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Delivery Fee</Text>
                      <Text style={styles.summaryValue}>
                        KES {selectedOrder.deliveryFee.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>VAT (16%)</Text>
                      <Text style={styles.summaryValue}>
                        KES {selectedOrder.vat.toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                      <Text style={styles.summaryTotalLabel}>Total Paid</Text>
                      <Text style={styles.summaryTotalValue}>
                        KES {selectedOrder.total.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.paymentBadgeRow}>
                      <Text style={styles.paymentMethodText}>
                        Method: {selectedOrder.paymentMethod.toUpperCase()} · Status:{' '}
                        {selectedOrder.paymentStatus.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
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
  topHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: COLORS.white,
  },
  headerSpacer: {
    width: 22,
  },
  topHeaderTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.heading,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 140,
  },
  statsContainer: {
    marginBottom: SPACING.md,
  },
  statCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statNumber: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallStatCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  smallStatNum: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.heading,
  },
  smallStatLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.heading,
  },
  filterRow: {
    gap: 8,
    paddingVertical: 6,
    marginBottom: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  filterChipTextSelected: {
    color: COLORS.white,
    fontFamily: FONTS.semibold,
  },
  ordersList: {
    gap: 10,
    marginTop: 4,
  },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  orderCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderIdGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderIdText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.heading,
  },
  orderTimeText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusBadgeText: {
    fontFamily: FONTS.semibold,
    fontSize: 12,
  },
  orderCardBody: {
    gap: 4,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#4B5563',
    flex: 1,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  itemSummaryText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  orderTotalText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.primary,
  },
  loaderContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loaderText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 10,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.heading,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pageBtnDisabled: {
    opacity: 0.5,
  },
  pageBtnText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.heading,
  },
  pageBtnTextDisabled: {
    color: '#9CA3AF',
  },
  pageIndicator: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '88%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.heading,
  },
  modalSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalBody: {
    padding: SPACING.md,
  },
  workflowCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  workflowSectionTitle: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: COLORS.heading,
    marginBottom: 10,
  },
  workflowButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  workflowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  workflowBtnActive: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  workflowBtnText: {
    fontFamily: FONTS.semibold,
    fontSize: 12,
  },
  detailSection: {
    marginBottom: SPACING.md,
  },
  sectionHeaderTitle: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: COLORS.heading,
    marginBottom: 8,
  },
  detailCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  detailCardPrimary: {
    fontFamily: FONTS.semibold,
    fontSize: 15,
    color: COLORS.heading,
    marginBottom: 2,
  },
  detailCardSecondary: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
  },
  detailCardNotes: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 6,
    fontStyle: 'italic',
  },
  phoneActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  phoneText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.heading,
  },
  phoneBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: '#DBEAFE',
  },
  contactBtnText: {
    fontFamily: FONTS.semibold,
    fontSize: 12,
    color: '#07345F',
  },
  itemsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemQtyPill: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 10,
  },
  itemQtyText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.heading,
  },
  itemInfoCol: {
    flex: 1,
  },
  itemName: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.heading,
  },
  itemOption: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  itemPriceText: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: COLORS.heading,
  },
  summaryCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.heading,
  },
  summaryTotalRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  summaryTotalLabel: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.heading,
  },
  summaryTotalValue: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.primary,
  },
  paymentBadgeRow: {
    marginTop: 6,
    paddingTop: 6,
  },
  paymentMethodText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: '#6B7280',
  },
});
