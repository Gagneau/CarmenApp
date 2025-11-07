// app/(tabs)/_layout.tsx
import { Tabs, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useEffect } from 'react';
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
          <Text style={{ color: '#4338ca' }}>Child: {childName || '—'}</Text>
        </Pressable>
      )}
      <Pressable
        onPress={async () => {
          await signOut();
          router.replace('/');
        }}
        style={{ paddingRight: 4 }}
      >
        <Text style={{ color: '#2d6cdf' }}>Logout</Text>
      </Pressable>
    </View>
  );

  return (
    <Tabs screenOptions={{ headerRight }}>
      <Tabs.Screen name="form" options={{ title: 'Form' }} />
      <Tabs.Screen name="totals" options={{ title: 'Totals' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />

      {/* Admin-only tabs */}
      {isAdmin ? (
        <>
          <Tabs.Screen name="payout" options={{ title: 'Payout' }} />
          <Tabs.Screen name="admin-users" options={{ title: 'Admin: Users' }} />
          <Tabs.Screen name="admin-tasks" options={{ title: 'Admin: Tasks' }} />
        </>
      ) : (
        <>
          <Tabs.Screen name="payout" options={{ href: null }} />
          <Tabs.Screen name="admin-users" options={{ href: null }} />
          <Tabs.Screen name="admin-tasks" options={{ href: null }} />
        </>
      )}
    </Tabs>
  );
}
