import { Slot, Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { fonts, palette } from '@/theme';
import { TvNavShell, type NavTab } from '@/components';
import { IS_TV } from '@/core/tv';

const TABS: NavTab[] = [
  { name: 'index', href: '/', label: 'Home', icon: 'home' },
  { name: 'favorites', href: '/favorites', label: 'Favorites', icon: 'favorite' },
  { name: 'profile', href: '/profile', label: 'Profile', icon: 'person' },
];

/**
 * The app shell over Home / Favorites / Profile. Two presentations from one set
 * of routes: a **bottom tab bar** on handheld (expo-router `Tabs`) and a
 * **collapsible left rail** on TV (custom `NavRail` + `Slot`). The player
 * (`memory/[id]`) lives *outside* this group (root Stack), so it renders
 * full-screen with no nav chrome — preserving its focus model.
 */
export default function TabsLayout() {
  if (IS_TV) {
    return (
      <TvNavShell tabs={TABS}>
        <Slot />
      </TvNavShell>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: { backgroundColor: palette.scrim, borderTopColor: palette.line },
        tabBarLabelStyle: { fontFamily: fonts.sansSemiBold },
        sceneStyle: { backgroundColor: palette.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="favorites"
        options={{ title: 'Favorites', tabBarIcon: ({ color, size }) => <MaterialIcons name="favorite" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
