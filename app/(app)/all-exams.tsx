import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  SafeAreaView,
  Text,
  TextInput
} from 'react-native';
import { router } from 'expo-router';
import TextCustom from '../components/TextCustom';
import BottomTabBar from '../components/BottomTabBar';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { database, storage } from '../../lib/appwriteConfig';
import { Query, Models } from 'react-native-appwrite';
import { LinearGradient } from 'expo-linear-gradient';

// Appwrite config constants
const DATABASE_ID = '67f3615a0027484c95d5';
const COLLECTION_ID = '67f630fb0019582e45ac';
const BUCKET_ID = '6805d851000f17ea756f';

// Define the exam document type
interface ExamDocument extends Models.Document {
  name: string;
  description?: string;
  iconId?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AllExams() {
  const [exams, setExams] = useState<ExamDocument[]>([]);
  const [filteredExams, setFilteredExams] = useState<ExamDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [iconUrls, setIconUrls] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAllExams();
  }, []);

  useEffect(() => {
    // Filter exams based on search query
    if (searchQuery.trim() === '') {
      setFilteredExams(exams);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = exams.filter(exam => 
        exam.name.toLowerCase().includes(query) || 
        (exam.description && exam.description.toLowerCase().includes(query))
      );
      setFilteredExams(filtered);
    }
  }, [searchQuery, exams]);

  const fetchAllExams = async () => {
    setLoading(true);
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [Query.orderAsc('name')]
      );
      
      const examDocs = response.documents as ExamDocument[];
      setExams(examDocs);
      setFilteredExams(examDocs);
      
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

  const handleExamPress = (examId: string) => {
    // Navigate to exam details page
    router.push({
      pathname: "/exams/[id]",
      params: { id: examId }
    });
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
          <TextCustom style={styles.headerTitle}>All Exams</TextCustom>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBarContainer}>
            <FontAwesome name="search" size={16} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exams..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery('')}
              >
                <FontAwesome name="times-circle" size={16} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#6B46C1" style={styles.loader} />
        ) : exams.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="graduation-cap" size={50} color="#ccc" />
            <TextCustom style={styles.emptyText} fontSize={16}>No exams available yet</TextCustom>
          </View>
        ) : filteredExams.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="search" size={50} color="#ccc" />
            <TextCustom style={styles.emptyText} fontSize={16}>
              No exams found matching "{searchQuery}"
            </TextCustom>
            <TouchableOpacity
              style={styles.resetSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <TextCustom style={styles.resetSearchText}>Clear Search</TextCustom>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={styles.scrollView}>
            <View style={styles.examsGrid}>
              {filteredExams.map((exam) => (
                <TouchableOpacity 
                  key={exam.$id} 
                  style={styles.examCard}
                  onPress={() => handleExamPress(exam.$id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.examLogoContainer}>
                    {exam.iconId && iconUrls[exam.iconId] ? (
                      <Image 
                        source={{ uri: iconUrls[exam.iconId] }} 
                        style={styles.examLogo} 
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={['#7E57C2', '#5E35B1']}
                        style={styles.fallbackLogoGradient}
                      >
                        <FontAwesome name="graduation-cap" size={28} color="#fff" />
                      </LinearGradient>
                    )}
                  </View>
                  <TextCustom style={styles.examName} fontSize={16}>
                    {exam.name}
                  </TextCustom>
                  {exam.description ? (
                    <Text 
                      style={styles.examDescription}
                      numberOfLines={2}
                    >
                      {exam.description}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        <BottomTabBar activeTab="home" />
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
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  examsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  examCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  examLogoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  fallbackLogoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  examLogo: {
    width: '100%',
    height: '100%',
  },
  examName: {
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 6,
  },
  examDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
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
    marginTop: 10,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 36,
    fontSize: 15,
    color: '#333',
    padding: 0,
    fontFamily: 'System',
  },
  clearSearchButton: {
    padding: 6,
  },
  resetSearchButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  resetSearchText: {
    fontSize: 14,
    color: '#6B46C1',
    fontWeight: '500',
  },
}); 