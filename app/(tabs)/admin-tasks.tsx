import { useFocusEffect } from '@react-navigation/native';
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
import { createTask, listTasks, TaskRow, updateTask } from '../../src/api/adminTasks';
import { useAuth } from '../../src/state/auth';

// A) Allowed values (top of file)
const TIME_OPTIONS = ['NONE','MIN_15','HOUR_1','NEG_MIN_15','NEG_HOUR_1'] as const;

export default function AdminTasksScreen() {
  const { user, signOut } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [rows, setRows] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');

  // banner helper
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const showBanner = (kind: 'ok' | 'err', msg: string) => {
    setBanner({ kind, msg });
    setTimeout(() => setBanner(null), 2500);
  };

  // optimistic row patch helper
  const patchRow = (id: string, partial: Partial<TaskRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...partial } : r)));

  // --- a) Local edit state (money)
  const [editing, setEditing] = useState<{ id: string | null; value: string }>({ id: null, value: '' });

  // NEW: inline name/category edit state
  const [nameEdit, setNameEdit] = useState<{ id: string | null; value: string }>({ id: null, value: '' });
  const [catEdit, setCatEdit] = useState<{ id: string | null; value: string }>({ id: null, value: '' });

  // B) Local UI state for time selector
  const [trOpen, setTrOpen] = useState<string | null>(null);

  // Create Task modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [cCode, setCCode] = useState('');
  const [cName, setCName] = useState('');
  const [cCategory, setCCategory] = useState('Household');
  const [cTime, setCTime] = useState<typeof TIME_OPTIONS[number]>('MIN_15');
  const [cMoney, setCMoney] = useState('0.00');
  const [cActive, setCActive] = useState(true);
  const [cBusy, setCBusy] = useState(false);
  const [cErr, setCErr] = useState<string|null>(null);

  const fetchList = useCallback(
    async (initial = false) => {
      try {
        if (initial) setLoading(true);
        setError(null);
        const filters: any = {};
        if (search.trim()) filters.search = search.trim();
        if (activeFilter !== 'all') filters.active = activeFilter;
        const data = await listTasks({ ...filters, sort: 'name_asc', page: 1, page_size: 50 });
        setRows(Array.isArray(data) ? data : []);
      } catch (e: any) {
        const msg = e?.message || 'Failed to load tasks';
        if (msg === 'unauthorized') {
          await signOut();
          return;
        }
        if (msg === 'forbidden') {
          setError('Forbidden (admin only)');
          return;
        }
        setError(msg);
      } finally {
        if (initial) setLoading(false);
        setRefreshing(false);
      }
    },
    [search, activeFilter, signOut]
  );

  useEffect(() => {
    if (isAdmin) fetchList(true);
  }, [isAdmin, fetchList]);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) fetchList(false);
    }, [fetchList, isAdmin])
  );

  // toggle handler
  async function onToggleActive(t: TaskRow) {
    const next = !t.active;
    patchRow(t.id, { active: next });
    try {
      const updated = await updateTask({ id: t.id, active: next });
      patchRow(t.id, updated);
      showBanner('ok', `Task ${next ? 'unarchived' : 'archived'}`);
    } catch (e: any) {
      // rollback on error
      patchRow(t.id, { active: t.active });
      showBanner('err', 'Update failed');
    }
  }

  // money edit
  function startEditMoney(t: TaskRow) {
    setEditing({ id: t.id, value: t.money_reward_eur ?? '0.00' });
  }

  async function onSaveMoney(t: TaskRow) {
    const val = Number(editing.value.replace(',', '.'));
    if (!Number.isFinite(val)) {
      showBanner('err', 'Enter a valid number');
      return;
    }
    const before = t.money_reward_eur;
    patchRow(t.id, { money_reward_eur: val.toFixed(2) }); // optimistic
    try {
      const updated = await updateTask({ id: t.id, money_reward_eur: val });
      patchRow(t.id, updated);
      setEditing({ id: null, value: '' });
      showBanner('ok', 'Saved');
    } catch (e: any) {
      patchRow(t.id, { money_reward_eur: before }); // rollback
      showBanner('err', 'Update failed');
    }
  }

  function cancelEdit() {
    setEditing({ id: null, value: '' });
  }

  // time edit
  function startEditTime(t: TaskRow) {
    setTrOpen(prev => (prev === t.id ? null : t.id));
  }

  async function onSelectTime(t: TaskRow, value: typeof TIME_OPTIONS[number]) {
    if (t.time_reward === value) { setTrOpen(null); return; }
    const before = t.time_reward;
    patchRow(t.id, { time_reward: value }); // optimistic
    try {
      const updated = await updateTask({ id: t.id, time_reward: value });
      patchRow(t.id, updated);
      setTrOpen(null);
      showBanner('ok', 'Saved');
    } catch (e:any) {
      patchRow(t.id, { time_reward: before }); // rollback
      showBanner('err', 'Update failed');
    }
  }

  // NEW: Name handlers
  function startEditName(t: TaskRow) {
    setNameEdit({ id: t.id, value: t.name ?? '' });
  }
  function cancelEditName() {
    setNameEdit({ id: null, value: '' });
  }
  async function onSaveName(t: TaskRow) {
    const val = nameEdit.value?.trim() ?? '';
    if (!val) { showBanner('err', 'Name is required'); return; }
    const before = t.name;
    patchRow(t.id, { name: val }); // optimistic
    try {
      const updated = await updateTask({ id: t.id, name: val });
      patchRow(t.id, updated);
      setNameEdit({ id: null, value: '' });
      showBanner('ok', 'Saved');
    } catch {
      patchRow(t.id, { name: before }); // rollback
      showBanner('err', 'Update failed');
    }
  }

  // NEW: Category handlers
  function startEditCategory(t: TaskRow) {
    setCatEdit({ id: t.id, value: t.category ?? '' });
  }
  function cancelEditCategory() {
    setCatEdit({ id: null, value: '' });
  }
  async function onSaveCategory(t: TaskRow) {
    const val = catEdit.value?.trim() ?? '';
    if (!val) { showBanner('err', 'Category is required'); return; }
    const before = t.category;
    patchRow(t.id, { category: val }); // optimistic
    try {
      const updated = await updateTask({ id: t.id, category: val });
      patchRow(t.id, updated);
      setCatEdit({ id: null, value: '' });
      showBanner('ok', 'Saved');
    } catch {
      patchRow(t.id, { category: before }); // rollback
      showBanner('err', 'Update failed');
    }
  }

  // Create Task handlers
  function openCreate() {
    setCreateOpen(true);
    setCErr(null);
    setCCode(''); setCName('');
    setCCategory('Household');
    setCTime('MIN_15');
    setCMoney('0.00');
    setCActive(true);
  }

  async function onCreateSave() {
    setCErr(null);
    const moneyNum = Number(cMoney.replace(',', '.'));
    if (!cCode.trim() || !cName.trim() || !cCategory.trim()) {
      setCErr('Code, name, and category are required'); return;
    }
    if (!Number.isFinite(moneyNum)) { setCErr('Money must be a number'); return; }

    try {
      setCBusy(true);
      const created = await createTask({
        code: cCode.trim(),
        name: cName.trim(),
        category: cCategory.trim(),
        time_reward: cTime,
        money_reward_eur: moneyNum,
        active: cActive,
      });
      setRows(prev => [created, ...prev]); // optimistic prepend
      setCreateOpen(false);
      showBanner('ok', 'Task created');
    } catch (e:any) {
      const msg = String(e?.message || '');
      if (msg.includes('duplicate_code')) setCErr('Code already exists');
      else if (msg.includes('invalid_time_reward')) setCErr('Invalid time reward');
      else setCErr('Create failed');
    } finally {
      setCBusy(false);
    }
  }

  if (!isAdmin) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 24 }}
      >
        <Text style={{ color: '#991b1b' }}>Admin only</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* banner */}
      {banner && (
        <View
          style={{
            margin: 12,
            padding: 10,
            borderRadius: 8,
            backgroundColor: banner.kind === 'ok' ? '#e8f7ee' : '#fde7e9',
            borderWidth: 1,
            borderColor: banner.kind === 'ok' ? '#b9e4c6' : '#f2b2b8',
          }}
        >
          <Text style={{ color: banner.kind === 'ok' ? '#127c39' : '#b00020' }}>{banner.msg}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchList(false);
            }}
          />
        }
      >
        {/* Toolbar */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <View style={{ flex: 1 }}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search code/name/category…"
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }}
              autoCapitalize="none"
            />
          </View>
          <Pressable
            onPress={() => setActiveFilter((f) => (f === 'all' ? 'true' : f === 'true' ? 'false' : 'all'))}
            style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }}
          >
            <Text>Active: {activeFilter}</Text>
          </Pressable>
          <Pressable
            onPress={() => fetchList(true)}
            style={{
              borderWidth: 1,
              borderColor: '#c7d2fe',
              backgroundColor: '#eef2ff',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: '#4338ca', fontWeight: '600' }}>Apply</Text>
          </Pressable>

          {/* Create Task button */}
          <Pressable
            onPress={openCreate}
            style={{ borderWidth:1, borderColor:'#b9e4c6', backgroundColor:'#e8f7ee', borderRadius:8, paddingHorizontal:10, paddingVertical:8 }}
          >
            <Text style={{ color:'#127c39', fontWeight:'600' }}>New Task</Text>
          </Pressable>
        </View>

        {/* Status */}
        {loading && (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <ActivityIndicator />
            <Text style={{ color: '#666', marginTop: 8 }}>Loading tasks…</Text>
          </View>
        )}
        {!loading && error && (
          <View style={{ backgroundColor: '#fde7e9', borderColor: '#f2b2b8', borderWidth: 1, padding: 12, borderRadius: 8 }}>
            <Text style={{ color: '#b00020' }}>{error}</Text>
          </View>
        )}

        {/* List */}
        {!loading && !error && (
          <View style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 12 }}>
            {/* header */}
            <View
              style={{
                flexDirection: 'row',
                padding: 10,
                backgroundColor: '#f9fafb',
                borderBottomWidth: 1,
                borderBottomColor: '#eee',
              }}
            >
              <Text style={{ flex: 2, fontWeight: '700' }}>Name</Text>
              <Text style={{ flex: 1, fontWeight: '700' }}>Category</Text>
              <Text style={{ flex: 1, fontWeight: '700' }}>Time</Text>
              <Text style={{ flex: 1, fontWeight: '700', textAlign: 'right' }}>€</Text>
              <Text style={{ width: 70, fontWeight: '700', textAlign: 'center' }}>Active</Text>
            </View>
            {rows.map((t) => (
              <View key={t.id} style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                {/* Name editable cell */}
                <View style={{ flex:2 }}>
                  {nameEdit.id === t.id ? (
                    <View style={{ flexDirection:'row', gap:6, alignItems:'center' }}>
                      <TextInput
                        value={nameEdit.value}
                        onChangeText={(v) => setNameEdit(s => ({ ...s, value: v }))}
                        style={{ flex:1, borderWidth:1, borderColor:'#e5e7eb', borderRadius:8, paddingHorizontal:8, paddingVertical:4 }}
                      />
                      <Pressable
                        onPress={() => onSaveName(t)}
                        style={{ borderWidth:1, borderColor:'#c7e7c6', backgroundColor:'#e8f7ee', borderRadius:8, paddingHorizontal:10, paddingVertical:6 }}
                      >
                        <Text style={{ color:'#127c39' }}>Save</Text>
                      </Pressable>
                      <Pressable
                        onPress={cancelEditName}
                        style={{ borderWidth:1, borderColor:'#e5e7eb', backgroundColor:'#f3f4f6', borderRadius:8, paddingHorizontal:10, paddingVertical:6 }}
                      >
                        <Text>Cancel</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable onPress={() => startEditName(t)}>
                      <Text style={{ color:'#111' }}>{t.name}</Text>
                    </Pressable>
                  )}
                </View>

                {/* Category editable cell */}
                <View style={{ flex:1 }}>
                  {catEdit.id === t.id ? (
                    <View style={{ flexDirection:'row', gap:6, alignItems:'center' }}>
                      <TextInput
                        value={catEdit.value}
                        onChangeText={(v) => setCatEdit(s => ({ ...s, value: v }))}
                        style={{ minWidth:120, borderWidth:1, borderColor:'#e5e7eb', borderRadius:8, paddingHorizontal:8, paddingVertical:4 }}
                      />
                      <Pressable
                        onPress={() => onSaveCategory(t)}
                        style={{ borderWidth:1, borderColor:'#c7e7c6', backgroundColor:'#e8f7ee', borderRadius:8, paddingHorizontal:10, paddingVertical:6 }}
                      >
                        <Text style={{ color:'#127c39' }}>Save</Text>
                      </Pressable>
                      <Pressable
                        onPress={cancelEditCategory}
                        style={{ borderWidth:1, borderColor:'#e5e7eb', backgroundColor:'#f3f4f6', borderRadius:8, paddingHorizontal:10, paddingVertical:6 }}
                      >
                        <Text>Cancel</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable onPress={() => startEditCategory(t)}>
                      <Text style={{ color:'#555' }}>{t.category}</Text>
                    </Pressable>
                  )}
                </View>

                {/* Time column with selector */}
                <View style={{ flex:1 }}>
                  <Pressable
                    onPress={() => startEditTime(t)}
                    style={{
                      borderWidth:1, borderColor:'#e5e7eb', borderRadius:8,
                      paddingVertical:4, paddingHorizontal:8, backgroundColor:'#f9fafb'
                    }}
                  >
                    <Text style={{ color:'#111' }}>{t.time_reward}</Text>
                  </Pressable>

                  {trOpen === t.id && (
                    <View style={{
                      marginTop:6, padding:6, borderWidth:1, borderColor:'#e5e7eb',
                      borderRadius:8, backgroundColor:'#fff', gap:6
                    }}>
                      {TIME_OPTIONS.map(opt => {
                        const selected = opt === t.time_reward;
                        return (
                          <Pressable
                            key={opt}
                            onPress={() => onSelectTime(t, opt)}
                            style={{
                              borderWidth:1, borderColor: selected ? '#c7d2fe' : '#e5e7eb',
                              borderRadius:6, paddingVertical:6, paddingHorizontal:8,
                              backgroundColor: selected ? '#eef2ff' : '#fff'
                            }}
                          >
                            <Text style={{ color: selected ? '#4338ca' : '#111' }}>{opt}</Text>
                          </Pressable>
                        );
                      })}
                      <Pressable
                        onPress={() => setTrOpen(null)}
                        style={{ alignSelf:'flex-end', marginTop:2, paddingVertical:6, paddingHorizontal:8 }}
                      >
                        <Text>Close</Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                {/* Money editable cell */}
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  {editing.id === t.id ? (
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <TextInput
                        value={editing.value}
                        onChangeText={(v) => setEditing((s) => ({ ...s, value: v }))}
                        keyboardType="numeric"
                        style={{
                          minWidth: 80,
                          borderWidth: 1,
                          borderColor: '#e5e7eb',
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          textAlign: 'right',
                        }}
                      />
                      <Pressable
                        onPress={() => onSaveMoney(t)}
                        style={{
                          borderWidth: 1,
                          borderColor: '#c7e7c6',
                          backgroundColor: '#e8f7ee',
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                        }}
                      >
                        <Text style={{ color: '#127c39' }}>Save</Text>
                      </Pressable>
                      <Pressable
                        onPress={cancelEdit}
                        style={{
                          borderWidth: 1,
                          borderColor: '#e5e7eb',
                          backgroundColor: '#f3f4f6',
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                        }}
                      >
                        <Text>Cancel</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable onPress={() => startEditMoney(t)}>
                      <Text style={{ color: '#111' }}>€{t.money_reward_eur}</Text>
                    </Pressable>
                  )}
                </View>

                {/* pressable toggle for Active */}
                <Pressable
                  onPress={() => onToggleActive(t)}
                  style={{
                    width: 70,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                    borderRadius: 8,
                    backgroundColor: t.active ? '#e8f7ee' : '#fee2e2',
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: t.active ? '#127c39' : '#991b1b', fontWeight: '600' }}>
                    {t.active ? 'Active' : 'Inactive'}
                  </Text>
                </Pressable>
              </View>
            ))}
            {rows.length === 0 && (
              <View style={{ padding: 16 }}>
                <Text style={{ color: '#666' }}>No tasks found</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Create Task modal */}
      <Modal visible={createOpen} animationType="slide" transparent onRequestClose={() => setCreateOpen(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,.25)', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:'#fff', borderRadius:12, padding:16, gap:10 }}>
            <Text style={{ fontSize:18, fontWeight:'700', color:'#111' }}>Create Task</Text>

            {!!cErr && (
              <View style={{ backgroundColor:'#fde7e9', borderColor:'#f2b2b8', borderWidth:1, padding:8, borderRadius:8 }}>
                <Text style={{ color:'#b00020' }}>{cErr}</Text>
              </View>
            )}

            <Text>Code</Text>
            <TextInput value={cCode} onChangeText={setCCode}
              autoCapitalize="none"
              style={{ borderWidth:1, borderColor:'#e5e7eb', borderRadius:8, padding:8 }} />

            <Text>Name</Text>
            <TextInput value={cName} onChangeText={setCName}
              style={{ borderWidth:1, borderColor:'#e5e7eb', borderRadius:8, padding:8 }} />

            <Text>Category</Text>
            <TextInput value={cCategory} onChangeText={setCCategory}
              style={{ borderWidth:1, borderColor:'#e5e7eb', borderRadius:8, padding:8 }} />

            <Text>Time reward</Text>
            <View style={{ gap:6 }}>
              {TIME_OPTIONS.map(opt => (
                <Pressable key={opt} onPress={() => setCTime(opt)}
                  style={{
                    borderWidth:1, borderColor: cTime===opt ? '#c7d2fe' : '#e5e7eb',
                    backgroundColor: cTime===opt ? '#eef2ff' : '#fff',
                    borderRadius:6, paddingVertical:6, paddingHorizontal:8
                  }}>
                  <Text style={{ color: cTime===opt ? '#4338ca' : '#111' }}>{opt}</Text>
                </Pressable>
              ))}
            </View>

            <Text>Money (€)</Text>
            <TextInput value={cMoney} onChangeText={setCMoney}
              keyboardType="numeric"
              style={{ borderWidth:1, borderColor:'#e5e7eb', borderRadius:8, padding:8 }} />

            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:4 }}>
              <Pressable
                onPress={() => setCActive(a => !a)}
                style={{ borderWidth:1, borderColor:'#e5e7eb', borderRadius:8, paddingHorizontal:10, paddingVertical:6,
                         backgroundColor: cActive ? '#e8f7ee' : '#f3f4f6' }}
              >
                <Text style={{ color: cActive ? '#127c39' : '#111' }}>{cActive ? 'Active' : 'Inactive'}</Text>
              </Pressable>

              <View style={{ flexDirection:'row', gap:8 }}>
                <Pressable onPress={() => setCreateOpen(false)} style={{ padding:10 }}>
                  <Text>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={onCreateSave}
                  disabled={cBusy}
                  style={{ borderWidth:1, borderColor:'#c7d2fe', backgroundColor:'#eef2ff', borderRadius:8, paddingHorizontal:12, paddingVertical:8,
                           opacity: cBusy ? 0.5 : 1 }}
                >
                  <Text style={{ color:'#4338ca', fontWeight:'600' }}>{cBusy ? 'Saving…' : 'Save'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
