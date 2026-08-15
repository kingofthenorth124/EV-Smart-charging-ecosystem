/**
 * Account tab — user profile, settings, and sign-out.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function StatusBadge({ status, colors }: {
  status: string;
  colors: ReturnType<typeof import('@/hooks/useColors').useColors>;
}) {
  const cfg = status === 'ACTIVE'
    ? { bg: '#22C55E18', text: '#16A34A', label: 'Active' }
    : status === 'PENDING'
    ? { bg: colors.amber + '22', text: colors.amber, label: 'Pending activation' }
    : { bg: colors.destructive + '18', text: colors.destructive, label: status };

  return (
    <View style={[badgeStyles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[badgeStyles.text, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  text: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
});

function InfoRow({ icon, label, value, colors }: {
  icon: string;
  label: string;
  value: string;
  colors: ReturnType<typeof import('@/hooks/useColors').useColors>;
}) {
  return (
    <View style={[infoStyles.row, { borderBottomColor: colors.border }]}>
      <View style={[infoStyles.iconWrap, { backgroundColor: colors.secondary }]}>
        <Feather name={icon as any} size={16} color={colors.mutedForeground} />
      </View>
      <View style={infoStyles.content}>
        <Text style={[infoStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[infoStyles.value, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
});

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const isWebTop = Platform.OS === 'web' ? 67 : 0;

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      // Web: skip Alert (Alert is polyfilled but confirm feels more native)
      void doLogout();
      return;
    }
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => void doLogout(),
        },
      ],
    );
  };

  const doLogout = async () => {
    setLoggingOut(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await logout();
      // AuthContext sets user → null; app/index.tsx redirects to /(auth)/login
    } finally {
      setLoggingOut(false);
    }
  };

  const styles = makeStyles(colors, insets, isWebTop);

  if (!user) return null;

  const initials = getInitials(user.firstName, user.lastName);
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <StatusBadge status={user.status} colors={colors} />
      </View>

      {/* Info section */}
      <View style={[styles.card, { marginTop: 24 }]}>
        <Text style={styles.sectionLabel}>Account details</Text>
        <InfoRow icon="mail" label="Email" value={user.email} colors={colors} />
        <InfoRow icon="phone" label="Phone" value={user.phone} colors={colors} />
        <InfoRow icon="user" label="Role" value={user.role.replace('_', ' ')} colors={colors} />
      </View>

      {/* Sign out */}
      <View style={[styles.card, { marginTop: 16 }]}>
        <Pressable
          style={({ pressed }) => [styles.signOutRow, pressed && { opacity: 0.7 }, { borderBottomColor: colors.border }]}
          onPress={handleLogout}
          disabled={loggingOut}
          testID="sign-out-button"
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.destructive + '15' }]}>
            {loggingOut ? (
              <ActivityIndicator size="small" color={colors.destructive} />
            ) : (
              <Feather name="log-out" size={16} color={colors.destructive} />
            )}
          </View>
          <Text style={[styles.signOutText, { color: colors.destructive }]}>
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.version}>Camel Mobility v1.0</Text>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof import('@/hooks/useColors').useColors>, insets: { top: number; bottom: number }, isWebTop: number) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingTop: insets.top + isWebTop + 20,
      paddingBottom: insets.bottom + (Platform.OS === 'web' ? 84 : 20),
    },
    profileHeader: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingBottom: 8,
    },
    avatarCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    avatarText: {
      fontSize: 28,
      fontFamily: 'Inter_700Bold',
      color: '#FFFFFF',
    },
    name: {
      fontSize: 22,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      marginBottom: 4,
    },
    email: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      marginBottom: 10,
    },
    sectionLabel: {
      fontSize: 12,
      fontFamily: 'Inter_600SemiBold',
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 4,
    },
    card: {
      marginHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    signOutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 20,
      gap: 14,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    signOutText: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
    },
    version: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: 24,
    },
  });
}
