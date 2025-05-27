import { Stack } from 'expo-router';

export default function ManageJobsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="add" />
      <Stack.Screen name="edit" />
    </Stack>
  );
} 