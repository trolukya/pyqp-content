import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function ManageVideosLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#6B46C1" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#6B46C1',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Manage Videos' }} />
        <Stack.Screen name="add" options={{ title: 'Add Video Lecture' }} />
        <Stack.Screen name="edit" options={{ title: 'Edit Video Lecture' }} />
      </Stack>
    </>
  );
} 