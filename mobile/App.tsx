import { SafeAreaProvider } from 'react-native-safe-area-context';
import { usePapachitoApp } from './src/usePapachitoApp';
import { BootScreen, MainShell, ProfileSetupScreen } from './src/screens';

export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}

function AppContent() {
  const app = usePapachitoApp();
  if (app.booting) return <BootScreen />;
  if (!app.hasProfile) return <ProfileSetupScreen name={app.setupName} onNameChange={app.setSetupName} onContinue={app.continueSetup} />;
  return <MainShell app={app} />;
}

