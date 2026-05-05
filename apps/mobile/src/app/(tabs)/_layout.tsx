import { StyleSheet, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslations } from '@/lib/i18n';
import { useColors } from '@/lib/colors';

function TabBarIcon({
  color,
  focused,
  activeName,
  inactiveName,
}: {
  color: string;
  focused: boolean;
  activeName: keyof typeof Ionicons.glyphMap;
  inactiveName: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View
      style={[
        styles.iconFrame,
        focused && styles.iconFrameActive,
        focused && { backgroundColor: 'rgba(154, 101, 0, 0.14)' },
      ]}
    >
      <Ionicons name={focused ? activeName : inactiveName} size={20} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const tNav = useTranslations('navigation');
  const tDashboard = useTranslations('dashboard');
  const tCredits = useTranslations('credits');
  const tHoroscope = useTranslations('horoscope');
  const colors = useColors();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 68,
          paddingTop: 10,
          paddingBottom: 10,
          paddingHorizontal: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.06,
          shadowRadius: 14,
          elevation: 18,
        },
        tabBarItemStyle: {
          marginHorizontal: 1,
          borderRadius: 16,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.placeholder,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: tDashboard('pageTitle'),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              color={color}
              focused={focused}
              activeName="home"
              inactiveName="home-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="charts"
        options={{
          title: tNav('charts'),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              color={color}
              focused={focused}
              activeName="planet"
              inactiveName="planet-outline"
            />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.replace('/(tabs)/charts');
          },
        }}
      />
      <Tabs.Screen
        name="horoscope"
        options={{
          title: tHoroscope('pageTitle'),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              color={color}
              focused={focused}
              activeName="moon"
              inactiveName="moon-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="compatibility"
        options={{
          title: tNav('compatibility'),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              color={color}
              focused={focused}
              activeName="heart"
              inactiveName="heart-outline"
            />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.replace('/(tabs)/compatibility');
          },
        }}
      />
      <Tabs.Screen
        name="readings"
        options={{
          title: tNav('readings'),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              color={color}
              focused={focused}
              activeName="book"
              inactiveName="book-outline"
            />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.replace('/(tabs)/readings');
          },
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: tCredits('storeTitle'),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              color={color}
              focused={focused}
              activeName="storefront"
              inactiveName="storefront-outline"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: tNav('settings'),
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              color={color}
              focused={focused}
              activeName="settings"
              inactiveName="settings-outline"
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconFrame: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFrameActive: {
    transform: [{ translateY: -1 }],
  },
});
