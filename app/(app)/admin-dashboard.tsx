import { View, StyleSheet, ScrollView, SafeAreaView, Image, TouchableOpacity, ActivityIndicator, Alert, Text, TextInput, RefreshControl } from "react-native";
import { useAuth } from "../../context/AuthContext";
import TextCustom from "../components/TextCustom";
import AdminTabBar from "../components/AdminTabBar";
import React, { useState, useEffect } from "react";
import { database, storage } from "../../lib/appwriteConfig";
import { Query, Models } from "react-native-appwrite";
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Appwrite config constants
const DATABASE_ID = '67f3615a0027484c95d5';
const COLLECTION_ID = '67f630fb0019582e45ac';
const BUCKET_ID = '6805d851000f17ea756f';
const PAPERS_COLLECTION_ID = '6805e9460039cc752d42';
const NOTIFICATIONS_COLLECTION_ID = '68060b61002f4a16927d';

// AsyncStorage key for read notifications
const READ_NOTIFICATIONS_KEY = 'readNotifications';

// Define the exam document type
interface ExamDocument extends Models.Document {
  name: string;
  description?: string;
  iconId?: string;
  createdAt: string;
  updatedAt: string;
}

// Define the paper document type
interface PaperDocument extends Models.Document {
  examId: string;
  paperName: string;
  year: string;
  description?: string;
  fileId: string;
  fileName: string;
  fileType: string;
  createdAt: string;
}

// Define notification type
interface Notification extends Models.Document {
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type: 'exam' | 'paper' | 'system' | 'welcome';
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [exams, setExams] = useState<ExamDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [iconUrls, setIconUrls] = useState<Record<string, string>>({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchExams();
    fetchUnreadNotificationsCount();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchUnreadNotificationsCount();
    }, [])
  );

  const fetchExams = async () => {
    setLoading(true);
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [Query.orderDesc('$createdAt')]
      );
      
      const examDocs = response.documents as ExamDocument[];
      setExams(examDocs);
      
      // Load icon URLs for exams that have icons
      const urls: Record<string, string> = {};
      for (const exam of examDocs) {
        if (exam.iconId) {
          try {
            const fileUrl = await storage.getFileView(BUCKET_ID, exam.iconId);
            urls[exam.iconId] = fileUrl.href;
          } catch (error) {
            console.error(`Error loading icon for exam ${exam.$id}:`, error);
          }
        }
      }
      setIconUrls(urls);
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadNotificationsCount = async () => {
    try {
      // Fetch all notifications
      const response = await database.listDocuments(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION_ID,
        [Query.equal('isRead', false)]
      );
      
      // Set unread count
      setUnreadCount(response.total);
    } catch (error) {
      console.error('Error fetching unread notifications count:', error);
      // Silently fail - we don't want to show an error for this
    }
  };

  const handleExamPress = (examId: string) => {
    // Navigate to exam details page for admins
    router.push({
      pathname: "/exams/[id]",
      params: { id: examId }
    });
  };

  const handleAddExam = () => {
    router.push('/manage-exams/add');
  };

  const navigateToNotifications = () => {
    router.push('/(app)/notifications');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchExams(),
        fetchUnreadNotificationsCount()
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6B46C1']}
              tintColor={'#6B46C1'}
            />
          }
        >
          <LinearGradient
            colors={['#6B46C1', '#4A23A9']}
            style={styles.welcomeCard}
          >
            <View style={styles.welcomeCardOverlay}>
              <MaterialCommunityIcons name="crown" size={30} color="#ffffff80" style={styles.welcomeIcon} />
              <TextCustom style={styles.welcomeText} fontSize={24}>
                Welcome back, {user?.name || 'Admin'}!
              </TextCustom>
              <TextCustom style={styles.welcomeSubText} fontSize={14}>
                Manage your exams and papers
              </TextCustom>
            </View>
          </LinearGradient>

          {/* Search Bar */}
          <View style={styles.searchBarContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search exams and papers..."
                placeholderTextColor="#999"
                onChangeText={(text) => console.log(text)}
              />
            </View>
          </View>

          {/* Exams Section */}
          <View style={styles.examsSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="school" size={22} color="#6B46C1" />
                <TextCustom style={styles.sectionTitle} fontSize={20}>
                  Exams
                </TextCustom>
              </View>
              
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => router.push("/(app)/all-exams")}
                activeOpacity={0.7}
              >
                <TextCustom style={styles.viewAllText} fontSize={14}>
                  View All
                </TextCustom>
                <Ionicons name="chevron-forward" size={16} color="#6B46C1" />
              </TouchableOpacity>
            </View>
            
            {loading ? (
              <ActivityIndicator size="large" color="#6B46C1" style={styles.loader} />
            ) : exams.length === 0 ? (
              <View style={styles.emptyContainer}>
                <FontAwesome name="graduation-cap" size={50} color="#ccc" />
                <TextCustom style={styles.emptyText} fontSize={16}>No exams available yet</TextCustom>
                <TextCustom style={styles.subEmptyText} fontSize={14}>Add your first exam to get started</TextCustom>
              </View>
            ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalExamsContainer}
              >
                {exams.map((exam) => (
                  <TouchableOpacity 
                    key={exam.$id} 
                    style={styles.examCardHorizontal}
                    onPress={() => handleExamPress(exam.$id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.examLogoContainerSmall}>
                      {exam.iconId && iconUrls[exam.iconId] ? (
                        <Image 
                          source={{ uri: iconUrls[exam.iconId] }} 
                          style={styles.examLogoSmall} 
                          resizeMode="cover"
                        />
                      ) : (
                        <LinearGradient
                          colors={['#7E57C2', '#5E35B1']}
                          style={styles.fallbackLogoGradient}
                        >
                          <FontAwesome name="graduation-cap" size={20} color="#fff" />
                        </LinearGradient>
                      )}
                      <View style={styles.editBadge}>
                        <FontAwesome name="pencil" size={8} color="#FFF" />
                      </View>
                    </View>
                    <TextCustom style={styles.examNameSmall} fontSize={12}>
                      {exam.name}
                    </TextCustom>
                  </TouchableOpacity>
                ))}
                
                {/* Add New Exam Button */}
                <TouchableOpacity 
                  style={styles.addExamCard}
                  onPress={handleAddExam}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#28a745', '#1e7e34']}
                    style={styles.addExamIconContainer}
                  >
                    <FontAwesome name="plus" size={20} color="#fff" />
                  </LinearGradient>
                  <TextCustom style={styles.addExamText} fontSize={12}>
                    Add Exam
                  </TextCustom>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>

          {/* Content Management Section */}
          <View style={styles.papersSection}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="settings" size={22} color="#6B46C1" />
              <TextCustom style={styles.sectionTitle} fontSize={20}>
                Content Management
              </TextCustom>
            </View>
            
            <View style={styles.adminActionCards}>
              <TouchableOpacity
                style={[styles.adminActionCard, { width: '100%' }]}
                onPress={() => router.push('/(app)/manage-exams/add')}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#4CAF50', '#388E3C']}
                  style={styles.adminActionIconContainer}
                >
                  <Ionicons name="add-circle" size={24} color="#fff" />
                </LinearGradient>
                <TextCustom style={styles.adminActionText} fontSize={14}>
                  Add Exams
                </TextCustom>
              </TouchableOpacity>
            </View>

            <View style={styles.adminActionCards}>
              <TouchableOpacity
                style={styles.adminActionCard}
                onPress={() => router.push('/(app)/notifications')}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#6B46C1', '#4A23A9']}
                  style={styles.adminActionIconContainer}
                >
                  <Ionicons name="notifications" size={24} color="#fff" />
                </LinearGradient>
                <TextCustom style={styles.adminActionText} fontSize={14}>
                  Manage Notifications
                </TextCustom>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adminActionCard}
                onPress={() => router.push('/(app)/manage-papers/all-papers')}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#dc3545', '#c82333']}
                  style={styles.adminActionIconContainer}
                >
                  <FontAwesome name="file-pdf-o" size={24} color="#fff" />
                </LinearGradient>
                <TextCustom style={styles.adminActionText} fontSize={14}>
                  Manage Papers
                </TextCustom>
              </TouchableOpacity>
            </View>

            <View style={styles.adminActionCards}>
              <TouchableOpacity
                style={styles.adminActionCard}
                onPress={() => router.push('/(app)/manage-jobs')}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#2196F3', '#1976D2']}
                  style={styles.adminActionIconContainer}
                >
                  <Ionicons name="briefcase" size={24} color="#fff" />
                </LinearGradient>
                <TextCustom style={styles.adminActionText} fontSize={14}>
                  Manage Job Updates
                </TextCustom>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adminActionCard}
                onPress={() => router.push({
                  pathname: "/(app)/manage-books"
                })}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#9C27B0', '#7B1FA2']}
                  style={styles.adminActionIconContainer}
                >
                  <FontAwesome name="book" size={24} color="#fff" />
                </LinearGradient>
                <TextCustom style={styles.adminActionText} fontSize={14}>
                  Manage Books
                </TextCustom>
              </TouchableOpacity>
            </View>
          </View>

          {/* User Management Section */}
          <View style={styles.papersSection}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="people" size={22} color="#1976D2" />
              <TextCustom style={styles.sectionTitle} fontSize={20}>
                User Management
              </TextCustom>
            </View>
            
            <View style={styles.adminActionCards}>
              <TouchableOpacity
                style={styles.adminActionCard}
                onPress={() => Alert.alert('User Management', 'View and manage system users')}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#1976D2', '#1565C0']}
                  style={styles.adminActionIconContainer}
                >
                  <Ionicons name="people" size={24} color="#fff" />
                </LinearGradient>
                <TextCustom style={styles.adminActionText} fontSize={14}>
                  Users
                </TextCustom>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adminActionCard}
                onPress={() => Alert.alert('Add User', 'Create new user accounts')}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#4CAF50', '#388E3C']}
                  style={styles.adminActionIconContainer}
                >
                  <Ionicons name="person-add" size={24} color="#fff" />
                </LinearGradient>
                <TextCustom style={styles.adminActionText} fontSize={14}>
                  Add User
                </TextCustom>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        
        <AdminTabBar activeTab="home" />
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
    paddingBottom: 60, // Space for bottom tab bar
  },
  welcomeCard: {
    padding: 20,
    paddingVertical: 25,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    alignItems: 'center',
  },
  welcomeCardOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeIcon: {
    marginBottom: 10,
  },
  welcomeText: {
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  welcomeSubText: {
    color: '#FFF',
    textAlign: 'center',
  },
  examsSection: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginLeft: 10,
  },
  examsGrid: {
    marginTop: 10,
  },
  examsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  examCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyCard: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  examLogoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  examLogo: {
    width: '100%',
    height: '100%',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6B46C1',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  examName: {
    fontWeight: '500',
    textAlign: 'center',
  },
  loader: {
    marginVertical: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginVertical: 20,
  },
  emptyText: {
    color: '#666',
    marginTop: 10,
  },
  subEmptyText: {
    color: '#999',
    marginTop: 5,
  },
  horizontalExamsContainer: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  examCardHorizontal: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginRight: 12,
    width: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  examLogoContainerSmall: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  fallbackLogoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 23,
  },
  examLogoSmall: {
    width: '100%',
    height: '100%',
  },
  examNameSmall: {
    fontWeight: '500',
    textAlign: 'center',
    fontSize: 12,
  },
  addExamCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginRight: 12,
    width: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addExamIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#6B46C1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  addExamText: {
    fontWeight: 'bold',
    color: '#6B46C1',
    textAlign: 'center',
    fontSize: 12,
  },
  papersSection: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  adminActionCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  adminActionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  adminActionIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#6B46C1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  adminActionText: {
    fontWeight: 'bold',
    color: '#6B46C1',
    textAlign: 'center',
    fontSize: 14,
  },
  notificationButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 10,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF5A5F',
    borderWidth: 1,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
    marginTop: -20,
    zIndex: 5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 24,
    padding: 0,
    fontSize: 14,
    color: '#333',
  },
  filterButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    marginLeft: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(107, 70, 193, 0.08)',
    marginLeft: 'auto',
  },
  viewAllText: {
    fontWeight: '600',
    color: '#6B46C1',
    marginRight: 4,
  },
}); 