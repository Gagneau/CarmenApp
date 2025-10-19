// app/_layout.tsx
import { Slot } from 'expo-router';
import { AuthProvider } from '../src/state/auth';
import { DataProvider } from '../src/state/data';
import { SelectedChildProvider } from '../src/state/child';

export default function RootLayout() {
  return (
    <AuthProvider>
      <DataProvider>
        <SelectedChildProvider>
          <Slot />
        </SelectedChildProvider>
      </DataProvider>
    </AuthProvider>
  );
}
