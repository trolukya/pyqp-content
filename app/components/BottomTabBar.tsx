import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

type BottomTabBarProps = {
  activeTab: 'home' | 'profile' | 'jobs' | 'contents';
};

const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab }) => {
  const navigateTo = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.tabItem}
        onPress={() => navigateTo('/(app)/contents')}
        activeOpacity={0.7}
      >
        <View style={styles.tabIconContainer}>
          <MaterialIcons
            name="menu-book"
            size={24}
            color={activeTab === 'contents' ? '#6B46C1' : '#9E9E9E'}
          />
          {activeTab === 'contents' && <View style={styles.activeIndicator} />}
        </View>
        <Text
          style={[
            styles.tabLabel,
            { color: activeTab === 'contents' ? '#6B46C1' : '#9E9E9E' }
          ]}
        >
          Contents
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.tabItem}
        onPress={() => navigateTo('/(app)')}
        activeOpacity={0.7}
      >
        <View style={styles.tabIconContainer}>
          <Ionicons
          name="document-text" 
          size={24} 
            color={activeTab === 'home' ? '#6B46C1' : '#9E9E9E'}
        />
          {activeTab === 'home' && <View style={styles.activeIndicator} />}
        </View>
        <Text
          style={[
            styles.tabLabel,
            { color: activeTab === 'home' ? '#6B46C1' : '#9E9E9E' }
          ]}
        >
          Exam Papers
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.tabItem}
        onPress={() => navigateTo('/(app)/job-alerts')}
        activeOpacity={0.7}
      >
        <View style={styles.tabIconContainer}>
          <Ionicons
            name="briefcase"
            size={24}
            color={activeTab === 'jobs' ? '#6B46C1' : '#9E9E9E'}
          />
          {activeTab === 'jobs' && <View style={styles.activeIndicator} />}
        </View>
        <Text
          style={[
            styles.tabLabel,
            { color: activeTab === 'jobs' ? '#6B46C1' : '#9E9E9E' }
          ]}
        >
          Job Alert
        </Text>
      </TouchableOpacity>

      {/* Profile button removed */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 65,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 28,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -5,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#6B46C1',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
});

export default BottomTabBar; 