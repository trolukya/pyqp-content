import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Platform,
  Alert,
  KeyboardAvoidingView
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import TextCustom from '../../components/TextCustom';
import AdminTabBar from '../../components/AdminTabBar';
import { FontAwesome } from '@expo/vector-icons';
import { database, storage } from '../../../lib/appwriteConfig';
import { ID, Query, Models } from 'react-native-appwrite';
import * as ImagePicker from 'expo-image-picker';

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

const ManageExamsScreen: React.FC = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<ExamDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [iconUrls, setIconUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchExams();
  }, []);

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
      Alert.alert('Error', 'Failed to load exams. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExam = () => {
    router.push('/(app)/manage-exams/add');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={20} color="#333" />
          </TouchableOpacity>
          <TextCustom style={styles.headerTitle}>Manage Exams</TextCustom>
        </View>
        
        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddExam}
          >
            <FontAwesome name="plus" size={16} color="#fff" />
            <TextCustom style={styles.addButtonText}>Add New Exam</TextCustom>
          </TouchableOpacity>
        </View>
        
        {/* Exams List */}
        <View style={styles.listContainer}>
          <TextCustom style={styles.sectionTitle}>Available Exams</TextCustom>
          
          {loading ? (
            <ActivityIndicator size="large" color="#6B46C1" style={styles.loader} />
          ) : exams.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome name="graduation-cap" size={50} color="#ccc" />
              <TextCustom style={styles.emptyText}>No exams added yet</TextCustom>
            </View>
          ) : (
            exams.map((exam) => (
              <View key={exam.$id} style={styles.examItem}>
                <View style={styles.examImageContainer}>
                  {exam.iconId && iconUrls[exam.iconId] ? (
                    <Image 
                      source={{ uri: iconUrls[exam.iconId] }} 
                      style={styles.examImage} 
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.noImageContainer}>
                      <FontAwesome name="file-text" size={24} color="#ccc" />
                    </View>
                  )}
                </View>
                <View style={styles.examDetails}>
                  <TextCustom style={styles.examName}>{exam.name}</TextCustom>
                  <TextCustom style={styles.examDescription}>{exam.description || 'No description available'}</TextCustom>
                </View>
                <TouchableOpacity style={styles.examActionButton}>
                  <FontAwesome name="ellipsis-v" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
      
      <AdminTabBar activeTab="manage" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#6B46C1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  listContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  loader: {
    marginVertical: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  examItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  examImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  examImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  examDetails: {
    flex: 1,
    marginLeft: 12,
  },
  examName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  examDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  examActionButton: {
    padding: 10,
  },
});

export default ManageExamsScreen; 