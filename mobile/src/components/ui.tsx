import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, font, radius, spacing } from "../theme/tokens";

export function Screen({
  children,
  scroll = true,
  bottomSpace = 0,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  bottomSpace?: number;
}) {
  const padBottom = bottomSpace ? { paddingBottom: bottomSpace } : null;
  const body = scroll ? (
    <ScrollView
      style={s.flex}
      contentContainerStyle={[s.scrollContent, padBottom]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[s.flex, s.scrollContent, padBottom]}>{children}</View>
  );
  return (
    <SafeAreaView style={s.safeArea} edges={["top", "left", "right"]}>
      {body}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function TopBar({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={s.topBar}>
      {onBack ? (
        <Pressable onPress={onBack} style={s.backBtn} hitSlop={10}>
          <Text style={s.backText}>‹ Back</Text>
        </Pressable>
      ) : (
        <View style={s.backBtn} />
      )}
      <Text style={s.topTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={s.backBtn} />
    </View>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={s.eyebrow}>{children}</Text>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={s.title}>{children}</Text>;
}

export function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Subtle({ children }: { children: React.ReactNode }) {
  return <Text style={s.hint}>{children}</Text>;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={s.pageHeader}>
      <View style={s.eyebrowRow}>
        <View style={s.eyebrowTick} />
        <Text style={s.eyebrow}>{eyebrow}</Text>
      </View>
      <Text style={s.title}>{title}</Text>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export type MenuAction = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
};

/**
 * Shared top app bar used on every page: back button (left), centered page name,
 * 3-dots overflow menu (right) holding Settings / About / etc. Back is dimmed and
 * read-only on the root (Home) page where there is nowhere to go back to.
 */
export function TopHeader({
  title,
  canGoBack,
  onBack,
  menu,
}: {
  title: string;
  canGoBack?: boolean;
  onBack?: () => void;
  menu?: MenuAction[];
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <View style={s.topHeader}>
      <Pressable
        onPress={canGoBack ? onBack : undefined}
        disabled={!canGoBack}
        style={[s.headerBtn, !canGoBack && s.headerBtnDim]}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={22} color={canGoBack ? colors.textMuted : colors.textSubtle} />
      </Pressable>
      <View style={s.brand}>
        <Image source={require("../../assets/TJ-logo.png")} style={s.logo} resizeMode="contain" />
        <Text style={s.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <Pressable onPress={() => setOpen(true)} style={s.headerBtn} hitSlop={8}>
        <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.menuOverlay} onPress={() => setOpen(false)}>
          <View style={[s.menu, { marginTop: insets.top + 52 }]}>
            {menu?.map((item, i) => (
              <Pressable
                key={item.label}
                style={[s.menuItem, i > 0 && s.menuItemBorder]}
                onPress={() => {
                  setOpen(false);
                  item.onPress();
                }}
              >
                {item.icon ? (
                  <Ionicons name={item.icon} size={18} color={item.danger ? colors.danger : colors.textMuted} />
                ) : null}
                <Text style={[s.menuLabel, item.danger && { color: colors.danger }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function AppButton({ label, onPress, variant = "primary", loading, disabled, style }: ButtonProps) {
  const isDisabled = disabled || loading;
  const variantStyle =
    variant === "primary"
      ? s.btnPrimary
      : variant === "danger"
        ? s.btnDanger
        : variant === "ghost"
          ? s.btnGhost
          : s.btnSecondary;
  const textStyle =
    variant === "primary" ? s.btnPrimaryText : variant === "danger" ? s.btnDangerText : s.btnSecondaryText;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[s.btn, variantStyle, isDisabled ? s.btnDisabled : null, style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.onAccent : colors.text} />
      ) : (
        <Text style={textStyle}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Field({ label, ...props }: { label?: string } & TextInputProps) {
  return (
    <View style={s.fieldWrap}>
      {label ? <Text style={s.fieldLabel}>{label}</Text> : null}
      <TextInput style={s.input} placeholderTextColor={colors.textSubtle} {...props} />
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={s.segment}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[s.segmentBtn, active ? s.segmentBtnActive : null]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[s.segmentText, active ? s.segmentTextActive : null]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label }: { label: string }) {
  return (
    <View style={s.chip}>
      <Text style={s.chipText}>{label}</Text>
    </View>
  );
}

export function StatCard({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "positive" | "negative" }) {
  const valueColor =
    tone === "positive" ? colors.positive : tone === "negative" ? colors.danger : colors.text;
  const dotColor =
    tone === "positive" ? colors.positive : tone === "negative" ? colors.danger : colors.borderSoft;
  return (
    <View style={s.statCard}>
      <View style={s.statHead}>
        <View style={[s.statDot, { backgroundColor: dotColor }]} />
        <Text style={s.statLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[s.statValue, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={s.errorCard}>
      <Text style={s.errorTitle}>Something went wrong</Text>
      <Text style={s.errorText}>{message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { minWidth: 72 },
  backText: { color: colors.accent, fontSize: 16, fontWeight: "700" },
  topTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  eyebrow: { ...font.eyebrow, color: colors.textSubtle },
  title: { ...font.title, color: colors.text },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  logo: { width: 30, height: 30 },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  headerBtnDim: { opacity: 0.4 },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: "700", letterSpacing: 0.5 },
  menuOverlay: { flex: 1, alignItems: "flex-end", paddingHorizontal: spacing.xl },
  menu: {
    minWidth: 184,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  menuItemBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  menuLabel: { color: colors.text, fontSize: 15, fontWeight: "600" },
  pageHeader: { gap: spacing.sm, marginBottom: spacing.xs },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  eyebrowTick: { width: 16, height: 3, borderRadius: radius.pill, backgroundColor: colors.accent },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  sectionHeader: { gap: spacing.xs },
  sectionTitle: { ...font.section, color: colors.text },
  hint: { color: colors.textSubtle, fontSize: 13, lineHeight: 19 },
  btn: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  btnPrimary: { backgroundColor: colors.accent },
  btnPrimaryText: { color: colors.onAccent, fontWeight: "800", fontSize: 16 },
  btnSecondary: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderSoft },
  btnSecondaryText: { color: colors.text, fontWeight: "700" },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.borderSoft },
  btnDanger: { backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.dangerBorder },
  btnDangerText: { color: colors.danger, fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },
  fieldWrap: { gap: spacing.sm },
  fieldLabel: { ...font.label, color: colors.textSubtle },
  input: {
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontSize: 15,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segmentBtn: { flex: 1, borderRadius: radius.sm, paddingVertical: spacing.md, alignItems: "center" },
  segmentBtnActive: { backgroundColor: colors.accentSoft },
  segmentText: { color: colors.textSubtle, fontWeight: "700", letterSpacing: 0.4 },
  segmentTextActive: { color: colors.accent },
  chip: {
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  statCard: {
    flexGrow: 1,
    flexBasis: "47%",
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statDot: { width: 7, height: 7, borderRadius: radius.pill },
  statLabel: { ...font.label, color: colors.textSubtle, fontSize: 11, flexShrink: 1 },
  statValue: { fontSize: 25, fontWeight: "800", marginTop: spacing.xs },
  empty: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  emptyText: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  errorCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  errorTitle: { color: colors.danger, fontSize: 15, fontWeight: "700" },
  errorText: { color: colors.danger, fontSize: 13, lineHeight: 19 },
});
