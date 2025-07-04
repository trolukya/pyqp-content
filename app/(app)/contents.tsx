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
import Header from '../components/Header';
import DrawerNavigation from '../components/DrawerNavigation';

// Appwrite config constants
const DATABASE_ID = config.databaseId;
const COLLECTION_ID = '67f630fb0019582e45ac';
const BUCKET_ID = '6805d851000f17ea756f';
const PAPERS_COLLECTION_ID = '6805e9460039cc752d42';
const SIMPLE_PAPERS_COLLECTION_ID = '680b65cd002eb9c1b7a9';
const NOTIFICATIONS_COLLECTION_ID = '68060b61002f4a16927d';
const VIDEOS_COLLECTION_ID = '6825ae40002771eaf8c0';
const BOOKS_COLLECTION_ID = '682710e0002c728483e2'; // E-Books collection
const NOTES_COLLECTION_ID = '682d9ac0001b401b3121'; // Notes collection
const QUIZZES_COLLECTION_ID = '6826e04b002731aaf7f4'; // Daily Quiz collection
const LIVE_CLASSES_COLLECTION_ID = '6805e9460039cc752d42'; // Using a placeholder, replace with actual ID

// AsyncStorage keys
const READ_NOTIFICATIONS_KEY = 'readNotifications';
const VIDEO_COUNT_KEY = 'videoLecturesCount';
const BOOKS_COUNT_KEY = 'eBooksCount';
const NOTES_COUNT_KEY = 'notesCount';
const QUIZZES_COUNT_KEY = 'dailyQuizCount';
const LIVE_CLASSES_COUNT_KEY = 'liveClassesCount';

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
    id: '4',
    title: 'Video Lectures',
    description: 'Recorded lectures and tutorial videos',
    icon: 'video-camera',
    count: 0 // Will be dynamically updated
  },
  {
    id: '5',
    title: 'Live Classes',
    description: 'Interactive live sessions with expert teachers',
    icon: 'play-circle',
    count: 0 // Will be dynamically updated
  },
  {
    id: '6',
    title: 'Notes',
    description: 'Comprehensive study notes and summaries',
    icon: 'sticky-note',
    count: 0 // Will be dynamically updated
  },
  {
    id: '7',
    title: 'E-Books',
    description: 'Digital books and study materials',
    icon: 'book',
    count: 0 // Will be dynamically updated
  },
  {
    id: '8',
    title: 'Daily Quiz',
    description: 'Test your knowledge with daily practice quizzes',
    icon: 'question-circle',
    count: 0 // Will be dynamically updated
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const initializeData = async () => {
      let hasCachedData = false;
      
      // Load cached counts for all categories
      try {
        // Exam Papers
        const cachedPapersCount = await AsyncStorage.getItem('examPapersCount');
        if (cachedPapersCount) {
          const count = parseInt(cachedPapersCount, 10);
          updateCategoryCount('1', count);
          hasCachedData = true;
        }

        // Video Lectures
        const cachedVideoCount = await AsyncStorage.getItem(VIDEO_COUNT_KEY);
        if (cachedVideoCount) {
          const count = parseInt(cachedVideoCount, 10);
          updateCategoryCount('4', count);
          hasCachedData = true;
        }
        
        // Live Classes
        const cachedLiveClassesCount = await AsyncStorage.getItem(LIVE_CLASSES_COUNT_KEY);
        if (cachedLiveClassesCount) {
          const count = parseInt(cachedLiveClassesCount, 10);
          updateCategoryCount('5', count);
          hasCachedData = true;
        }
        
        // Notes
        const cachedNotesCount = await AsyncStorage.getItem(NOTES_COUNT_KEY);
        if (cachedNotesCount) {
          const count = parseInt(cachedNotesCount, 10);
          updateCategoryCount('6', count);
          hasCachedData = true;
        }
        
        // E-Books
        const cachedBooksCount = await AsyncStorage.getItem(BOOKS_COUNT_KEY);
        if (cachedBooksCount) {
          const count = parseInt(cachedBooksCount, 10);
          updateCategoryCount('7', count);
          hasCachedData = true;
        }
        
        // Daily Quiz
        const cachedQuizzesCount = await AsyncStorage.getItem(QUIZZES_COUNT_KEY);
        if (cachedQuizzesCount) {
          const count = parseInt(cachedQuizzesCount, 10);
          updateCategoryCount('8', count);
          hasCachedData = true;
        }
        
        // If we have cached counts, we can show content immediately
        if (hasCachedData) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading cached counts:', error);
      }
      
      // Continue with other initializations
      loadReadNotificationsAndCheck();
      
      // If no cached counts were found, keep loading state true until fresh data is fetched
      if (!hasCachedData) {
        setLoading(true);
      }
      
      // Fetch all category counts
      fetchAllCounts();
    };
    
    initializeData();
    
    // Set up AppState event listener to refresh data when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && pathname === '/(app)/contents') {
        console.log('App has come to the foreground on contents page, refreshing data!');
        fetchAllCounts();
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [pathname]);
  
  // Helper function to update a category count
  const updateCategoryCount = (categoryId: string, count: number) => {
    setCategories(prev => prev.map(category => {
      if (category.id === categoryId) {
        return { ...category, count };
      }
      return category;
    }));
  };
  
  // Fetch all category counts
  const fetchAllCounts = async () => {
    fetchPaperCounts();
    fetchVideoCount();
    fetchLiveClassesCount();
    fetchNotesCount();
    fetchBooksCount();
    fetchQuizzesCount();
  };

  // Update the fetchPaperCounts function
  const fetchPaperCounts = async () => {
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
      
      // Update the exam papers category count
      updateCategoryCount('1', totalPapers);
      
      // Store the count in AsyncStorage for faster loading next time
      try {
        await AsyncStorage.setItem('examPapersCount', totalPapers.toString());
      } catch (storageError) {
        console.error('Error storing paper count:', storageError);
      }
    } catch (error) {
      console.error('Error fetching paper counts:', error);
    } finally {
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
      
      // Update the video lectures category count
      updateCategoryCount('4', totalVideos);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(VIDEO_COUNT_KEY, totalVideos.toString());
    } catch (error: any) {
      console.error('Error fetching video count:', error);
      // If error, make sure we still update the UI with 0
      updateCategoryCount('4', 0);
    }
  };
  
  // Fetch Live Classes count
  const fetchLiveClassesCount = async () => {
    try {
      // Get count from live classes collection
      const liveClassesResponse = await database.listDocuments(
        DATABASE_ID,
        LIVE_CLASSES_COLLECTION_ID,
        [Query.limit(1)]
      );
      
      const totalLiveClasses = liveClassesResponse.total;
      
      // Update the live classes category count
      updateCategoryCount('5', totalLiveClasses);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(LIVE_CLASSES_COUNT_KEY, totalLiveClasses.toString());
    } catch (error) {
      console.error('Error fetching live classes count:', error);
      // For now, keep the default count
    }
  };
  
  // Fetch Notes count
  const fetchNotesCount = async () => {
    try {
      // Get count from notes collection
      const notesResponse = await database.listDocuments(
        DATABASE_ID,
        NOTES_COLLECTION_ID,
        [Query.limit(1)]
      );
      
      const totalNotes = notesResponse.total;
      
      // Update the notes category count
      updateCategoryCount('6', totalNotes);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(NOTES_COUNT_KEY, totalNotes.toString());
    } catch (error) {
      console.error('Error fetching notes count:', error);
      // For now, keep the default count
    }
  };
  
  // Fetch E-Books count
  const fetchBooksCount = async () => {
    try {
      // Get count from books collection
      const booksResponse = await database.listDocuments(
        DATABASE_ID,
        BOOKS_COLLECTION_ID,
        [Query.limit(1)]
      );
      
      const totalBooks = booksResponse.total;
      
      // Update the e-books category count
      updateCategoryCount('7', totalBooks);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(BOOKS_COUNT_KEY, totalBooks.toString());
    } catch (error) {
      console.error('Error fetching books count:', error);
      // For now, keep the default count
    }
  };
  
  // Fetch Daily Quiz count
  const fetchQuizzesCount = async () => {
    try {
      // Get count from quizzes collection
      const quizzesResponse = await database.listDocuments(
        DATABASE_ID,
        QUIZZES_COLLECTION_ID,
        [Query.limit(1)]
      );
      
      const totalQuizzes = quizzesResponse.total;
      
      // Update the daily quiz category count
      updateCategoryCount('8', totalQuizzes);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(QUIZZES_COUNT_KEY, totalQuizzes.toString());
    } catch (error) {
      console.error('Error fetching quizzes count:', error);
      // For now, keep the default count
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

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
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
          {item.id !== '5' && (
            <TextCustom style={styles.categoryCount} fontSize={12}>
              {item.count} items
            </TextCustom>
          )}
          <FontAwesome name="chevron-right" size={14} color="#9E9E9E" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
      <View style={styles.container}>
      <Header onMenuPress={toggleDrawer} />
      <DrawerNavigation isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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