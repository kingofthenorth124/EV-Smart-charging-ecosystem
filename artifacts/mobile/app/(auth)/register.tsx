import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@workspace/api-client-react";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const update = (key: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleRegister = async () => {
    const { firstName, lastName, email, phone, password } = form;
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !password
    ) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRegistered(true);
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError("An account with this email or phone already exists.");
        } else {
          setError(err.message ?? "Registration failed. Please try again.");
        }
      } else {
        setError("Could not connect to the server. Check your connection.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const styles = makeStyles(colors, insets);

  if (registered) {
    return (
      <View style={[styles.successContainer, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={["#0F4C35", "#1a6647"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.successContent}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Account created!</Text>
          <Text style={styles.successBody}>
            Your account is pending activation. An administrator will review and
            activate it shortly. You'll be able to sign in once activated.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.successButton,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={styles.successButtonText}>Back to sign in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={16}
        bounces={false}
      >
        {/* Brand header */}
        <LinearGradient colors={["#0F4C35", "#1a6647"]} style={styles.header}>
          <View style={[styles.headerContent, { paddingTop: insets.top + 32 }]}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={12}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </Pressable>
            <Text style={styles.brandName}>Create account</Text>
            <Text style={styles.tagline}>Join Camel Mobility</Text>
          </View>
        </LinearGradient>

        {/* Form card */}
        <View style={styles.formCard}>
          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                style={styles.input}
                value={form.firstName}
                onChangeText={update("firstName")}
                placeholder="Amara"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
                returnKeyType="next"
                testID="register-first-name"
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                style={styles.input}
                value={form.lastName}
                onChangeText={update("lastName")}
                placeholder="Okonkwo"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
                returnKeyType="next"
                testID="register-last-name"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={update("email")}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              testID="register-email"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone number</Text>
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={update("phone")}
              placeholder="+2348012345678"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              returnKeyType="next"
              testID="register-phone"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={form.password}
              onChangeText={update("password")}
              placeholder="8+ characters"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              testID="register-password"
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && { opacity: 0.8 },
              isLoading && { opacity: 0.6 },
            ]}
            onPress={handleRegister}
            disabled={isLoading}
            testID="register-submit"
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Create account</Text>
            )}
          </Pressable>

          <View style={{ height: insets.bottom + 32 }} />
        </View>
      </KeyboardAwareScrollViewCompat>
    </KeyboardAvoidingView>
  );
}

function makeStyles(
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>,
  insets: { top: number; bottom: number },
) {
  return StyleSheet.create({
    successContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    successContent: {
      alignItems: "center",
      paddingHorizontal: 40,
    },
    checkCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    checkIcon: {
      fontSize: 32,
      color: "#FFFFFF",
    },
    successTitle: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: "#FFFFFF",
      marginBottom: 16,
      textAlign: "center",
    },
    successBody: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: "rgba(255,255,255,0.8)",
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 32,
    },
    successButton: {
      paddingHorizontal: 32,
      paddingVertical: 14,
      backgroundColor: colors.amber,
      borderRadius: 10,
    },
    successButtonText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: "#1A1910",
    },
    header: {
      minHeight: 180,
    },
    headerContent: {
      paddingBottom: 32,
      paddingHorizontal: 24,
    },
    backButton: {
      marginBottom: 16,
    },
    backButtonText: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: "rgba(255,255,255,0.8)",
    },
    brandName: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: "#FFFFFF",
      letterSpacing: -0.5,
    },
    tagline: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: "rgba(255,255,255,0.7)",
      marginTop: 4,
    },
    formCard: {
      flex: 1,
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      marginTop: -24,
      paddingTop: 28,
      paddingHorizontal: 24,
    },
    row: {
      flexDirection: "row",
      gap: 12,
    },
    errorBanner: {
      backgroundColor: colors.destructive + "18",
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    errorText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.destructive,
    },
    fieldGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    input: {
      height: 52,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: 16,
      fontSize: 16,
      fontFamily: "Inter_400Regular",
      color: colors.foreground,
      backgroundColor: colors.card,
    },
    primaryButton: {
      height: 52,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    primaryButtonText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: "#FFFFFF",
    },
  });
}
