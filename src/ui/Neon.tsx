import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { playSound } from '../audio/sound';
import { FONT, UI, glow } from './theme';

export function NeonText({
  children,
  color = UI.text,
  size = 16,
  weight = 'bold',
  glowColor,
  style,
}: {
  children: ReactNode;
  color?: string;
  size?: number;
  weight?: keyof typeof FONT;
  glowColor?: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text style={[{ color, fontSize: size, fontFamily: FONT[weight] }, glowColor ? glow(glowColor) : null, style]}>
      {children}
    </Text>
  );
}

export function NeonButton({
  label,
  onPress,
  color = UI.cyan,
  filled = false,
  disabled = false,
  small = false,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  color?: string;
  filled?: boolean;
  disabled?: boolean;
  small?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        playSound('click');
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        {
          borderColor: color,
          backgroundColor: filled ? color : 'rgba(10, 6, 34, 0.7)',
          shadowColor: color,
          opacity: disabled ? 0.4 : 1,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
        style,
      ]}
    >
      {icon}
      <NeonText size={small ? 12 : 16} color={filled ? '#0a0420' : color} glowColor={filled ? undefined : color}>
        {label}
      </NeonText>
    </Pressable>
  );
}

export function Panel({ children, color = UI.pink, style }: { children: ReactNode; color?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, { borderColor: color, shadowColor: color }, style]}>{children}</View>;
}

export function Scrim({ children }: { children: ReactNode }) {
  return <View style={styles.scrim}>{children}</View>;
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 11,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  buttonSmall: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  panel: {
    backgroundColor: UI.panel,
    borderWidth: 2,
    borderRadius: 20,
    padding: 18,
    shadowOpacity: 0.8,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: UI.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
