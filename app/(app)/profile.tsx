import React from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ImageBackground, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import BottomTabBar from '../components/BottomTabBar';
import TextCustom from '../components/TextCustom';
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function Profile() {
  const { user, signout } = useAuth();
  const router = useRouter();

  // Format date function
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header with Gradient */}
          <LinearGradient
            colors={['#6B46C1', '#8A63D2']}
            style={[styles.profileHeader, { height: 180 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.profileImageContainer}>
              <View style={styles.profileImageWrapper}>
                <FontAwesome name="user" size={45} color="#fff" />
              </View>
              <TextCustom style={styles.userName} fontSize={22}>
                {user?.name || 'User'}
              </TextCustom>
            </View>
          </LinearGradient>

          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="mail" size={20} color="#6B46C1" />
                </View>
                <View style={styles.infoTextContainer}>
                  <TextCustom style={styles.infoLabel} fontSize={14}>Email</TextCustom>
                  <TextCustom style={styles.infoValue} fontSize={16}>{user?.email || 'Not available'}</TextCustom>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <FontAwesome name="id-card" size={20} color="#6B46C1" />
                </View>
                <View style={styles.infoTextContainer}>
                  <TextCustom style={styles.infoLabel} fontSize={14}>User ID</TextCustom>
                  <TextCustom style={styles.infoValue} fontSize={16}>{user?.$id || 'Not available'}</TextCustom>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <FontAwesome name="calendar" size={20} color="#6B46C1" />
                </View>
                <View style={styles.infoTextContainer}>
                  <TextCustom style={styles.infoLabel} fontSize={14}>Joined</TextCustom>
                  <TextCustom style={styles.infoValue} fontSize={16}>
                    {formatDate(user?.$createdAt)}
                  </TextCustom>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.actionsSection}>
            <TouchableOpacity style={styles.actionButton}>
              <LinearGradient
                colors={['#007BFF', '#3395FF']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <FontAwesome name="edit" size={20} color="#FFF" style={styles.actionIcon} />
                <TextCustom style={styles.actionText} fontSize={16}>Edit Profile</TextCustom>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(app)/downloads')}
            >
              <LinearGradient
                colors={['#4CAF50', '#66BB6A']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <FontAwesome name="download" size={20} color="#FFF" style={styles.actionIcon} />
                <TextCustom style={styles.actionText} fontSize={16}>Downloads</TextCustom>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(app)/saved')}
            >
              <LinearGradient
                colors={['#FFC107', '#FFCA28']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <FontAwesome name="bookmark" size={20} color="#FFF" style={styles.actionIcon} />
                <TextCustom style={styles.actionText} fontSize={16}>Saved</TextCustom>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(app)/settings')}
            >
              <LinearGradient
                colors={['#2196F3', '#4DABF5']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="settings-sharp" size={20} color="#FFF" style={styles.actionIcon} />
                <TextCustom style={styles.actionText} fontSize={16}>Settings</TextCustom>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={signout}
            >
              <LinearGradient
                colors={['#FF3B30', '#FF6B60']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialCommunityIcons name="logout" size={20} color="#FFF" style={styles.actionIcon} />
                <TextCustom style={styles.actionText} fontSize={16}>Logout</TextCustom>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <BottomTabBar activeTab="profile" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    paddingBottom: 60, // Space for bottom tab bar
  },
  scrollContent: {
    paddingBottom: 20,
  },
  profileHeader: {
    height: 180,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  profileImageContainer: {
    alignItems: 'center',
  },
  profileImageWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  userName: {
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  infoSection: {
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    color: '#888',
    marginBottom: 2,
  },
  infoValue: {
    color: '#333',
    fontWeight: '500',
  },
  actionsSection: {
    paddingHorizontal: 20,
  },
  actionButton: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  actionIcon: {
    marginRight: 15,
  },
  actionText: {
    color: 'white',
    fontWeight: 'bold',
  },
});