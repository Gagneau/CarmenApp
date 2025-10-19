// app/(tabs)/payout.tsx
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
import { getPayoutPreview, confirmPayout, PreviewLine } from '../../src/api/payout';

function n(v: number | string | null | undefined) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

export default function PayoutScreen() {
  const router = useRouter();
  const { user, ready, signOut } = useAuth();
  const { version } = useData();
  const { childId, childName } = useSelectedChild();
  const isAdmin = user?.role === 'admin';

  if (ready && !isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#111' }}>Payout</Text>
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
  const [lines, setLines] = useState<PreviewLine[] | null>(null);
  const [totalTime, setTotalTime] = useState<number>(0);
  const [totalMoney, setTotalMoney] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState<{ payout_id: string; time: number; money: number } | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const fetchPreview = useCallback(async (initial = false) => {
    try {
      if (initial) setLoading(true);
      setError(null);
      const data = await getPayoutPreview(childId);
      setLines(data.lines ?? []);
      setTotalTime(n(data.total_time_minutes));
      setTotalMoney(n(data.total_money_eur));
    } catch (e: any) {
      const msg = e?.message || 'Failed to load payout preview';
      if (msg === 'unauthorized') { await signOut(); router.replace('/'); return; }
      setError(msg === 'forbidden' ? 'Forbidden (admin only)' : msg);
    } finally {
      if (initial) setLoading(false);
      setRefreshing(false);
    }
  }, [router, signOut, childId]);

  useEffect(() => { if (isAdmin) fetchPreview(true); }, [isAdmin, fetchPreview]);
  useFocusEffect(useCallback(() => { fetchPreview(false); }, [fetchPreview]));
  useEffect(() => { if (version > 0) fetchPreview(false); }, [version, fetchPreview]);
  useEffect(() => { fetchPreview(false); }, [childId, fetchPreview]);

  const hasAnythingToPay = useMemo(
    () => totalTime > 0 || Math.abs(totalMoney) > 0,
    [totalTime, totalMoney]
  );

  async function onConfirm() {
    if (!isAdmin || submitting || !hasAnythingToPay) return;
    try {
      setSubmitting(true); setSubmitErr(null); setOk(null);
      const resp = await confirmPayout({ child_id: childId, approved_by_admin_id: user!.user_id });
      const time = n(resp.total_time_minutes);
      const money = n(resp.total_money_eur);
      setOk({ payout_id: String(resp.payout_id || ''), time, money });
      await fetchPreview(false);
    } catch (e: any) {
      const msg = e?.message || 'Failed to confirm payout';
      if (msg === 'unauthorized') { await signOut(); router.replace('/'); return; }
      setSubmitErr(msg === 'forbidden' ? 'Forbidden (admin only)' : msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPreview(false); }} tintColor="#2d6cdf" />
        }
      >
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#111' }}>Payout (Admin)</Text>
          {!!childName && <Text style={{ color: '#666' }}>For: {childName}</Text>}
          {!loading && <Text style={{ color: '#666' }}>Time: {totalTime} min • Money: €{totalMoney.toFixed(2)}</Text>}
        </View>

        {ok && (
          <View style={{ backgroundColor: '#e8f7ee', borderColor: '#b9e4c6', borderWidth: 1, padding: 12, borderRadius: 10, gap: 6 }}>
            <Text style={{ color: '#127c39', fontWeight: '700' }}>Payout confirmed ✓</Text>
            <Text style={{ color: '#127c39' }}>
              ID: {ok.payout_id || '(n/a)'} — Time: {ok.time} min • Money: €{ok.money.toFixed(2)}
            </Text>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <Pressable onPress={() => router.replace('/(tabs)/history')}><Text style={{ color: '#2d6cdf' }}>Go to History</Text></Pressable>
              <Pressable onPress={() => router.replace('/(tabs)/totals')}><Text style={{ color: '#2d6cdf' }}>Go to Totals</Text></Pressable>
            </View>
          </View>
        )}

        {error && !loading && (
          <View style={{ backgroundColor: '#fde7e9', borderColor: '#f2b2b8', borderWidth: 1, padding: 12, borderRadius: 10 }}>
            <Text style={{ color: '#b00020' }}>{error}</Text>
          </View>
        )}

        {loading && (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <ActivityIndicator /><Text style={{ marginTop: 8, color: '#666' }}>Loading payout preview…</Text>
          </View>
        )}

        {!loading && !error && !hasAnythingToPay && (
          <View style={{ backgroundColor: '#fafafa', borderColor: '#eee', borderWidth: 1, padding: 16, borderRadius: 10, gap: 6 }}>
            <Text style={{ color: '#333', fontWeight: '600' }}>Nothing to pay</Text>
            <Text style={{ color: '#666' }}>Add items in Form or adjust preferences in Totals, then refresh.</Text>
            <Pressable onPress={() => router.replace('/(tabs)/totals')} style={{ paddingTop: 4 }}>
              <Text style={{ color: '#2d6cdf' }}>Go to Totals</Text>
            </Pressable>
          </View>
        )}

        {!loading && !error && hasAnythingToPay && Array.isArray(lines) && lines.length > 0 && (
          <View style={{ gap: 12 }}>
            {lines.slice().sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)).map((l) => (
              <View key={l.code} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12, gap: 4 }}>
                <Text style={{ color: '#111', fontWeight: '600' }}>{l.name}</Text>
                <Text style={{ color: '#666', fontSize: 12 }}>{l.category}</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Text style={{ color: '#666' }}>Time: {n(l.chosen_time)} min</Text>
                  <Text style={{ color: '#666' }}>Money: €{n(l.chosen_money).toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {!loading && !error && (
          <Pressable onPress={onConfirm} disabled={!hasAnythingToPay || submitting} style={{
            marginTop: 12, opacity: !hasAnythingToPay || submitting ? 0.5 : 1,
            backgroundColor: '#2d6cdf', paddingVertical: 14, borderRadius: 10, alignItems: 'center',
          }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>
              {submitting ? 'Confirming…' : 'Confirm Payout'}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
