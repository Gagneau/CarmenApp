// app/(tabs)/admin-users.tsx
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { AdminUser, createUser, listUsers } from '../../src/api/adminUsers';
import { useAuth } from '../../src/state/auth';

export default function AdminUsersScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#111' }}>Admin: Users</Text>
          <View style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa', borderWidth: 1, padding: 12, borderRadius: 10, gap: 6 }}>
            <Text style={{ color: '#9a3412' }}>Admin only</Text>
            <Pressable onPress={() => router.replace('/(tabs)/totals')}><Text style={{ color: '#2d6cdf' }}>Go to Totals</Text></Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  // create modal state
  const [open, setOpen] = useState(false);
  const [alias, setAlias] = useState('');
  const [role, setRole] = useState<'admin'|'adult'|'child'>('adult');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const fetchUsers = useCallback(async (initial = false) => {
    try {
      if (initial) setLoading(true);
      setError(null);
      const data = await listUsers();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      const msg = e?.message || 'Failed to load users';
      if (msg === 'unauthorized') { await signOut(); router.replace('/'); return; }
      if (msg === 'forbidden') { setError('Forbidden (admin only)'); return; }
      setError(msg);
    } finally {
      if (initial) setLoading(false);
      setRefreshing(false);
    }
  }, [router, signOut]);

  useEffect(() => { fetchUsers(true); }, [fetchUsers]);
  useFocusEffect(useCallback(() => { fetchUsers(false); }, [fetchUsers]));

  async function onCreate() {
    if (!alias.trim() || !password.trim()) {
      setCreateErr('Alias and password are required');
      return;
    }
    try {
      setCreating(true);
      setCreateErr(null);
      await createUser({ display_name: alias.trim(), role, password });
      setOpen(false);
      setAlias(''); setPassword(''); setRole('adult');
      // refresh after create
      fetchUsers(false);
    } catch (e: any) {
      const msg = e?.message || '';
      // handle 409 from backend
      if (/409|duplicate/i.test(msg)) setCreateErr('Alias already exists');
      else setCreateErr('Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchUsers(false); }}
            tintColor="#2d6cdf"
          />
        }
      >
        <View style={{ gap: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#111' }}>Admin: Users</Text>
            {!loading && <Text style={{ color: '#666' }}>{rows.length} user{rows.length !== 1 ? 's' : ''}</Text>}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => setOpen(true)}
              style={{ backgroundColor: '#e8f7ee', borderColor: '#b9e4c6', borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}
            >
              <Text style={{ color: '#127c39', fontWeight: '600' }}>Create</Text>
            </Pressable>
            <Pressable
              onPress={() => fetchUsers(false)}
              style={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}
            >
              <Text style={{ color: '#4338ca', fontWeight: '600' }}>Refresh</Text>
            </Pressable>
          </View>
        </View>

        {loading && (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <ActivityIndicator /><Text style={{ marginTop: 8, color: '#666' }}>Loading users…</Text>
          </View>
        )}

        {!loading && error && (
          <View style={{ backgroundColor: '#fde7e9', borderColor: '#f2b2b8', borderWidth: 1, padding: 12, borderRadius: 10 }}>
            <Text style={{ color: '#b00020' }}>{error}</Text>
          </View>
        )}

        {!loading && !error && rows.length === 0 && (
          <View style={{ backgroundColor: '#fafafa', borderColor: '#eee', borderWidth: 1, padding: 16, borderRadius: 10 }}>
            <Text style={{ color: '#333', fontWeight: '600' }}>No users</Text>
            <Text style={{ color: '#666' }}>Use “Create” to add one.</Text>
          </View>
        )}

        {!loading && !error && rows.length > 0 && (
          <View style={{ gap: 10 }}>
            {rows.map((u) => (
              <View key={u.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, gap: 6 }}>
                <Text style={{ color: '#111', fontWeight: '700' }}>{u.display_name}</Text>
                <Text style={{ color: '#666' }}>Role: {u.role}</Text>
                <Text style={{ color: '#666' }}>Status: {u.status}</Text>

                {/* Step 3 actions will go here (edit role/status, reset PW) */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  <Pressable disabled style={{ opacity: 0.5, backgroundColor: '#f3f4f6', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 }}>
                    <Text style={{ color: '#9ca3af' }}>Edit (next)</Text>
                  </Pressable>
                  <Pressable disabled style={{ opacity: 0.5, backgroundColor: '#f3f4f6', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 }}>
                    <Text style={{ color: '#9ca3af' }}>Reset PW (next)</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create User modal */}
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.25)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111' }}>Create user</Text>

            <Text style={{ color: '#555' }}>Alias</Text>
            <TextInput
              value={alias}
              onChangeText={setAlias}
              autoCapitalize="none"
              placeholder="e.g. child.tom"
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10 }}
            />

            <Text style={{ color: '#555' }}>Role</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['adult','child','admin'] as const).map((r) => (
                <Pressable key={r} onPress={() => setRole(r)} style={{
                  paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8,
                  borderWidth: 1, borderColor: '#e5e7eb',
                  backgroundColor: role === r ? '#2d6cdf' : '#fff'
                }}>
                  <Text style={{ color: role === r ? '#fff' : '#111' }}>{r}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ color: '#555' }}>Temp password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="temporary password"
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10 }}
            />

            {!!createErr && (
              <View style={{ backgroundColor: '#fde7e9', borderColor: '#f2b2b8', borderWidth: 1, padding: 8, borderRadius: 8 }}>
                <Text style={{ color: '#b00020' }}>{createErr}</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
              <Pressable onPress={() => setOpen(false)} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
                <Text style={{ color: '#111' }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={onCreate} disabled={creating} style={{
                backgroundColor: '#2d6cdf', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8,
                opacity: creating ? 0.6 : 1
              }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {creating ? 'Creating…' : 'Create'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
