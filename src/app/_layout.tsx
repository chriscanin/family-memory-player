import { LogBox } from 'react-native';
import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { configureReanimatedLogger } from 'react-native-reanimated';

import { navigationTheme, palette } from '@/design-system';

// React Compiler (enabled in this project) memoizes worklet bodies in a way
// Reanimated's strict logger flags as "reading `.value` during render" — a known
// false positive. Disable strict logging so the dev/TV build isn't buried under
// the warning (it otherwise renders a LogBox toast over the player UI).
configureReanimatedLogger({ strict: false });

// Two benign, expected dev warnings would otherwise render a LogBox toast over
// the 10-foot UI: the Reanimated strict false-positive (above) and AsyncStorage
// noting tvOS storage is ephemeral (recently-viewed is non-critical there).
// Silence just these two — everything else still surfaces.
LogBox.ignoreLogs(['[Reanimated] Reading from `value`', 'Persistent storage is not supported on tvOS']);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: palette.bg },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="memory/[id]" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
