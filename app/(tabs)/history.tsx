// app/(tabs)/history.tsx
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
import { useAuth } from '../../src/state/auth';
import { useData } from '../../src/state/data';
import { useSelectedChild } from '../../src/state/child';
import { getHistory, HistoryItem } from '../../src/api/history';

function fmtDate(iso: string) {
  try { return new Intl.DateTimeFormat(undefined, { year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' }).format(new Date(iso)); }
  catch { return iso || ''; }
}
function fmtEUR(n: number) {
  try { return new Intl.NumberFormat(undefined, { style:'currency', currency:'EUR' }).format(n); }
  catch { return `€${n.toFixed(2)}`; }
}

export default function HistoryScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { version } = useData();
  const { childId, childName } = useSelectedChild();
  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fetchHistory = useCallback(async (initial = false) => {
    try {
      if (initial) setLoading(true);
      setError(null);
      const data = await getHistory(childId);
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      const msg = e?.message || 'Failed to load history';
      if (msg === 'unauthorized') { await signOut(); router.replace('/'); return; }
      setError(msg);
    } finally {
      if (initial) setLoading(false);
      setRefreshing(false);
    }
  }, [router, signOut, childId]);

  useEffect(() => { fetchHistory(true); }, [fetchHistory]);
  useFocusEffect(useCallback(() => { fetchHistory(false); }, [fetchHistory]));
  useEffect(() => { if (version > 0) fetchHistory(false); }, [version, fetchHistory]);
  useEffect(() => { fetchHistory(false); }, [childId, fetchHistory]);

  const empty = !loading && !error && items.length === 0;
  const totalPayouts = items.length;
  const totalsSummary = useMemo(() =>
    items.reduce((acc, it) => ({ time: acc.time + it.total_time_minutes, money: acc.money + it.total_money_eur }), { time: 0, money: 0 }),
  [items]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHistory(false); }} tintColor="#2d6cdf" />}>
        <View style={{ gap: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#111' }}>History</Text>
            {!!childName && <Text style={{ color: '#666' }}>For: {childName}</Text>}
            {!loading && (
              <Text style={{ color: '#666' }}>
                {totalPayouts > 0 ? `${totalPayouts} payout${totalPayouts > 1 ? 's' : ''} • Total: ${totalsSummary.time} min, ${fmtEUR(totalsSummary.money)}` : 'No payouts yet'}
              </Text>
            )}
          </View>
          <Pressable onPress={() => fetchHistory(false)} style={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe', borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 }}>
            <Text style={{ color: '#4338ca', fontWeight: '600' }}>Refresh</Text>
          </Pressable>
        </View>

        {loading && (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <ActivityIndicator /><Text style={{ marginTop: 8, color: '#666' }}>Loading history…</Text>
          </View>
        )}
        {!loading && error && (
          <View style={{ backgroundColor: '#fde7e9', borderColor: '#f2b2b8', borderWidth: 1, padding: 12, borderRadius: 10 }}>
            <Text style={{ color: '#b00020' }}>{error}</Text>
          </View>
        )}
        {empty && (
          <View style={{ backgroundColor: '#fafafa', borderColor: '#eee', borderWidth: 1, padding: 16, borderRadius: 10 }}>
            <Text style={{ color: '#333', fontWeight: '600' }}>No payout history</Text>
            <Text style={{ color: '#666' }}>Confirm a payout in the Payout tab, then refresh.</Text>
          </View>
        )}
        {!loading && !error && items.length > 0 && (
          <View style={{ gap: 12 }}>
            {items.map((it) => {
              const open = !!expanded[it.payout_id];
              return (
                <View key={it.payout_id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ color: '#111', fontWeight: '700' }}>{fmtDate(it.approved_at)}</Text>
                      <Text style={{ color: '#666', fontSize: 12 }}>ID: {it.payout_id}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: '#111', fontWeight: '600' }}>Time: {it.total_time_minutes} min</Text>
                      <Text style={{ color: '#111', fontWeight: '600' }}>Money: {fmtEUR(it.total_money_eur)}</Text>
                    </View>
                  </View>

                  {it.lines.length > 0 && (
                    <Pressable onPress={() => setExpanded((prev) => ({ ...prev, [it.payout_id]: !open }))}
                      style={{ alignSelf: 'flex-start', backgroundColor: '#f8fafc', borderColor: '#e5e7eb', borderWidth: 1, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }}>
                      <Text style={{ color: '#111' }}>{open ? 'Hide details' : 'Show details'}</Text>
                    </Pressable>
                  )}

                  {open && it.lines.length > 0 && (
                    <View style={{ marginTop: 6, gap: 8 }}>
                      {it.lines.map((l, idx) => (
                        <View key={`${it.payout_id}-${idx}`} style={{ backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 10 }}>
                          <Text style={{ color: '#111', fontWeight: '600' }}>{l.name}</Text>
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <Text style={{ color: '#666' }}>Time: {Number(l.time_minutes)} min</Text>
                            <Text style={{ color: '#666' }}>Money: {fmtEUR(Number(l.money_eur))}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
