import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import TextCustom from './TextCustom';

interface EmptyStateProps {
  icon?: keyof typeof FontAwesome.glyphMap;
  iconSize?: number;
  title?: string;
  message?: string;
  children?: React.ReactNode;
  hideContent?: boolean;
}

const EmptyState = ({ 
  icon = 'file-text-o', 
  iconSize = 60, 
  title,
  message, 
  children,
  hideContent = false
}: EmptyStateProps) => {
  if (hideContent) return null;
  
  return (
    <View style={styles.emptyContainer}>
      <FontAwesome name={icon} size={iconSize} color="#ccc" />
      {title && (
        <TextCustom style={styles.emptyText} fontSize={18}>
          {title}
        </TextCustom>
      )}
      {message && (
        <TextCustom style={styles.emptySubText} fontSize={14}>
          {message}
        </TextCustom>
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptySubText: {
    marginTop: 8,
    color: '#999',
    textAlign: 'center',
  },
});

export default EmptyState; 