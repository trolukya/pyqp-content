import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

type AdminTabBarProps = {
  activeTab: 'home' | 'profile' | 'manage' | 'contents';
};

const AdminTabBar = ({ activeTab }: AdminTabBarProps) => {
  console.log('Rendering AdminTabBar with activeTab:', activeTab);

  const navigateToContents = () => {
    console.log('Navigating to contents');
    try {
      if (activeTab !== 'contents') {
        router.push('/(app)/contents');
      }
    } catch (error) {
      console.error('Error navigating to contents:', error);
      try {
        router.replace('/(app)/contents');
      } catch (fallbackError) {
        console.error('Fallback navigation failed:', fallbackError);
        Alert.alert('Navigation Error', 'Could not navigate. Please restart the app.');
      }
    }
  };

  const navigateToHome = () => {
    console.log('Navigating to home');
    try {
      // Use replace for home to avoid stack buildup
      router.replace('/(app)/contents');
    } catch (error) {
      console.error('Error navigating to home:', error);
      // Alternative navigation attempt
      try {
        router.push('/(app)/contents');
      } catch (fallbackError) {
        console.error('Fallback navigation failed:', fallbackError);
        Alert.alert('Navigation Error', 'Could not navigate. Please restart the app.');
      }
    }
  };

  const navigateToManage = () => {
    console.log('Navigating to manage papers');
    try {
      // Make sure we're not already on this screen
      if (activeTab !== 'manage') {
        router.push('/(app)/manage-papers/all-papers');
      }
    } catch (error) {
      console.error('Error navigating to manage papers:', error);
      // Alternative navigation attempt
      try {
        router.replace('/(app)/manage-papers/all-papers');
      } catch (fallbackError) {
        console.error('Fallback navigation failed:', fallbackError);
        Alert.alert('Navigation Error', 'Could not navigate. Please restart the app.');
      }
    }
  };

  const navigateToProfile = () => {
    console.log('Navigating to profile');
    try {
      // Make sure we're not already on this screen
      if (activeTab !== 'profile') {
        router.push('/(app)/profile');
      }
    } catch (error) {
      console.error('Error navigating to profile:', error);
      // Alternative navigation attempt
      try {
        router.replace('/(app)/profile');
      } catch (fallbackError) {
        console.error('Fallback navigation failed:', fallbackError);
        Alert.alert('Navigation Error', 'Could not navigate. Please restart the app.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.tabButton, activeTab === 'contents' && styles.activeTab]} 
        onPress={navigateToContents}
      >
        <MaterialIcons 
          name="menu-book" 
          size={24} 
          color={activeTab === 'contents' ? '#6B46C1' : '#8E8E93'} 
        />
        <Text style={[styles.tabLabel, activeTab === 'contents' && styles.activeText]}>
          Contents
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.tabButton, activeTab === 'home' && styles.activeTab]} 
        onPress={navigateToHome}
      >
        <FontAwesome 
          name="file-text-o" 
          size={24} 
          color={activeTab === 'home' ? '#6B46C1' : '#8E8E93'} 
        />
        <Text style={[styles.tabLabel, activeTab === 'home' && styles.activeText]}>
          Exam Papers
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.tabButton, activeTab === 'manage' && styles.activeTab]} 
        onPress={navigateToManage}
      >
        <FontAwesome 
          name="file-text" 
          size={24} 
          color={activeTab === 'manage' ? '#6B46C1' : '#8E8E93'} 
        />
        <Text style={[styles.tabLabel, activeTab === 'manage' && styles.activeText]}>
          Manage
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.tabButton, activeTab === 'profile' && styles.activeTab]} 
        onPress={navigateToProfile}
      >
        <FontAwesome 
          name="user" 
          size={24} 
          color={activeTab === 'profile' ? '#6B46C1' : '#8E8E93'} 
        />
        <Text style={[styles.tabLabel, activeTab === 'profile' && styles.activeText]}>
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    borderTopWidth: 3,
    borderTopColor: '#6B46C1',
    paddingTop: 5,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    color: '#8E8E93',
  },
  activeText: {
    color: '#6B46C1',
    fontWeight: 'bold',
  }
});

export default AdminTabBar; 