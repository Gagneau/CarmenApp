// app/(tabs)/_layout.tsx
import { Tabs, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useEffect } from 'react';
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '../../src/state/auth';
import { useSelectedChild } from '../../src/state/child';

export default function TabsLayout() {
  const { user, ready, signOut } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';
  const isAdult = user?.role === 'adult';

  const { childId, childName, children, setChildId } = useSelectedChild();
  const hasMultiple = children.length > 1;
  const canPick = hasMultiple && (isAdult || isAdmin);

  useEffect(() => {
    if (ready && !user) router.replace('/');
  }, [ready, user]);

  const cycleChild = () => {
    if (!canPick) return;
    const idx = children.findIndex((c) => c.id === childId);
    const next = children[(idx + 1) % children.length];
    setChildId(next.id);
  };

  const headerRight = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {canPick && (
        <Pressable
          onPress={cycleChild}
          style={{
            marginRight: 12,
            backgroundColor: '#eef2ff',
            borderColor: '#c7d2fe',
            borderWidth: 1,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#4338ca' }}>Enfant : {childName || '—'}</Text>
        </Pressable>
      )}
      <Pressable
        onPress={async () => {
          await signOut();
          router.replace('/');
        }}
        style={{ paddingRight: 4 }}
      >
        <Text style={{ color: '#2d6cdf' }}>Déconnexion</Text>
      </Pressable>
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        headerRight,
        tabBarActiveTintColor: '#2d6cdf',   // active blue
        tabBarInactiveTintColor: '#9ca3af', // inactive grey
      }}
    >
      <Tabs.Screen
        name="form"
        options={{
          title: 'Remplir',
          tabBarLabel: 'Remplir',
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="form" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="totals"
        options={{
          title: 'Totaux',
          tabBarLabel: 'Totaux',
          tabBarIcon: ({ color, size }) => (
            <Feather name="pie-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historique',
          tabBarLabel: 'Historique',
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="history" size={size} color={color} />
          ),
        }}
      />

      {/* Admin tabs defined once; control visibility via href */}
      <Tabs.Screen
        name="payout"
        options={{
          title: 'Retrait',
          tabBarLabel: 'Retrait',
          href: isAdmin ? '/(tabs)/payout' : null,
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="shopping-cart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin-tasks"
        options={{
          title: 'Tâches',
          tabBarLabel: 'Tâches',
          href: isAdmin ? '/(tabs)/admin-tasks' : null,
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="ordered-list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin-users"
        options={{
          title: 'Accès',
          tabBarLabel: 'Accès',
          href: isAdmin ? '/(tabs)/admin-users' : null,
          tabBarIcon: ({ color, size }) => (
            <Feather name="users" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
