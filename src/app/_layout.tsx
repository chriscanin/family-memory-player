import { useEffect } from 'react';
import { LogBox, View } from 'react-native';
import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  Newsreader_500Medium,
  Newsreader_500Medium_Italic,
} from '@expo-google-fonts/newsreader';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { configureReanimatedLogger } from 'react-native-reanimated';

import { navigationTheme, palette } from '@/theme';
import { IntroGate } from '@/components';

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

// Hold the native splash until the brand typefaces are ready, so text never
// flashes in a fallback face and then snaps to Newsreader/Hanken Grotesk.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  // The Family Memory Player type pairing: Newsreader (editorial serif) + Hanken Grotesk
  // (UI sans). The family names registered here are exactly the strings the
  // `fonts` tokens reference.
  const [fontsLoaded] = useFonts({
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Newsreader_500Medium,
    Newsreader_500Medium_Italic,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  // Keep the splash up (render nothing) until the fonts resolve.
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: palette.bg }} />;

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
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="memory/[id]" />
        </Stack>
        <IntroGate />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
