import { AuthProvider } from '@/context/AuthContext';
import { LocationProvider } from '@/context/LocationContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppRouter } from '@/routes/AppRouter';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LocationProvider>
          <AppRouter />
        </LocationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
