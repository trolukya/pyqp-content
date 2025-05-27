import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import TextCustom from './TextCustom';

interface EmptyStateProps {
  icon: keyof typeof FontAwesome.glyphMap;
  title: string;
  subtitle: string;
  iconSize?: number;
  iconColor?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  iconSize = 50,
  iconColor = '#ccc',
}) => {
  return (
    <View style={styles.container}>
      <FontAwesome name={icon} size={iconSize} color={iconColor} />
      <TextCustom style={styles.title}>{title}</TextCustom>
      <TextCustom style={styles.subtitle}>{subtitle}</TextCustom>
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
  title: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default EmptyState; 