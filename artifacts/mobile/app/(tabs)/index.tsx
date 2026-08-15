/**
 * Wallet tab — balance display, top-up flow, and transaction history.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useGetWallet, useListTransactions, useTopUpWallet } from '@workspace/api-client-react';
import type { TopUpMethod, WalletTransaction } from '@workspace/api-client-react';
import { ApiError } from '@workspace/api-client-react';

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatNaira(kobo: number): string {
  const naira = Math.abs(kobo) / 100;
  return `₦${naira.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TOP_UP_PRESETS = [
  { label: '₦1,000', kobo: 100_000 },
  { label: '₦5,000', kobo: 500_000 },
  { label: '₦10,000', kobo: 1_000_000 },
  { label: '₦50,000', kobo: 5_000_000 },
];

const PAYMENT_METHODS: { id: TopUpMethod; label: string; icon: string }[] = [
  { id: 'CARD', label: 'Debit/Credit Card', icon: 'credit-card' },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: 'arrow-right-circle' },
  { id: 'USSD', label: 'USSD', icon: 'smartphone' },
];

// ── Transaction row ──────────────────────────────────────────────────────────

function TransactionRow({ item, colors }: { item: WalletTransaction; colors: ReturnType<typeof import('@/hooks/useColors').useColors> }) {
  const isCredit = item.amountKobo > 0;
  const isPending = item.status === 'PENDING';

  const iconName = item.type === 'TOPUP' ? 'arrow-down-circle'
    : item.type === 'CHARGE' ? 'zap'
    : item.type === 'REFUND' ? 'rotate-ccw'
    : 'sliders';

  const iconColor = item.type === 'TOPUP' ? '#22C55E'
    : item.type === 'CHARGE' ? colors.amber
    : item.type === 'REFUND' ? '#3B82F6'
    : colors.mutedForeground;

  return (
    <View style={[txStyles.row, { borderBottomColor: colors.border }]}>
      <View style={[txStyles.iconWrap, { backgroundColor: iconColor + '18' }]}>
        <Feather name={iconName as any} size={18} color={iconColor} />
      </View>
      <View style={txStyles.info}>
        <Text style={[txStyles.description, { color: colors.foreground }]} numberOfLines={1}>
          {item.description}
        </Text>
        <Text style={[txStyles.meta, { color: colors.mutedForeground }]}>
          {formatDate(item.createdAt)}{isPending ? ' · Pending' : ''}
        </Text>
      </View>
      <Text style={[txStyles.amount, { color: isCredit ? '#22C55E' : colors.foreground }]}>
        {isCredit ? '+' : '-'}{formatNaira(item.amountKobo)}
      </Text>
    </View>
  );
}

const txStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  meta: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  amount: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 8,
  },
});

// ── Main screen ──────────────────────────────────────────────────────────────

export default function WalletScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [topUpVisible, setTopUpVisible] = useState(false);
  const [selectedKobo, setSelectedKobo] = useState(0);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<TopUpMethod>('CARD');
  const [topUpError, setTopUpError] = useState<string | null>(null);

  const {
    data: wallet,
    isLoading: walletLoading,
    error: walletError,
    refetch: refetchWallet,
  } = useGetWallet();

  const {
    data: txData,
    isLoading: txLoading,
    refetch: refetchTx,
  } = useListTransactions({ page: 1, limit: 20 });

  const { mutate: topUp, isPending: toppingUp } = useTopUpWallet({
    mutation: {
      onSuccess: async () => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTopUpVisible(false);
        setSelectedKobo(0);
        setCustomAmount('');
        setTopUpError(null);
        refetchWallet();
        refetchTx();
      },
      onError: (err) => {
        const msg = err instanceof ApiError ? err.message : 'Top-up failed. Please try again.';
        setTopUpError(msg ?? 'Top-up failed.');
      },
    },
  });

  const handleTopUp = async () => {
    const custom = parseInt(customAmount.replace(/[^0-9]/g, ''), 10) * 100;
    const kobo = selectedKobo > 0 ? selectedKobo : (isNaN(custom) ? 0 : custom);
    if (kobo < 10_000) {
      setTopUpError('Minimum top-up is ₦100.');
      return;
    }
    setTopUpError(null);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    topUp({ data: { amountKobo: kobo, method: selectedMethod } });
  };

  const isRefreshing = walletLoading || txLoading;
  const isWebTop = Platform.OS === 'web' ? 67 : 0;

  const styles = makeStyles(colors, insets, isWebTop);

  const transactions = txData?.data ?? [];

  // ── Header ─────────────────────────────────────────────────────────────────

  const ListHeader = (
    <View>
      {/* Balance card */}
      <LinearGradient
        colors={['#0F4C35', '#1a6647', '#0d3d2b']}
        style={[styles.balanceGradient, { paddingTop: insets.top + isWebTop + 20 }]}
      >
        {walletLoading ? (
          <View style={styles.balanceSkeleton}>
            <ActivityIndicator color="rgba(255,255,255,0.6)" />
          </View>
        ) : walletError ? (
          <View style={styles.balanceSkeleton}>
            <Text style={styles.balanceErrorText}>Balance unavailable</Text>
            <Pressable onPress={() => refetchWallet()} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.balanceLabel}>Available balance</Text>
            <Text style={styles.balanceAmount}>{formatNaira(wallet?.balanceKobo ?? 0)}</Text>
            {wallet && wallet.minBalanceKobo > 0 && (
              <View style={styles.minBalanceBadge}>
                <Feather name="info" size={12} color="rgba(255,255,255,0.6)" />
                <Text style={styles.minBalanceText}>
                  Min. {formatNaira(wallet.minBalanceKobo)} to charge
                </Text>
              </View>
            )}
          </>
        )}

        {/* Add Funds button */}
        <Pressable
          style={({ pressed }) => [styles.addFundsButton, pressed && { opacity: 0.85 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setTopUpVisible(true);
          }}
          testID="add-funds-button"
        >
          <Feather name="plus" size={18} color="#1A1910" />
          <Text style={styles.addFundsText}>Add Funds</Text>
        </Pressable>
      </LinearGradient>

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Transactions</Text>
      </View>

      {transactions.length === 0 && !txLoading && (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={40} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={styles.emptyBody}>Your wallet activity will appear here once you top up or charge your vehicle.</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionRow item={item} colors={colors} />}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { refetchWallet(); refetchTx(); }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'web' ? 84 : 0) }}
        style={styles.list}
      />

      {/* Top-Up Modal */}
      <Modal
        visible={topUpVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTopUpVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setTopUpVisible(false)} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add Funds</Text>

          {topUpError ? (
            <View style={styles.topUpError}>
              <Text style={styles.topUpErrorText}>{topUpError}</Text>
            </View>
          ) : null}

          {/* Preset amounts */}
          <Text style={styles.subLabel}>Quick amounts</Text>
          <View style={styles.presetGrid}>
            {TOP_UP_PRESETS.map((p) => (
              <Pressable
                key={p.kobo}
                style={({ pressed }) => [
                  styles.presetChip,
                  selectedKobo === p.kobo && styles.presetChipActive,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => {
                  setSelectedKobo(p.kobo);
                  setCustomAmount('');
                  Haptics.selectionAsync();
                }}
              >
                <Text style={[styles.presetChipText, selectedKobo === p.kobo && styles.presetChipTextActive]}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Custom amount */}
          <Text style={styles.subLabel}>Or enter amount (₦)</Text>
          <TextInput
            style={styles.amountInput}
            value={customAmount}
            onChangeText={(v) => {
              setCustomAmount(v.replace(/[^0-9]/g, ''));
              setSelectedKobo(0);
            }}
            placeholder="e.g. 20000"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
          />

          {/* Payment method */}
          <Text style={styles.subLabel}>Payment method</Text>
          {PAYMENT_METHODS.map((m) => (
            <Pressable
              key={m.id}
              style={({ pressed }) => [
                styles.methodRow,
                selectedMethod === m.id && styles.methodRowActive,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => {
                setSelectedMethod(m.id);
                Haptics.selectionAsync();
              }}
            >
              <Feather name={m.icon as any} size={18} color={selectedMethod === m.id ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.methodLabel, selectedMethod === m.id && { color: colors.primary }]}>
                {m.label}
              </Text>
              {selectedMethod === m.id && (
                <Feather name="check-circle" size={18} color={colors.primary} style={{ marginLeft: 'auto' }} />
              )}
            </Pressable>
          ))}

          <Pressable
            style={({ pressed }) => [
              styles.topUpButton,
              pressed && { opacity: 0.85 },
              toppingUp && { opacity: 0.6 },
            ]}
            onPress={handleTopUp}
            disabled={toppingUp}
            testID="confirm-topup"
          >
            {toppingUp ? (
              <ActivityIndicator color="#1A1910" />
            ) : (
              <Text style={styles.topUpButtonText}>Top Up Wallet</Text>
            )}
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof import('@/hooks/useColors').useColors>, insets: { top: number; bottom: number }, isWebTop: number) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    list: {
      flex: 1,
    },
    balanceGradient: {
      paddingHorizontal: 24,
      paddingBottom: 32,
      alignItems: 'flex-start',
    },
    balanceSkeleton: {
      height: 80,
      justifyContent: 'center',
      alignItems: 'flex-start',
      gap: 8,
    },
    balanceErrorText: {
      fontSize: 16,
      fontFamily: 'Inter_400Regular',
      color: 'rgba(255,255,255,0.7)',
    },
    retryBtn: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
    retryText: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      color: '#FFFFFF',
    },
    balanceLabel: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: 'rgba(255,255,255,0.65)',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    balanceAmount: {
      fontSize: 44,
      fontFamily: 'Inter_700Bold',
      color: '#FFFFFF',
      letterSpacing: -1.5,
      marginBottom: 8,
    },
    minBalanceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 20,
    },
    minBalanceText: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: 'rgba(255,255,255,0.6)',
    },
    addFundsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#F0A500',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 10,
      marginTop: 4,
    },
    addFundsText: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      color: '#1A1910',
    },
    sectionHeader: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
    },
    emptyState: {
      alignItems: 'center',
      paddingHorizontal: 40,
      paddingTop: 40,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
      marginTop: 8,
    },
    emptyBody: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 20,
    },
    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
    },
    modalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      marginBottom: 16,
    },
    topUpError: {
      backgroundColor: colors.destructive + '18',
      borderRadius: 8,
      padding: 10,
      marginBottom: 12,
    },
    topUpErrorText: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: colors.destructive,
    },
    subLabel: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 16,
    },
    presetGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    presetChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    presetChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '12',
    },
    presetChipText: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      color: colors.foreground,
    },
    presetChipTextActive: {
      color: colors.primary,
    },
    amountInput: {
      height: 48,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: 16,
      fontSize: 16,
      fontFamily: 'Inter_400Regular',
      color: colors.foreground,
      backgroundColor: colors.background,
    },
    methodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      marginBottom: 8,
    },
    methodRowActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '08',
    },
    methodLabel: {
      fontSize: 15,
      fontFamily: 'Inter_500Medium',
      color: colors.foreground,
    },
    topUpButton: {
      height: 52,
      borderRadius: 10,
      backgroundColor: colors.amber,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
    },
    topUpButtonText: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      color: '#1A1910',
    },
  });
}
