import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function ManagePapersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === 'android' ? 'fade' : 'default',
        gestureEnabled: false  // Disable gesture-based navigation which can cause issues
      }}
    >
      <Stack.Screen 
        name="add" 
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="all-papers" 
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="edit" 
        options={{ 
          headerShown: false 
        }} 
      />
    </Stack>
  );
} 