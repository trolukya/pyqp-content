import { useEffect } from 'react';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { session, loading } = useAuth();
  const router = useRouter();

  // Redirect based on authentication status
  useEffect(() => {
    if (!loading && router) {
      if (session) {
        console.log('User is authenticated, redirecting to contents page');
        router.replace('/(app)/contents');
      } else {
        console.log('User is not authenticated, redirecting to signin');
        router.replace('/signin');
      }
    }
  }, [session, loading, router]);

  // Show a loading indicator while checking auth status
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6B46C1" />
      <Text style={styles.text}>Loading...</Text>
    </View>
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