import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import TextCustom from './TextCustom';

interface LoadingStateProps {
  message: string;
  color?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  color = '#6B46C1'
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={color} />
      <TextCustom style={styles.text}>{message}</TextCustom>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  }
});

export default LoadingState; 