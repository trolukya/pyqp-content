import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  Animated,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface DrawerNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

// Define custom styles for menu items that should not have highlighting
const regularItemStyle = {
  backgroundColor: 'transparent',
  borderWidth: 0
};

const DrawerNavigation: React.FC<DrawerNavigationProps> = ({ isOpen, onClose }) => {
  const { user, signOut } = useAuth();
  const translateX = useRef(new Animated.Value(-width * 0.8)).current;

  useEffect(() => {
    if (isOpen) {
      // Animate drawer to open (slide in from left)
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Animate drawer to close (slide out to left)
      Animated.timing(translateX, {
        toValue: -width * 0.8,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNavigation = (route: any, params?: any) => {
    if (params) {
      router.push({
        pathname: route,
        params: params
      });
    } else {
      router.push(route);
    }
    onClose();
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
    onClose();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      />
      
      <Animated.View style={[
        styles.drawerContainer,
        { transform: [{ translateX }] }
      ]}>
        <LinearGradient
          colors={['#6B46C1', '#4A2C9B']}
          style={styles.drawer}
        >
          <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.scrollView}>
              {/* User Profile Section */}
              <TouchableOpacity 
                style={styles.profileSection}
                onPress={() => handleNavigation('/(app)/profile')}
                activeOpacity={0.7}
              >
                <View style={styles.profileImageContainer}>
                  {user?.name ? (
                    <Text style={styles.profileInitial}>
                      {user.name.charAt(0).toUpperCase()}
                    </Text>
                  ) : (
                    <FontAwesome5 name="user" size={24} color="#fff" />
                  )}
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{user?.name || 'User'}</Text>
                  <Text style={styles.profileEmail}>{user?.email || ''}</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Main Navigation Links */}
              <View style={styles.navigationSection}>
                <TouchableOpacity 
                  style={styles.navItem} 
                  onPress={() => handleNavigation('/(app)/contents')}
                >
                  <Ionicons name="home-outline" size={24} color="#fff" />
                  <Text style={styles.navText}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.navItem} 
                  onPress={() => handleNavigation('/(app)/')}
                >
                  <MaterialCommunityIcons name="file-document-outline" size={24} color="#fff" />
                  <Text style={styles.navText}>Exam Papers</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.navItem} 
                  onPress={() => handleNavigation('/(app)/category/[id]', { id: '4' })}
                >
                  <Ionicons name="videocam-outline" size={24} color="#fff" />
                  <Text style={styles.navText}>Video Lectures</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.navItem} 
                  onPress={() => handleNavigation('/(app)/category/[id]', { id: '6' })}
                >
                  <MaterialIcons name="note-alt" size={24} color="#fff" />
                  <Text style={styles.navText}>Notes</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.navItem, regularItemStyle]} 
                  onPress={() => handleNavigation('/(app)/category/[id]', { id: '7' })}
                >
                  <MaterialIcons name="menu-book" size={24} color="#fff" />
                  <Text style={styles.navText}>E-Books</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.navItem} 
                  onPress={() => handleNavigation('/(app)/category/[id]', { id: '5' })}
                >
                  <MaterialIcons name="live-tv" size={24} color="#fff" />
                  <Text style={styles.navText}>Live Classes</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.navItem} 
                  onPress={() => handleNavigation('/(app)/contents')}
                >
                  <MaterialIcons name="note-alt" size={24} color="#fff" />
                  <Text style={styles.navText}>Notes</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.navItem, regularItemStyle]} 
                  onPress={() => handleNavigation('/(app)/contents')}
                >
                  <MaterialIcons name="menu-book" size={24} color="#fff" />
                  <Text style={styles.navText}>E-Books</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.navItem} 
                  onPress={() => handleNavigation('/(app)/job-alerts')}
                >
                  <MaterialIcons name="work-outline" size={24} color="#fff" />
                  <Text style={styles.navText}>Job Alerts</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Other Links */}
              <View style={styles.navigationSection}>
                <TouchableOpacity 
                  style={styles.navItem} 
                  onPress={() => handleNavigation('/(app)/saved')}
                >
                  <Ionicons name="bookmark-outline" size={24} color="#fff" />
                  <Text style={styles.navText}>Saved Items</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.navItem} 
                  onPress={() => handleNavigation('/(app)/downloads')}
                >
                  <Ionicons name="download-outline" size={24} color="#fff" />
                  <Text style={styles.navText}>Downloads</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.navItem} 
                  onPress={() => handleNavigation('/(app)/notifications')}
                >
                  <Ionicons name="notifications-outline" size={24} color="#fff" />
                  <Text style={styles.navText}>Notifications</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.navItem}
                  onPress={() => handleNavigation('/(app)/settings')}
                >
                  <Ionicons name="settings-outline" size={24} color="#fff" />
                  <Text style={styles.navText}>Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.navItem}
                  onPress={() => handleNavigation('/(app)/help-support')}
                >
                  <Ionicons name="help-circle-outline" size={24} color="#fff" />
                  <Text style={styles.navText}>Help & Support</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.navItem}
                  onPress={() => handleNavigation('/(app)/about-us')}
                >
                  <Ionicons name="information-circle-outline" size={24} color="#fff" />
                  <Text style={styles.navText}>About Us</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem}>
                  <Ionicons name="star-outline" size={24} color="#fff" />
                  <Text style={styles.navText}>Rate Us</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem}>
                  <Ionicons name="share-social-outline" size={24} color="#fff" />
                  <Text style={styles.navText}>Share App</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Logout Button */}
              <TouchableOpacity 
                style={[styles.navItem, styles.logoutButton]} 
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={24} color="#fff" />
                <Text style={styles.navText}>Logout</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '80%',
    maxWidth: 300,
  },
  drawer: {
    flex: 1,
    backgroundColor: '#6B46C1',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  profileImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileInitial: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  profileInfo: {
    marginLeft: 15,
  },
  profileName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileEmail: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 10,
  },
  navigationSection: {
    paddingHorizontal: 15,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginVertical: 2,
  },
  navText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 20,
  },
  logoutButton: {
    marginTop: 10,
    marginBottom: 30,
  },
});

export default DrawerNavigation;