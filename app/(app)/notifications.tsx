import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  SafeAreaView,
  Text,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import { router } from 'expo-router';
import TextCustom from '../components/TextCustom';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { database } from '../../lib/appwriteConfig';
import { Query, Models, ID } from 'react-native-appwrite';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Appwrite config constants
const DATABASE_ID = '67f3615a0027484c95d5';
// Real collection ID for notifications
const NOTIFICATIONS_COLLECTION_ID = '68060b61002f4a16927d'; 

// Key for AsyncStorage
const READ_NOTIFICATIONS_KEY = 'readNotifications';

// Mock notifications for demo - will be replaced with real data
const MOCK_NOTIFICATIONS = [
  {
    $id: '1',
    title: 'New Exam Added',
    message: 'APSC exam has been added to the system.',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    isRead: false,
    type: 'exam'
  },
  {
    $id: '2',
    title: 'New Paper Uploaded',
    message: 'A new paper has been uploaded for ADRE exam.',
    createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    isRead: true,
    type: 'paper'
  },
  {
    $id: '3',
    title: 'System Update',
    message: 'The system will be under maintenance tomorrow from 2-4 PM.',
    createdAt: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
    isRead: false,
    type: 'system'
  },
  {
    $id: '4',
    title: 'Welcome to ExamPrep!',
    message: 'Thank you for joining our platform. Start exploring exam papers now!',
    createdAt: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
    isRead: true,
    type: 'welcome'
  }
];

// Define notification type
interface Notification extends Models.Document {
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type: 'exam' | 'paper' | 'system' | 'welcome';
}

interface NewNotification {
  title: string;
  message: string;
  type: 'exam' | 'paper' | 'system' | 'welcome';
}

export default function NotificationsScreen() {
  const { user, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [userReadIds, setUserReadIds] = useState<string[]>([]);
  const [newNotification, setNewNotification] = useState<NewNotification>({
    title: '',
    message: '',
    type: 'system'
  });

  // Load user's read notification IDs from storage
  useEffect(() => {
    const loadReadNotifications = async () => {
      try {
        const storedIds = await AsyncStorage.getItem(READ_NOTIFICATIONS_KEY);
        if (storedIds) {
          setUserReadIds(JSON.parse(storedIds));
        }
      } catch (error) {
        console.error('Error loading read notifications from storage:', error);
      }
    };
    
    loadReadNotifications();
  }, []);

  // Fetch notifications from database  
  useEffect(() => {
    fetchNotifications();
  }, [userReadIds]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // Fetch from real Appwrite collection
      const response = await database.listDocuments(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION_ID,
        [Query.orderDesc('createdAt')]
      );
      
      // Apply local read status for regular users
      if (!isAdmin) {
        const notificationsWithLocalReadStatus = response.documents.map((notification) => {
          const isReadLocally = userReadIds.includes(notification.$id);
          return {
            ...notification,
            isRead: notification.isRead || isReadLocally
          };
        });
        
        setNotifications(notificationsWithLocalReadStatus as Notification[]);
      } else {
        // Admin sees the actual database status
        setNotifications(response.documents as Notification[]);
      }
      
      // Fallback to mock data if no notifications are found
      if (response.documents.length === 0 && isAdmin) {
        setNotifications(MOCK_NOTIFICATIONS as Notification[]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Use mock data as fallback if there's an error
      if (isAdmin) {
        setNotifications(MOCK_NOTIFICATIONS as Notification[]);
      }
      Alert.alert('Error', 'Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Save read notification IDs to AsyncStorage
  const saveReadNotifications = async (ids: string[]) => {
    try {
      await AsyncStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error('Error saving read notifications to storage:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      // For regular users, store in AsyncStorage
      if (!isAdmin) {
        const updatedReadIds = [...userReadIds, notificationId];
        setUserReadIds(updatedReadIds);
        saveReadNotifications(updatedReadIds);
      } else {
        // Admin can update the database
        await database.updateDocument(
          DATABASE_ID,
          NOTIFICATIONS_COLLECTION_ID,
          notificationId,
          { isRead: true }
        );
      }
      
      // Update local state for everyone
      setNotifications(prev => 
        prev.map(notification => 
          notification.$id === notificationId 
            ? { ...notification, isRead: true } 
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Still update the UI even if the database update fails
      setNotifications(prev => 
        prev.map(notification => 
          notification.$id === notificationId 
            ? { ...notification, isRead: true } 
            : notification
        )
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      const unreadIds = unreadNotifications.map(n => n.$id);
      
      if (!isAdmin) {
        // For regular users, store all notification IDs as read in AsyncStorage
        const updatedReadIds = [...new Set([...userReadIds, ...unreadIds])];
        setUserReadIds(updatedReadIds);
        saveReadNotifications(updatedReadIds);
      } else {
        // Admin can update the database
        for (const notification of unreadNotifications) {
          await database.updateDocument(
            DATABASE_ID,
            NOTIFICATIONS_COLLECTION_ID,
            notification.$id,
            { isRead: true }
          );
        }
      }
      
      // Update local state for everyone
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      
      // Still update the UI even if the database update fails
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      
      Alert.alert('Success', 'All notifications marked as read');
    }
  };

  const handleAddNotification = async () => {
    // Validate form
    if (!newNotification.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    
    if (!newNotification.message.trim()) {
      Alert.alert('Error', 'Message is required');
      return;
    }
    
    setIsSending(true);
    
    try {
      // Send to Appwrite collection
      const response = await database.createDocument(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION_ID,
        ID.unique(),
        {
          title: newNotification.title,
          message: newNotification.message,
          type: newNotification.type,
          createdAt: new Date().toISOString(),
          isRead: false
        }
      );
      
      // Add the new notification to our local state
      setNotifications(prev => [response as Notification, ...prev]);
      
      // Reset form and close modal
      setNewNotification({
        title: '',
        message: '',
        type: 'system'
      });
      
      setIsModalVisible(false);
      Alert.alert('Success', 'Notification sent successfully!');
    } catch (error) {
      console.error('Error sending notification:', error);
      Alert.alert('Error', 'Failed to send notification. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'exam':
        return <Ionicons name="school" size={24} color="#6B46C1" />;
      case 'paper':
        return <Ionicons name="document-text" size={24} color="#4CAF50" />;
      case 'system':
        return <Ionicons name="settings" size={24} color="#2196F3" />;
      case 'welcome':
        return <Ionicons name="happy" size={24} color="#FF9800" />;
      default:
        return <Ionicons name="notifications" size={24} color="#6B46C1" />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={20} color="#333" />
          </TouchableOpacity>
          <TextCustom style={styles.headerTitle}>Manage Notifications</TextCustom>
          
          {isAdmin && (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setIsModalVisible(true)}
            >
              <Ionicons name="add-circle-outline" size={24} color="#6B46C1" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#6B46C1" style={styles.loader} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off" size={60} color="#ccc" />
            <TextCustom style={styles.emptyText} fontSize={16}>No notifications</TextCustom>
            <TextCustom style={styles.emptySubText} fontSize={14}>
              You're all caught up!
            </TextCustom>
            
            {isAdmin && (
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => setIsModalVisible(true)}
              >
                <Text style={styles.createButtonText}>Create Notification</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <ScrollView style={styles.scrollView}>
            {notifications.some(notification => !notification.isRead) && (
              <TouchableOpacity 
                style={styles.markAllReadButton}
                onPress={handleMarkAllAsRead}
              >
                <Text style={styles.markAllReadButtonText}>Mark all as read</Text>
              </TouchableOpacity>
            )}
            
            {isAdmin && (
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => setIsModalVisible(true)}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" style={styles.createButtonIcon} />
                <Text style={styles.createButtonText}>Create New Notification</Text>
              </TouchableOpacity>
            )}
            
            {notifications.map((notification) => (
              <TouchableOpacity 
                key={notification.$id} 
                style={[
                  styles.notificationCard,
                  !notification.isRead && styles.unreadNotification
                ]}
                onPress={() => handleMarkAsRead(notification.$id)}
                activeOpacity={0.7}
              >
                <View style={styles.notificationIconContainer}>
                  {getNotificationIcon(notification.type)}
                </View>
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <TextCustom style={styles.notificationTitle} fontSize={16}>
                      {notification.title}
                    </TextCustom>
                    <Text style={styles.notificationTime}>
                      {formatDate(notification.createdAt)}
                    </Text>
                  </View>
                  <Text style={styles.notificationMessage}>
                    {notification.message}
                  </Text>
                </View>
                {!notification.isRead && (
                  <View style={styles.unreadIndicator} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Add Notification Modal */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TextCustom style={styles.modalTitle}>Create Notification</TextCustom>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalScrollView}>
                {/* Notification Type */}
                <View style={styles.formGroup}>
                  <TextCustom style={styles.label}>Notification Type</TextCustom>
                  <View style={styles.typeButtonsContainer}>
                    {['system', 'exam', 'paper', 'welcome'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeButton,
                          newNotification.type === type && styles.activeTypeButton
                        ]}
                        onPress={() => setNewNotification(prev => ({
                          ...prev,
                          type: type as 'exam' | 'paper' | 'system' | 'welcome'
                        }))}
                      >
                        <View style={styles.typeButtonIcon}>
                          {getNotificationIcon(type)}
                        </View>
                        <Text style={[
                          styles.typeButtonText,
                          newNotification.type === type && styles.activeTypeButtonText
                        ]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                {/* Title */}
                <View style={styles.formGroup}>
                  <TextCustom style={styles.label}>Title*</TextCustom>
                  <TextInput
                    style={styles.input}
                    value={newNotification.title}
                    onChangeText={(text) => setNewNotification(prev => ({
                      ...prev,
                      title: text
                    }))}
                    placeholder="Enter notification title"
                    placeholderTextColor="#999"
                  />
                </View>
                
                {/* Message */}
                <View style={styles.formGroup}>
                  <TextCustom style={styles.label}>Message*</TextCustom>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={newNotification.message}
                    onChangeText={(text) => setNewNotification(prev => ({
                      ...prev,
                      message: text
                    }))}
                    placeholder="Enter notification message"
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
                
                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitButton, isSending && styles.disabledButton]}
                  onPress={handleAddNotification}
                  disabled={isSending}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send" size={18} color="#fff" />
                      <TextCustom style={styles.submitButtonText}>
                        Send Notification
                      </TextCustom>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  addButton: {
    padding: 8,
  },
  markAllReadButton: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  markAllReadButtonText: {
    color: '#6B46C1',
    fontWeight: '600',
    fontSize: 14,
  },
  createButton: {
    backgroundColor: '#6B46C1',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  createButtonIcon: {
    marginRight: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: '#F0EAFE',
  },
  notificationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  notificationTitle: {
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6B46C1',
    marginLeft: 8,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#666',
    marginTop: 16,
    fontWeight: 'bold',
  },
  emptySubText: {
    color: '#888',
    marginTop: 8,
    marginBottom: 24,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalScrollView: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  typeButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 5,
    marginBottom: 10,
    width: '46%',
  },
  activeTypeButton: {
    borderColor: '#6B46C1',
    backgroundColor: '#F0EAFE',
  },
  typeButtonIcon: {
    marginRight: 8,
  },
  typeButtonText: {
    color: '#666',
  },
  activeTypeButtonText: {
    color: '#6B46C1',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#6B46C1',
    borderRadius: 6,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
    marginLeft: 8,
  },
}); 