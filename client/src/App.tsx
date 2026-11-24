import { AuthProvider } from '@/context/AuthContext';
import { LocationProvider } from '@/context/LocationContext';
import { AppRouter } from '@/routes/AppRouter';

export function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <AppRouter />
      </LocationProvider>
    </AuthProvider>
  );
}
