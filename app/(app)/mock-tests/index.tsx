import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import { router } from 'expo-router';
import TextCustom from '../../components/TextCustom';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { database, storage, config } from '../../../lib/appwriteConfig';
import { Models, Query } from 'react-native-appwrite';
import { useAuth } from '../../../context/AuthContext';

// Appwrite config constants
const DATABASE_ID = config.databaseId;
const TESTS_COLLECTION_ID = config.collections.tests;
const EXAMS_COLLECTION_ID = config.collections.exams;
const BUCKET_ID = '6805d851000f17ea756f';

// Define interfaces
interface Test extends Models.Document {
  title: string;
  description?: string;
  examId?: string;
  fileId?: string;
  fileName?: string;
  coverId?: string;
  createdAt: string;
  uploadedBy: string;
  author: string;
  views: number;
  downloads: number;
  isActive: boolean;
  duration: number;
  questions: number;
  marks: number;
  hasQuestions: boolean;
}

// Define Exam interface
interface Exam extends Models.Document {
  name: string;
  // Add any other exam properties here
}

export default function MockTestsScreen() {
  const { session, isAdmin } = useAuth();
  
  // State variables
  const [tests, setTests] = useState<Test[]>([]);
  const [exams, setExams] = useState<{[key: string]: Exam}>({});
  const [loading, setLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  
  useEffect(() => {
    fetchExams();
    fetchTests();
  }, []);
  
  // Fetch all exams
  const fetchExams = async () => {
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        EXAMS_COLLECTION_ID
      );
      
      const examsMap: {[key: string]: Exam} = {};
      response.documents.forEach(exam => {
        examsMap[exam.$id] = exam as Exam;
      });
      
      setExams(examsMap);
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };
  
  // Fetch available tests
  const fetchTests = async () => {
    setLoading(true);
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        TESTS_COLLECTION_ID,
        [
          Query.equal('isActive', true),
          Query.equal('hasQuestions', true)
        ]
      );
      
      setTests(response.documents as Test[]);
    } catch (error) {
      console.error('Error fetching tests:', error);
      Alert.alert('Error', 'Failed to load mock tests');
    } finally {
      setLoading(false);
    }
  };
  
  // Get cover image URL
  const getCoverImageUrl = (coverId: string) => {
    if (!coverId) return null;
    
    return storage.getFilePreview(
      BUCKET_ID,
      coverId,
      400
    );
  };
  
  // Get formatted date
  const getFormattedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  // Filter tests by exam
  const getFilteredTests = () => {
    if (!selectedExamId) return tests;
    return tests.filter(test => test.examId === selectedExamId);
  };
  
  // Render exam category
  const renderExamItem = ({ item }: { item: [string, Exam] }) => {
    const [id, exam] = item;
    return (
      <TouchableOpacity
        style={styles.examCard}
        onPress={() => setSelectedExamId(id)}
      >
        <View style={styles.examIconCircle}>
          <FontAwesome name="graduation-cap" size={24} color="white" />
        </View>
        <TextCustom style={styles.examName} fontSize={14} numberOfLines={1}>
          {exam.name}
        </TextCustom>
      </TouchableOpacity>
    );
  };
  
  // Render test item
  const renderTestItem = ({ item }: { item: Test }) => (
    <TouchableOpacity
      style={styles.testCard}
      onPress={() => router.push({
        pathname: "/(app)/take-test/[testId]",
        params: { testId: item.$id }
      } as any)}
    >
      {item.coverId ? (
        <Image 
          source={{ uri: getCoverImageUrl(item.coverId) as any }}
          style={styles.testCover}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.placeholderCover}>
          <FontAwesome name="file-text-o" size={40} color="#ccc" />
        </View>
      )}
      
      <View style={styles.testInfo}>
        <TextCustom style={styles.testTitle} fontSize={16} numberOfLines={2}>
          {item.title}
        </TextCustom>
        
        {item.examId && exams[item.examId] && (
          <View style={styles.examBadge}>
            <TextCustom style={styles.examBadgeText} fontSize={12}>
              {exams[item.examId].name}
            </TextCustom>
          </View>
        )}
        
        <View style={styles.testMeta}>
          <View style={styles.metaItem}>
            <FontAwesome name="clock-o" size={14} color="#666" />
            <TextCustom style={styles.metaText} fontSize={12}>
              {item.duration} min
            </TextCustom>
          </View>
          
          <View style={styles.metaItem}>
            <FontAwesome name="list" size={14} color="#666" />
            <TextCustom style={styles.metaText} fontSize={12}>
              {item.questions} Q
            </TextCustom>
          </View>
        </View>
        
        <TextCustom style={styles.testDate} fontSize={12}>
          {getFormattedDate(item.createdAt)}
        </TextCustom>
          
        <View style={styles.viewsContainer}>
          <FontAwesome name="eye" size={12} color="#999" />
          <TextCustom style={styles.viewsText} fontSize={12}>
            {item.views || 0}
          </TextCustom>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#6B46C1', '#4A23A9']}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <TextCustom style={styles.headerTitle} fontSize={20}>
          Mock Tests
        </TextCustom>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.examsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <FontAwesome name="graduation-cap" size={18} color="#6B46C1" style={styles.sectionIcon} />
              <TextCustom style={styles.sectionTitle} fontSize={18}>
                Exams
              </TextCustom>
            </View>
            <TouchableOpacity onPress={() => setSelectedExamId(null)}>
              <TextCustom style={styles.viewAllText} fontSize={14}>
                View All
              </TextCustom>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.examsScrollView}
          >
            {Object.entries(exams).map((item, index) => (
              <View key={item[0]} style={styles.examCardContainer}>
                {renderExamItem({ item })}
              </View>
            ))}
          </ScrollView>
        </View>
        
        {isAdmin && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push("/(app)/manage-tests/add")}
          >
            <Ionicons name="add" size={24} color="white" />
            <TextCustom style={styles.addButtonText} fontSize={16}>
              Add Tests
            </TextCustom>
          </TouchableOpacity>
        )}
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6B46C1" />
            <TextCustom style={styles.loadingText} fontSize={16}>
              Loading mock tests...
            </TextCustom>
          </View>
        ) : (
          <FlatList
            data={getFilteredTests()}
            renderItem={renderTestItem}
            keyExtractor={item => item.$id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<View />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 36, // Balance the layout with backButton
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  examsSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllText: {
    color: '#6B46C1',
  },
  examsScrollView: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  examCardContainer: {
    marginRight: 12,
  },
  examCard: {
    width: 80,
    height: 100,
    backgroundColor: 'white',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  examIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6B46C1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  examName: {
    textAlign: 'center',
    color: '#444',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  testCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  placeholderCover: {
    width: 100,
    height: 140,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  testCover: {
    width: 100,
    height: 140,
  },
  testInfo: {
    flex: 1,
    padding: 12,
  },
  testTitle: {
    fontWeight: 'bold',
    marginBottom: 6,
  },
  examBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  examBadgeText: {
    color: '#666',
  },
  testMeta: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
  },
  metaText: {
    color: '#666',
    marginLeft: 4,
  },
  testDate: {
    color: '#999',
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  viewsText: {
    color: '#999',
    marginLeft: 4,
  },
  listContent: {
    paddingBottom: 80,
  },
}); 