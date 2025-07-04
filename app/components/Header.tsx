import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

interface HeaderProps {
  title?: string;
  onMenuPress: () => void;
  showNotificationIcon?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  title = 'PYQP', 
  onMenuPress,
  showNotificationIcon = true
}) => {
  const handleNotificationPress = () => {
    router.push('/(app)/notifications');
  };

  const handleMenuPress = () => {
    // Call the provided onMenuPress function directly
    onMenuPress();
  };

  return (
    <LinearGradient
      colors={['#6B46C1', '#4A2C9B']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={handleMenuPress}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={28} color="#fff" />
          </TouchableOpacity>
          
          <Text style={styles.title}>{title}</Text>
          
          {showNotificationIcon && (
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={handleNotificationPress}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  safeArea: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  menuButton: {
    padding: 8,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  notificationButton: {
    padding: 8,
  },
});

export default Header; 