import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, FlatList, Text, AppState, AppStateStatus } from 'react-native';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import TextCustom from '../components/TextCustom';
import BottomTabBar from '../components/BottomTabBar';
import { database, config } from '../../lib/appwriteConfig';
import { Query, Models } from 'react-native-appwrite';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Appwrite config constants
const DATABASE_ID = config.databaseId;
const COLLECTION_ID = '67f630fb0019582e45ac';
const BUCKET_ID = '6805d851000f17ea756f';
const PAPERS_COLLECTION_ID = '6805e9460039cc752d42';
const SIMPLE_PAPERS_COLLECTION_ID = '680b65cd002eb9c1b7a9';
const NOTIFICATIONS_COLLECTION_ID = '68060b61002f4a16927d';
const VIDEOS_COLLECTION_ID = '6825ae40002771eaf8c0';

// AsyncStorage keys
const READ_NOTIFICATIONS_KEY = 'readNotifications';
const VIDEO_COUNT_KEY = 'videoLecturesCount';

// Interface for the content category items
interface ContentCategory {
  id: string;
  title: string;
  description?: string;
  icon: string;
  count: number;
}

// Example data structure
const CONTENT_CATEGORIES: ContentCategory[] = [
  {
    id: '1',
    title: 'Exam Papers',
    description: 'Previous year question papers for all exams',
    icon: 'file-text',
    count: 0 // Will be dynamically updated
  },
  {
    id: '3',
    title: 'Mock Tests',
    description: 'Practice with mock tests and sample papers',
    icon: 'edit',
    count: 78
  },
  {
    id: '4',
    title: 'Video Lectures',
    description: 'Recorded lectures and tutorial videos',
    icon: 'video-camera',
    count: 0 // Updated to start with 0 instead of 32
  },
  {
    id: '5',
    title: 'Live Classes',
    description: 'Interactive live sessions with expert teachers',
    icon: 'play-circle',
    count: 24
  },
  {
    id: '6',
    title: 'Notes',
    description: 'Comprehensive study notes and summaries',
    icon: 'sticky-note',
    count: 156
  },
  {
    id: '7',
    title: 'E-Books',
    description: 'Digital books and study materials',
    icon: 'book',
    count: 85
  },
  {
    id: '8',
    title: 'Daily Quiz',
    description: 'Test your knowledge with daily practice quizzes',
    icon: 'question-circle',
    count: 30
  }
];

// Add this utility function at the top level
const logWithTime = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ? data : '');
};

export default function Contents() {
  const [categories, setCategories] = useState<ContentCategory[]>(CONTENT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [userReadIds, setUserReadIds] = useState<string[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    const initializeData = async () => {
      let hasCachedCount = false;
      let hasCachedVideoCount = false;
      
      // Get cached exam papers count if available
      try {
        const cachedCount = await AsyncStorage.getItem('examPapersCount');
        if (cachedCount) {
          const count = parseInt(cachedCount, 10);
          // Update the Exam Papers category with cached count
          setCategories(prev => prev.map(category => {
            if (category.id === '1') {
              return { ...category, count };
            }
            return category;
          }));
          hasCachedCount = true;
        }

        // Get cached video count if available
        const cachedVideoCount = await AsyncStorage.getItem(VIDEO_COUNT_KEY);
        if (cachedVideoCount) {
          const count = parseInt(cachedVideoCount, 10);
          // Update the Video Lectures category with cached count
          setCategories(prev => prev.map(category => {
            if (category.id === '4') {
              return { ...category, count };
            }
            return category;
          }));
          hasCachedVideoCount = true;
        }
        
        // If we have cached counts, we can show content immediately
        if (hasCachedCount || hasCachedVideoCount) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading cached counts:', error);
      }
      
      // Continue with other initializations
      loadReadNotificationsAndCheck();
      
      // If no cached counts were found, keep loading state true until fresh data is fetched
      if (!hasCachedCount && !hasCachedVideoCount) {
        setLoading(true);
      }
      
      fetchPaperCounts();
      fetchVideoCount();
    };
    
    initializeData();
    
    // Set up AppState event listener to refresh data when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && pathname === '/(app)/contents') {
        console.log('App has come to the foreground on contents page, refreshing data!');
        fetchVideoCount();
        fetchPaperCounts();
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [pathname]);

  // Fetch paper counts for dynamic display
  const fetchPaperCounts = async () => {
    // If we don't have a cached count, we need to show loading state
    if (loading) {
      // Keep loading state true
    } else {
      // Otherwise, we're just refreshing the data behind the scenes
      // No need to show loading indicator again
    }

    try {
      // Fetch total count from original papers collection
      const originalPapersResponse = await database.listDocuments(
        DATABASE_ID,
        PAPERS_COLLECTION_ID,
        [Query.limit(1)]
      );
      
      // Fetch total count from simple papers collection
      const simplePapersResponse = await database.listDocuments(
        DATABASE_ID,
        SIMPLE_PAPERS_COLLECTION_ID,
        [Query.limit(1)]
      );
      
      // Get the total count of papers from both collections
      const totalPapers = originalPapersResponse.total + simplePapersResponse.total;
      
      // Update the exam papers category count with the actual number
      const updatedCategories = categories.map(category => {
        if (category.id === '1') { // Exam Papers category
          return { ...category, count: totalPapers };
        }
        return category;
      });
      
      setCategories(updatedCategories);
      
      // Store the count in AsyncStorage for faster loading next time
      try {
        await AsyncStorage.setItem('examPapersCount', totalPapers.toString());
      } catch (storageError) {
        console.error('Error storing paper count:', storageError);
      }
    } catch (error) {
      console.error('Error fetching paper counts:', error);
    } finally {
      // Turn off loading in any case
      setLoading(false);
    }
  };

  // Update the fetchVideoCount function
  const fetchVideoCount = async () => {
    logWithTime("Starting to fetch video count");
    try {
      // Try getting count from videos collection
      const videosResponse = await database.listDocuments(
        DATABASE_ID,
        VIDEOS_COLLECTION_ID,
        [Query.limit(1)]
      );
      
      const totalVideos = videosResponse.total;
      logWithTime(`Fetched video count: ${totalVideos}`);
      
      // Update immediately with setState
      setCategories(prevCategories => 
        prevCategories.map(category => 
          category.id === '4' ? {...category, count: totalVideos} : category
        )
      );
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(VIDEO_COUNT_KEY, totalVideos.toString());
    } catch (error: any) {
      console.error('Error fetching video count:', error);
      // If error, make sure we still update the UI with 0
      setCategories(prevCategories => 
        prevCategories.map(category => 
          category.id === '4' ? {...category, count: 0} : category
        )
      );
    }
  };

  // Load read notifications and check for unread ones
  const loadReadNotificationsAndCheck = async () => {
    try {
      const storedReadIds = await AsyncStorage.getItem(READ_NOTIFICATIONS_KEY);
      if (storedReadIds) {
        const readIds = JSON.parse(storedReadIds);
        setUserReadIds(readIds);
        
        // Check for unread notifications (could fetch from Appwrite in a real implementation)
        // For this demo, we'll just set it to true
        setHasUnreadNotifications(true);
      }
    } catch (error) {
      console.error('Error loading read notifications:', error);
    }
  };

  // Handle opening the menu
  const handleMenuPress = () => {
    // This would typically open a drawer navigation or a menu modal
    console.log('Menu button pressed');
    alert('Menu button pressed');
  };

  // Handle opening notifications
  const handleNotificationsPress = () => {
    router.push('/(app)/notifications');
  };

  // Render a category item
  const renderCategoryItem = ({ item }: { item: ContentCategory }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => {
        // For Exam Papers category, navigate to the main exam papers page
        if (item.id === '1') {
          router.push('/(app)');
        } else {
          // For other categories, navigate to category detail page
          router.push({
            pathname: "/(app)/category/[id]",
            params: { id: item.id }
          });
        }
      }}
      activeOpacity={0.7}
    >
      <View style={styles.categoryIconContainer}>
        <FontAwesome name={item.icon as any} size={28} color="#6B46C1" />
      </View>
      <View style={styles.categoryContent}>
        <TextCustom style={styles.categoryTitle} fontSize={18}>{item.title}</TextCustom>
        <TextCustom style={styles.categoryDescription} fontSize={14}>{item.description}</TextCustom>
        <View style={styles.categoryFooter}>
          <TextCustom style={styles.categoryCount} fontSize={12}>
            {item.count} items
          </TextCustom>
          <FontAwesome name="chevron-right" size={14} color="#9E9E9E" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#6B46C1', '#4A23A9']}
          style={styles.header}
        >
          <View style={styles.headerLeftSection}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleMenuPress}
            >
              <Ionicons name="menu" size={24} color="#fff" />
            </TouchableOpacity>
            <TextCustom style={styles.headerTitle} fontSize={22}>PYQP</TextCustom>
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleNotificationsPress}
          >
            <Ionicons name="notifications" size={22} color="#fff" />
            {hasUnreadNotifications && (
              <View style={styles.notificationBadge}></View>
            )}
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.featuredSection}>
            <TextCustom style={styles.sectionTitle} fontSize={20}>Featured Content</TextCustom>
            <TouchableOpacity 
              style={styles.featuredCard}
              onPress={() => router.push('/(app)')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#6B46C1', '#4A23A9']}
                style={styles.featuredCardGradient}
              >
                <MaterialIcons name="auto-awesome" size={24} color="#FFD700" style={styles.featuredIcon} />
                <TextCustom style={styles.featuredTitle} fontSize={18}>Latest Exam Papers</TextCustom>
                <TextCustom style={styles.featuredSubtitle} fontSize={14}>
                  Access the most recent question papers and practice materials
                </TextCustom>
                <View style={styles.viewButton}>
                  <TextCustom style={styles.viewButtonText} fontSize={14}>
                    View Now
                  </TextCustom>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.allCategories}>
            <TextCustom style={styles.sectionTitle} fontSize={20}>All Categories</TextCustom>
            {loading ? (
              <ActivityIndicator size="large" color="#6B46C1" style={styles.loader} />
            ) : (
              <FlatList
                data={categories}
                renderItem={renderCategoryItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.categoriesList}
              />
            )}
          </View>
        </ScrollView>

        <BottomTabBar activeTab="contents" />
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    marginRight: 12,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF5A5F',
    borderWidth: 1,
    borderColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 80, // Space for bottom tab bar
  },
  loader: {
    marginTop: 40,
  },
  featuredSection: {
    padding: 15,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  featuredCard: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featuredCardGradient: {
    padding: 20,
    height: 180,
    justifyContent: 'center',
  },
  featuredIcon: {
    marginBottom: 10,
  },
  featuredTitle: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  featuredSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
  },
  viewButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  viewButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  allCategories: {
    padding: 15,
  },
  categoriesList: {
    paddingBottom: 20,
  },
  categoryCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  categoryDescription: {
    color: '#777',
    marginBottom: 8,
  },
  categoryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryCount: {
    color: '#6B46C1',
    fontWeight: '500',
  },
}); 