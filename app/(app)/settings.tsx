import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Settings = () => {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [biometricLogin, setBiometricLogin] = useState(false);
  
  const handleGoBack = () => {
    router.back();
  };

  const navigateTo = (screen: string, params?: any) => {
    if (params) {
      router.push({
        pathname: screen,
        params
      });
    } else {
      router.push(screen as any);
    }
  };

  const clearCache = async () => {
    try {
      // Clear AsyncStorage cache
      await AsyncStorage.clear();
      Alert.alert('Success', 'Cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
      Alert.alert('Error', 'Failed to clear cache');
    }
  };

  const renderSettingItem = (icon: string, title: string, onPress: () => void, rightComponent?: React.ReactNode) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingItemLeft}>
        <MaterialIcons name={icon as any} size={24} color="#6B46C1" style={styles.settingIcon} />
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      {rightComponent ? (
        rightComponent
      ) : (
        <MaterialIcons name="chevron-right" size={24} color="#9E9E9E" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <LinearGradient colors={['#6B46C1', '#4A2C9B']} style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Account/Profile Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account/Profile Settings</Text>
          {renderSettingItem('person', 'Edit Profile', () => navigateTo('/(app)/profile'))}
          {renderSettingItem('lock', 'Change Password', () => Alert.alert('Change Password', 'This feature will be available soon'))}
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          {renderSettingItem('notifications', 'Push Notifications', () => {}, 
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#D1D1D1', true: '#8A65D4' }}
              thumbColor={notifications ? '#6B46C1' : '#f4f3f4'}
            />
          )}
        </View>

        {/* Theme/Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme/Appearance</Text>
          {renderSettingItem('dark-mode', 'Dark Mode', () => {}, 
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#D1D1D1', true: '#8A65D4' }}
              thumbColor={darkMode ? '#6B46C1' : '#f4f3f4'}
            />
          )}
          {renderSettingItem('format-size', 'Font Size', () => Alert.alert('Font Size', 'This feature will be available soon'))}
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Language</Text>
          {renderSettingItem('language', 'Select Language', () => Alert.alert('Language', 'This feature will be available soon'))}
        </View>

        {/* Privacy & Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          {renderSettingItem('fingerprint', 'Biometric Login', () => {}, 
            <Switch
              value={biometricLogin}
              onValueChange={setBiometricLogin}
              trackColor={{ false: '#D1D1D1', true: '#8A65D4' }}
              thumbColor={biometricLogin ? '#6B46C1' : '#f4f3f4'}
            />
          )}
          {renderSettingItem('security', 'Privacy Settings', () => Alert.alert('Privacy Settings', 'This feature will be available soon'))}
        </View>

        {/* Download Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Download Settings</Text>
          {renderSettingItem('save-alt', 'Manage Downloads', () => navigateTo('/(app)/downloads'))}
          {renderSettingItem('cleaning-services', 'Clear Cache', clearCache)}
          {renderSettingItem('storage', 'Storage Usage', () => Alert.alert('Storage Usage', 'This feature will be available soon'))}
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Info</Text>
          {renderSettingItem('info', 'About', () => navigateTo('/(app)/about-us'))}
          {renderSettingItem('new-releases', 'Version', () => Alert.alert('App Version', 'v1.0.0'))}
          {renderSettingItem('description', 'Terms of Service', () => Alert.alert('Terms of Service', 'This feature will be available soon'))}
          {renderSettingItem('privacy-tip', 'Privacy Policy', () => Alert.alert('Privacy Policy', 'This feature will be available soon'))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
  },
});

export default Settings;