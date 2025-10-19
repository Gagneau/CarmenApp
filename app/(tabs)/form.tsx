// app/(tabs)/form.tsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  View,
  Pressable,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { getTasks, Task, TimeReward } from '../../src/api/tasks';
import { submitSubmission } from '../../src/api/submissions';
import { useAuth } from '../../src/state/auth';
import { useData } from '../../src/state/data';
import { useSelectedChild } from '../../src/state/child';

function formatTime(t: TimeReward) {
  switch (t) {
    case 'MIN_15': return '15 min';
    case 'HOUR_1': return '1 hour';
    case 'NEG_MIN_15': return '−15 min';
    case 'NEG_HOUR_1': return '−1 hour';
    default: return '–';
  }
}
function formatMoney(v: string | number) {
  const n = Number(v || 0);
  const sign = n < 0 ? '-' : '';
  return `${sign}€${Math.abs(n).toFixed(2)}`;
}

type QtyMap = Record<string, number>;

export default function FormScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { invalidate } = useData();
  const { childId, childName } = useSelectedChild();

  const ADULT_ID = user?.user_id ?? '';

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [qtys, setQtys] = useState<QtyMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState<{ time: string; money: string } | null>(null);

  // Load tasks (static list) on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        const data = await getTasks();
        const arr = Array.isArray(data) ? data : [];
        if (!cancelled) {
          setTasks(arr);
          setQtys((prev) => {
            const next = { ...prev };
            for (const t of arr) if (next[t.code] == null) next[t.code] = 0;
            return next;
          });
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load tasks');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-dismiss success banner after 4s
  useEffect(() => {
    if (!submitOk) return;
    const t = setTimeout(() => setSubmitOk(null), 4000);
    return () => clearTimeout(t);
  }, [submitOk]);

  // Clear banners on tab blur
  useFocusEffect(useCallback(() => {
    return () => { setSubmitOk(null); setSubmitErr(null); };
  }, []));

  const groups = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const k = t.category || 'Other';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return Array.from(map.entries())
      .map(([category, items]) => ({ category, items: items.sort((a, b) => a.name.localeCompare(b.name)) }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [tasks]);

  const clamp = (n: number) => Math.max(0, Math.min(999, Number.isFinite(n) ? Math.trunc(n) : 0));
  const setQty = (code: string, value: number) => setQtys((prev) => ({ ...prev, [code]: clamp(value) }));
  const inc = (code: string) => setQty(code, (qtys[code] || 0) + 1);
  const dec = (code: string) => setQty(code, (qtys[code] || 0) - 1);
  const onEdit = (code: string, text: string) => {
    const digitsOnly = text.replace(/[^\d]/g, '');
    setQty(code, digitsOnly === '' ? 0 : parseInt(digitsOnly, 10));
  };

  const itemsToSubmit = useMemo(
    () => Object.entries(qtys).filter(([, q]) => (q || 0) > 0).map(([task_code, quantity]) => ({ task_code, quantity })),
    [qtys]
  );

  async function onSubmit() {
    if (submitting || itemsToSubmit.length === 0) return;
    try {
      setSubmitting(true); setSubmitErr(null); setSubmitOk(null);
      if (!ADULT_ID) throw new Error('No logged-in user');
      if (!childId) throw new Error('No selected child');

      const res = await submitSubmission({
        adult_id: ADULT_ID,
        child_id: childId,
        items: itemsToSubmit,
      });

      const t = String((res as any)?.total_time_minutes ?? '0');
      const m = String((res as any)?.total_money_eur ?? '0');
      setSubmitOk({ time: t, money: m });

      // Reset local qtys
      setQtys((prev) => {
        const next: QtyMap = { ...prev };
        for (const k of Object.keys(next)) next[k] = 0;
        return next;
      });

      // Notify other tabs
      invalidate();

    } catch (e: any) {
      setSubmitErr(e?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111' }}>Form</Text>
        {!!childName && <Text style={{ color: '#666' }}>For: {childName}</Text>}

        {submitOk && (
          <View style={{ backgroundColor: '#e8f7ee', borderColor: '#b9e4c6', borderWidth: 1, padding: 12, borderRadius: 10, gap: 6 }}>
            <Text style={{ color: '#127c39', fontWeight: '700' }}>Submitted ✓</Text>
            <Text style={{ color: '#127c39' }}>
              Time: {submitOk.time} • Money: €{Number(submitOk.money).toFixed ? Number(submitOk.money).toFixed(2) : submitOk.money}
            </Text>
            <Pressable onPress={() => router.replace('/(tabs)/totals')} style={{ paddingVertical: 8 }}>
              <Text style={{ color: '#2d6cdf' }}>Go to Totals</Text>
            </Pressable>
          </View>
        )}
        {submitErr && (
          <View style={{ backgroundColor: '#fde7e9', borderColor: '#f2b2b8', borderWidth: 1, padding: 12, borderRadius: 10 }}>
            <Text style={{ color: '#b00020' }}>{submitErr}</Text>
          </View>
        )}

        {/* (Keep your loading/error/empty blocks from earlier here) */}

        {/* Render task groups + qty controls */}
        {groups.map(({ category, items }) => (
          <View key={category} style={{ backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, gap: 8 }}>
            <Text style={{ color: '#222', fontWeight: '700' }}>{category}</Text>
            {items.map((t) => {
              const q = qtys[t.code] || 0;
              return (
                <View key={t.code} style={{
                  backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', borderRadius: 10,
                  padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ color: '#111', fontWeight: '600' }}>{t.name}</Text>
                    <Text style={{ color: '#666', fontSize: 12 }}>
                      {formatTime(t.time_reward)} · {formatMoney(t.money_reward_eur)}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pressable onPress={() => setQty(t.code, q - 1)} style={{
                      width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb',
                      backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ color: '#111', fontSize: 18 }}>−</Text>
                    </Pressable>

                    <TextInput
                      value={String(q)}
                      onChangeText={(txt) => {
                        const digits = txt.replace(/[^\d]/g, '');
                        setQty(t.code, digits === '' ? 0 : parseInt(digits, 10));
                      }}
                      keyboardType="number-pad"
                      inputMode="numeric"
                      maxLength={3}
                      style={{
                        width: 56, height: 36, textAlign: 'center', color: '#111',
                        backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingVertical: 6,
                      }}
                    />

                    <Pressable onPress={() => setQty(t.code, q + 1)} style={{
                      width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb',
                      backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ color: '#111', fontSize: 18 }}>＋</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        <View style={{ marginTop: 8, gap: 10 }}>
          <Pressable
            onPress={onSubmit}
            disabled={submitting || itemsToSubmit.length === 0}
            style={{
              opacity: submitting || itemsToSubmit.length === 0 ? 0.5 : 1,
              backgroundColor: '#2d6cdf', paddingVertical: 14, borderRadius: 10, alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>
              {submitting ? 'Submitting…' : `Submit (${itemsToSubmit.length} items)`}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
