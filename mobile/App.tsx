import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { ArmyProvider } from './src/contexts/ArmyContext';
import { CollectionProvider } from './src/contexts/CollectionContext';
import TabNavigator from './src/navigation/TabNavigator';

function AppInner() {
  const { theme, colors } = useTheme();

  const navTheme = {
    ...DefaultTheme,
    dark: theme === 'dark',
    colors: {
      ...DefaultTheme.colors,
      primary: colors.accentGold,
      background: colors.bgPrimary,
      card: colors.bgCard,
      text: colors.textPrimary,
      border: colors.borderColor,
      notification: colors.accentGold,
    },
  };

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer theme={navTheme}>
        <TabNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ArmyProvider>
          <CollectionProvider>
            <AppInner />
          </CollectionProvider>
        </ArmyProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
