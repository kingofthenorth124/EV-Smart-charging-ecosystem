/**
 * Root route — shows a loading indicator while the auth guard in _layout.tsx
 * restores the session and redirects to the correct stack.
 */
import { ActivityIndicator, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export default function IndexRoute() {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
