import { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { login } from '../src/api/auth';
import { apiFetch, setToken, writeItem } from '../src/api/client';
import { useAuth } from '../src/state/auth';   // <-- use the provider here

export default function LoginScreen() {
  const [alias, setAlias] = useState('adult.anna');
  const [password, setPassword] = useState('demo');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const { signIn } = useAuth();   // <-- get signIn from context
  const router = useRouter();

  async function onSignIn() {
    try {
      setLoading(true);
      setStatus(null);

      // 1) call backend
      const resp = await login(alias, password); // { user_id, role, display_name, token }

      // 2) persist to storage (web-safe) so refreshes keep you logged in
      await setToken(resp.token);
      await writeItem(
        'user',
        JSON.stringify({
          user_id: resp.user_id,
          role: resp.role,
          display_name: resp.display_name,
        })
      );

      // 3) update in-memory provider state immediately (this is the missing piece)
      await signIn({
        user_id: resp.user_id,
        role: resp.role,
        display_name: resp.display_name,
        token: resp.token,
      });

      // 4) optional smoke check
      const tasks = await apiFetch<any[]>('/api/tasks');
      setStatus({ kind: 'ok', msg: `Hello ${resp.display_name} (${resp.role}) — fetched ${Array.isArray(tasks) ? tasks.length : 0} tasks` });

      // 5) navigate into tabs; tabs will now see user in context and NOT redirect back
      router.replace('/(tabs)/totals');
    } catch (e: any) {
      setStatus({ kind: 'err', msg: e?.message || 'Login failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, padding: 24, gap: 12, justifyContent: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: '600', color: '#111' }}>Sign in</Text>

        <Text style={{ fontSize: 12, color: '#555' }}>Alias</Text>
        <TextInput
          value={alias}
          onChangeText={setAlias}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardAppearance="light"
          placeholder="e.g. adult.anna or admin"
          placeholderTextColor="#888"
          selectionColor="#2d6cdf"
          style={{ color: '#111', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12 }}
        />

        <Text style={{ fontSize: 12, color: '#555' }}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          keyboardAppearance="light"
          placeholder="••••••"
          placeholderTextColor="#888"
          selectionColor="#2d6cdf"
          style={{ color: '#111', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12 }}
        />

        <Pressable
          onPress={onSignIn}
          disabled={loading}
          style={{ backgroundColor: '#2d6cdf', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 }}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff' }}>Sign in</Text>}
        </Pressable>

        {status && (
          <Text style={{ marginTop: 16, color: status.kind === 'ok' ? '#127c39' : '#b00020', fontSize: 14 }}>
            {status.msg}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}
