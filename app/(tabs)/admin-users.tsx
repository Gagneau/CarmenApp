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
import { getLinks, listChildren, setLinks } from '../../src/api/adminLinks';
import { AdminUser, createUser, listUsers, updateUser, deleteUser } from '../../src/api/adminUsers';
import { useAuth } from '../../src/state/auth';

// Types from adminLinks
type ChildRow = { id: string; display_name: string; status: string };

// 2) NEW: tiny helper to wait a single animation frame before reading state
const nextFrame = () => new Promise(requestAnimationFrame);

// 4) Optional UX helper: Checkbox row
function CheckboxRow({
  id, label, checked, onToggle,
}: { id: string; label: string; checked: boolean; onToggle: (id: string) => void; }) {
  return (
    <Pressable
      onPress={() => onToggle(id)}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
    >
      <View
        style={{
          width: 20, height: 20, borderRadius: 4,
          borderWidth: 1, borderColor: '#9ca3af',
          backgroundColor: checked ? '#2d6cdf' : '#fff',
          alignItems: 'center', justifyContent: 'center', marginRight: 8,
        }}
      >
        {checked ? <Text style={{ color: '#fff', fontWeight: '700' }}>✓</Text> : null}
      </View>
      <Text style={{ color: '#111' }}>{label}</Text>
    </Pressable>
  );
}

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
            <Pressable onPress={() => router.replace('/(tabs)/totals')}>
              <Text style={{ color: '#2d6cdf' }}>Go to Totals</Text>
            </Pressable>
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
  // ⚠️ ensure correct role state line
  const [roleNew, setRoleNew] = useState<'admin'|'adult'|'child'>('adult');
  const [alias, setAlias] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  // reset password modal (per-user)
  const [resetFor, setResetFor] = useState<AdminUser | null>(null);
  const [resetPw, setResetPw] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  // manage-children modal (per adult)
  const [manageFor, setManageFor] = useState<AdminUser | null>(null);
  const [mcLoading, setMcLoading] = useState(false);
  const [mcSaving, setMcSaving] = useState(false);
  const [mcErr, setMcErr] = useState<string | null>(null);
  const [mcChildren, setMcChildren] = useState<ChildRow[]>([]);
  // 1) NEW: Set-based selection state
  const [mcSelected, setMcSelected] = useState<Set<string>>(new Set());

  // 1) NEW (delete modal) — state near other modals
  const [delFor, setDelFor] = useState<AdminUser | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);

  // page banner
  const [banner, setBanner] = useState<{ kind:'ok'|'err', msg:string }|null>(null);
  const showBanner = (kind:'ok'|'err', msg:string) => {
    setBanner({ kind, msg });
    setTimeout(() => setBanner(null), 3000);
  };

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
      const created = await createUser({ display_name: alias.trim(), role: roleNew, password });
      setRows((prev) => [created, ...prev]); // optimistic insert
      setOpen(false);
      setAlias(''); setPassword(''); setRoleNew('adult');
      showBanner('ok', 'User created');
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('duplicate')) setCreateErr('Alias already exists');
      else setCreateErr('Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  const patchRow = (id: string, partial: Partial<AdminUser>) =>
    setRows((prev) => prev.map((u) => (u.id === id ? { ...u, ...partial } : u)));

  const onChangeRole = async (u: AdminUser, newRole: AdminUser['role']) => {
    if (u.role === newRole) return;
    const prev = u.role;
    patchRow(u.id, { role: newRole });
    try {
      const updated = await updateUser({ user_id: u.id, role: newRole });
      patchRow(u.id, updated);
      showBanner('ok', 'Role updated');
    } catch {
      patchRow(u.id, { role: prev }); // rollback
      showBanner('err', 'Failed to update role');
    }
  };

  const onToggleStatus = async (u: AdminUser) => {
    const nextStatus = u.status === 'disabled' ? 'active' : 'disabled';
    const prev = u.status;
    patchRow(u.id, { status: nextStatus });
    try {
      const updated = await updateUser({ user_id: u.id, status: nextStatus as 'active'|'disabled' });
      patchRow(u.id, updated);
      showBanner('ok', 'Status updated');
    } catch {
      patchRow(u.id, { status: prev }); // rollback
      showBanner('err', 'Failed to update status');
    }
  };

  const onResetPassword = async () => {
    if (!resetFor) return;
    if (!resetPw.trim()) { showBanner('err', 'Enter a new password'); return; }
    try {
      setResetBusy(true);
      await updateUser({ user_id: resetFor.id, password: resetPw.trim() });
      setResetFor(null); setResetPw('');
      showBanner('ok', 'Password reset');
    } catch {
      showBanner('err', 'Failed to reset password');
    } finally {
      setResetBusy(false);
    }
  };

  // ---- Manage Children ----
  async function openManage(u: AdminUser) {
    if (u.role !== 'adult') return; // links apply to adults only
    setManageFor(u);
    setMcLoading(true);
    setMcSaving(false);
    setMcErr(null);
    setMcChildren([]);
    // (1) Don’t reset selection on open — removed the wipe
    try {
      const [children, links] = await Promise.all([listChildren(), getLinks(u.id)]);
      setMcChildren(Array.isArray(children) ? children : []);
      // initialize Set from server links
      setMcSelected(new Set(links?.child_ids || []));
    } catch (e: any) {
      setMcErr(e?.message || 'Failed to load links');
    } finally {
      setMcLoading(false);
    }
  }

  // Wait one animation frame before reading selection + log payload
  async function onSaveManage() {
    if (!manageFor) return;
    try {
      setMcSaving(true);
      setMcErr(null);

      // (3) ensure last toggle is committed
      await nextFrame();

      const selectedIds = Array.from(mcSelected);

      // log right before we save
      console.log('setLinks payload →', manageFor.display_name, selectedIds);

      await setLinks(manageFor.id, selectedIds);
      setManageFor(null); // close modal
      showBanner('ok', 'Links saved');
    } catch (e: any) {
      setMcErr(e?.message || 'Failed to save links');
    } finally {
      setMcSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* page-level banner */}
      {banner && (
        <View style={{
          margin: 12, padding: 10, borderRadius: 8,
          backgroundColor: banner.kind === 'ok' ? '#e8f7ee' : '#fde7e9',
          borderWidth: 1, borderColor: banner.kind === 'ok' ? '#b9e4c6' : '#f2b2b8'
        }}>
          <Text style={{ color: banner.kind === 'ok' ? '#127c39' : '#b00020' }}>{banner.msg}</Text>
        </View>
      )}

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
              <View key={u.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, gap: 10 }}>
                <Text style={{ color: '#111', fontWeight: '700' }}>{u.display_name}</Text>

                {/* Role pills */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['child','adult','admin'] as const).map((r) => {
                    const selected = u.role === r;
                    return (
                      <Pressable
                        key={r}
                        onPress={() => onChangeRole(u, r)}
                        style={{
                          paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8,
                          borderWidth: 1, borderColor: '#e5e7eb',
                          backgroundColor: selected ? '#2d6cdf' : '#fff',
                          opacity: selected ? 1 : 0.95
                        }}
                      >
                        <Text style={{ color: selected ? '#fff' : '#111' }}>{r}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Status + Reset PW + Manage Children + Delete */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={{ color: '#666' }}>Status:</Text>
                  <Pressable
                    onPress={() => onToggleStatus(u)}
                    style={{
                      paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8,
                      borderWidth: 1, borderColor: '#e5e7eb',
                      backgroundColor: u.status === 'disabled' ? '#fee2e2' : '#e8f7ee'
                    }}
                  >
                    <Text style={{ color: u.status === 'disabled' ? '#991b1b' : '#127c39' }}>
                      {u.status === 'disabled' ? 'Disabled' : 'Active'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => { setResetFor(u); setResetPw(''); }}
                    style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f3f4f6' }}
                  >
                    <Text style={{ color: '#111' }}>Reset PW</Text>
                  </Pressable>

                  {u.role === 'adult' && (
                    <Pressable
                      onPress={() => openManage(u)}
                      style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#c7d2fe', backgroundColor: '#eef2ff' }}
                    >
                      <Text style={{ color: '#4338ca' }}>Manage Children</Text>
                    </Pressable>
                  )}

                  {/* 2) NEW: Delete button */}
                  <Pressable
                    onPress={() => { setDelFor(u); setDelErr(null); }}
                    style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8,
                             borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fee2e2' }}
                  >
                    <Text style={{ color: '#991b1b' }}>Delete</Text>
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
                <Pressable key={r} onPress={() => setRoleNew(r)} style={{
                  paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8,
                  borderWidth: 1, borderColor: '#e5e7eb',
                  backgroundColor: roleNew === r ? '#2d6cdf' : '#fff'
                }}>
                  <Text style={{ color: roleNew === r ? '#fff' : '#111' }}>{r}</Text>
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

      {/* Reset Password modal */}
      <Modal visible={!!resetFor} animationType="slide" transparent onRequestClose={() => setResetFor(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.25)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111' }}>
              Reset password for {resetFor?.display_name}
            </Text>
            <TextInput
              value={resetPw}
              onChangeText={setResetPw}
              secureTextEntry
              placeholder="new temporary password"
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10 }}
            />
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
              <Pressable onPress={() => setResetFor(null)} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
                <Text style={{ color: '#111' }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={onResetPassword} disabled={resetBusy} style={{
                backgroundColor: '#2d6cdf', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8,
                opacity: resetBusy ? 0.6 : 1
              }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {resetBusy ? 'Saving…' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manage Children modal */}
      <Modal
        key={manageFor?.id || 'none'}   // (4) Force fresh modal instance per adult
        visible={!!manageFor}
        animationType="slide"
        transparent
        onRequestClose={() => setManageFor(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.25)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 12, maxHeight: '80%' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111' }}>
              Manage children for {manageFor?.display_name}
            </Text>

            {mcLoading && (
              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                <ActivityIndicator /><Text style={{ color: '#666', marginTop: 8 }}>Loading…</Text>
              </View>
            )}

            {!!mcErr && (
              <View style={{ backgroundColor: '#fde7e9', borderColor: '#f2b2b8', borderWidth: 1, padding: 8, borderRadius: 8 }}>
                <Text style={{ color: '#b00020' }}>{mcErr}</Text>
              </View>
            )}

            {!mcLoading && !mcErr && (
              <ScrollView style={{ maxHeight: 300 }}>
                {mcChildren.length === 0 ? (
                  <Text style={{ color: '#666' }}>No children found.</Text>
                ) : (
                  mcChildren.map(ch => {
                    const checked = mcSelected.has(ch.id);
                    return (
                      <View
                        key={ch.id}
                        style={{
                          paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8,
                          borderWidth: 1, borderColor: checked ? '#c7d2fe' : '#e5e7eb',
                          backgroundColor: checked ? '#eef2ff' : '#fff',
                          marginBottom: 8,
                        }}
                      >
                        <CheckboxRow
                          id={ch.id}
                          label={`${ch.display_name} (${ch.status})`}
                          checked={checked}
                          onToggle={(id) => {
                            if (mcLoading) return; // (2) Guard: no toggles during load
                            setMcSelected(prev => {
                              const next = new Set(prev);
                              if (next.has(id)) next.delete(id);
                              else next.add(id);
                              return next;
                            });
                          }}
                        />
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}

            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <Pressable onPress={() => setManageFor(null)} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
                <Text style={{ color: '#111' }}>Close</Text>
              </Pressable>
              <Pressable
                onPress={onSaveManage}
                disabled={mcLoading || mcSaving}
                style={{
                  paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#2d6cdf',
                  borderRadius: 8, opacity: mcLoading || mcSaving ? 0.5 : 1
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {mcSaving ? 'Saving…' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3) NEW: Delete confirm modal (placed just above </SafeAreaView>) */}
      <Modal visible={!!delFor} animationType="slide" transparent onRequestClose={() => setDelFor(null)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.25)', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:'#fff', borderRadius:12, padding:16, gap:10 }}>
            <Text style={{ fontSize:18, fontWeight:'700', color:'#111' }}>
              Delete user {delFor?.display_name}?
            </Text>
            <Text style={{ color:'#991b1b' }}>
              This action removes links and the user account. It will fail if the user has history.
            </Text>
            {!!delErr && (
              <View style={{ backgroundColor:'#fde7e9', borderColor:'#f2b2b8', borderWidth:1, padding:8, borderRadius:8 }}>
                <Text style={{ color:'#b00020' }}>{delErr}</Text>
              </View>
            )}
            <View style={{ flexDirection:'row', gap:8, justifyContent:'flex-end' }}>
              <Pressable onPress={() => setDelFor(null)} style={{ paddingVertical:8, paddingHorizontal:12 }}>
                <Text style={{ color:'#111' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (!delFor) return;
                  try {
                    setDelBusy(true); setDelErr(null);
                    await deleteUser({ user_id: delFor.id });
                    setRows(prev => prev.filter(x => x.id !== delFor.id));
                    setDelFor(null);
                    showBanner('ok', 'User deleted');
                  } catch (e:any) {
                    const msg = String(e?.message || '');
                    if (msg.includes('cannot_delete_admin')) setDelErr('Cannot delete admin users');
                    else if (msg.includes('has_history')) setDelErr('User has history; disable instead');
                    else if (msg.includes('not_found')) setDelErr('User not found');
                    else setDelErr('Delete failed');
                  } finally {
                    setDelBusy(false);
                  }
                }}
                disabled={delBusy}
                style={{ backgroundColor:'#dc2626', paddingVertical:10, paddingHorizontal:14, borderRadius:8,
                         opacity: delBusy ? 0.6 : 1 }}
              >
                <Text style={{ color:'#fff', fontWeight:'700' }}>{delBusy ? 'Deleting…' : 'Delete'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
