// app/(tabs)/totals.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { getTotals, TotalsRow } from '../../src/api/totals';
import { setPreference, Preference } from '../../src/api/preferences';
import { useAuth } from '../../src/state/auth';
import { useData } from '../../src/state/data';
import { useSelectedChild } from '../../src/state/child';

function toNumber(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export default function TotalsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { version, invalidate } = useData();
  const { childId, childName } = useSelectedChild();
  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<TotalsRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Record<string, Preference>>({});

  const fetchTotals = useCallback(async (initial = false) => {
    try {
      if (initial) setLoading(true);
      setError(null);
      const data = await getTotals(childId);
      const arr = Array.isArray(data) ? data : [];
      setRows(arr);
      setPrefs((prev) => {
        const next = { ...prev };
        for (const r of arr) {
          const time = toNumber(r.time_minutes_total);
          const money = toNumber(r.money_total_eur);
          const canChoose = time > 0 && Math.abs(money) > 0;
          if (canChoose && !next[r.code]) next[r.code] = 'MONEY';
        }
        return next;
      });
    } catch (e: any) {
      const msg = e?.message || 'Failed to load totals';
      if (msg === 'unauthorized') { await signOut(); router.replace('/'); return; }
      setError(msg);
    } finally {
      if (initial) setLoading(false);
      setRefreshing(false);
    }
  }, [router, signOut, childId]);

  useEffect(() => { fetchTotals(true); }, [fetchTotals]);
  useFocusEffect(useCallback(() => { fetchTotals(false); }, [fetchTotals]));
  useEffect(() => { fetchTotals(false); }, [version, childId, fetchTotals]);

  const groups = useMemo(() => {
    const map = new Map<string, TotalsRow[]>();
    for (const r of rows) {
      const k = r.category || 'Other';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return Array.from(map.entries())
      .map(([category, items]) => ({ category, items: items.sort((a, b) => a.name.localeCompare(b.name)) }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [rows]);

  async function onToggle(code: string, pref: Preference) {
    const row = rows.find((r) => r.code === code); if (!row) return;
    const time = toNumber(row.time_minutes_total);
    const money = toNumber(row.money_total_eur);
    const canChoose = time > 0 && Math.abs(money) > 0;
    if (!canChoose) return;

    const prev = prefs[code];
    setPrefs((p) => ({ ...p, [code]: pref }));
    try {
      await setPreference({ child_id: childId, task_code: code, preference: pref });
      invalidate();
    } catch {
      setPrefs((p) => ({ ...p, [code]: prev }));
    }
  }

  const totalTasksPending = rows.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTotals(false); }} tintColor="#2d6cdf" />
        }
      >
        <View style={{ gap: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#111' }}>Totals</Text>
            {!!childName && <Text style={{ color: '#666' }}>For: {childName}</Text>}
            {!loading && (
              <Text style={{ color: '#666' }}>
                {totalTasksPending > 0 ? `${totalTasksPending} task${totalTasksPending > 1 ? 's' : ''} pending` : 'Nothing pending'}
              </Text>
            )}
          </View>
          <Pressable onPress={() => fetchTotals(false)} style={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
            <Text style={{ color: '#4338ca', fontWeight: '600' }}>Refresh</Text>
          </Pressable>
        </View>

        {loading && (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <ActivityIndicator /><Text style={{ marginTop: 8, color: '#666' }}>Loading totals…</Text>
          </View>
        )}
        {!loading && error && (
          <View style={{ backgroundColor: '#fde7e9', borderColor: '#f2b2b8', borderWidth: 1, padding: 12, borderRadius: 10 }}>
            <Text style={{ color: '#b00020' }}>{error}</Text>
          </View>
        )}
        {!loading && !error && groups.length === 0 && (
          <View style={{ backgroundColor: '#fafafa', borderColor: '#eee', borderWidth: 1, padding: 16, borderRadius: 10 }}>
            <Text style={{ color: '#333', fontWeight: '600' }}>No pending items</Text>
            <Text style={{ color: '#666' }}>Submit items from the Form tab, then refresh this page.</Text>
          </View>
        )}

        {!loading && !error && groups.map(({ category, items }) => (
          <View key={category} style={{ backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, gap: 8 }}>
            <Text style={{ color: '#222', fontWeight: '700' }}>{category}</Text>
            {items.map((r) => {
              const time = toNumber(r.time_minutes_total);
              const money = toNumber(r.money_total_eur);
              const canChoose = time > 0 && Math.abs(money) > 0;
              const current = prefs[r.code] ?? (canChoose ? 'MONEY' : undefined);
              return (
                <View key={r.code} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12, gap: 6 }}>
                  <Text style={{ color: '#111', fontWeight: '600' }}>{r.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Text style={{ color: '#666' }}>Time: {time} min</Text>
                    <Text style={{ color: '#666' }}>Money: €{toNumber(money).toFixed(2)}</Text>
                  </View>
                  {canChoose ? (
                    <Segmented value={current as Preference} onChange={(v) => onToggle(r.code, v)} />
                  ) : (
                    <Text style={{ color: '#999', fontSize: 12 }}>Fixed: {time > 0 ? 'Time' : 'Money'}</Text>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Segmented({ value, onChange }: { value: Preference; onChange: (v: Preference) => void; }) {
  const isTime = value === 'TIME';
  return (
    <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 999, overflow: 'hidden', flexDirection: 'row' }}>
      <Pressable onPress={() => onChange('TIME')} style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: isTime ? '#2d6cdf' : '#fff' }}>
        <Text style={{ color: isTime ? '#fff' : '#111' }}>Time</Text>
      </Pressable>
      <Pressable onPress={() => onChange('MONEY')} style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: !isTime ? '#2d6cdf' : '#fff' }}>
        <Text style={{ color: !isTime ? '#fff' : '#111' }}>Money</Text>
      </Pressable>
    </View>
  );
}
