import { useEffect, useState } from 'react';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { SplashScreen, Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import * as Font from 'expo-font';
import { useFonts } from 'expo-font';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {
  console.log("Failed to prevent splash screen from auto-hiding");
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Add any fonts you want to load here
  });
  const [isSplashReady, setIsSplashReady] = useState(false);

  useEffect(() => {
    // Force hide splash screen after a very short timeout
    const forceHideTimeout = setTimeout(() => {
      console.log('Force hiding splash screen immediately');
      SplashScreen.hideAsync()
        .then(() => console.log('Splash screen hidden successfully'))
        .catch(e => console.error('Error in force hiding splash:', e))
        .finally(() => setIsSplashReady(true));
    }, 2000); // Only wait 2 seconds maximum

    return () => clearTimeout(forceHideTimeout);
  }, []);

  // If the fonts haven't loaded yet and splash isn't force-ready, show a loading indicator
  if (!fontsLoaded && !isSplashReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6B46C1" />
        <Text style={styles.text}>Loading PYQP...</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="register" />
        <Stack.Screen name="signin" />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: 'white',
  },
});
