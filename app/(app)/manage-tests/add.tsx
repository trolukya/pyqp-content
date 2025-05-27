import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import TextCustom from '../../components/TextCustom';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { database, storage, config, client } from '../../../lib/appwriteConfig';
import { ID, Models } from 'react-native-appwrite';
import AdminTabBar from '../../components/AdminTabBar';
import { useAuth } from '../../../context/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

// Appwrite config constants
const DATABASE_ID = config.databaseId;
const TESTS_COLLECTION_ID = config.collections.tests;
const EXAMS_COLLECTION_ID = '67f630fb0019582e45ac';
const BUCKET_ID = '6805d851000f17ea756f';

// Define the Test interface
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
  duration: number; // Duration in minutes
  questions: number; // Number of questions
  marks: number; // Total marks
  hasQuestions: boolean; // Whether this test has manually added questions
}

// Define Exam interface
interface Exam extends Models.Document {
  name: string;
  // Add any other exam properties here
}

export default function AddTest() {
  const { isAdmin, session } = useAuth();
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [duration, setDuration] = useState('');
  const [questions, setQuestions] = useState('');
  const [marks, setMarks] = useState('');
  const [hasQuestions, setHasQuestions] = useState(false);
  
  // Cover image state
  const [coverImage, setCoverImage] = useState<any>(null);
  const [coverImageName, setCoverImageName] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverId, setCoverId] = useState('');
  
  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'You do not have permission to access this page.');
      router.replace('/(app)');
      return;
    }
    
    fetchExams();
  }, []);
  
  // Fetch all available exams
  const fetchExams = async () => {
    setLoading(true);
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        EXAMS_COLLECTION_ID
      );
      
      setExams(response.documents as Exam[]);
    } catch (error) {
      console.error('Error fetching exams:', error);
      Alert.alert('Error', 'Failed to load exam categories.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle picking a cover image
  const handlePickCoverImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your media library');
        return;
      }
      
      // Launch image picker with reduced image quality to keep file sizes manageable
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.5, // Reduced quality to help with upload issues
      });
      
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }
      
      const selectedAsset = result.assets[0];
      setCoverImage(selectedAsset.uri);
      
      // Store image ID without actually uploading the file for now
      // This is a workaround for the React Native Appwrite file upload issues
      const fakeImageId = 'temp_image_' + ID.unique();
      setCoverId(fakeImageId);
      
      Alert.alert('Success', 'Image selected successfully');
      
    } catch (error) {
      console.error('Error picking cover image:', error);
      Alert.alert('Error', 'Failed to pick cover image. Please try again.');
    }
  };
  
  // Validate form
  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for the test.');
      return false;
    }
    
    if (!selectedExamId) {
      Alert.alert('Error', 'Please select an exam category.');
      return false;
    }
    
    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      Alert.alert('Error', 'Please enter a valid duration.');
      return false;
    }
    
    const questionsNum = parseInt(questions);
    if (isNaN(questionsNum) || questionsNum <= 0) {
      Alert.alert('Error', 'Please enter a valid number of questions.');
      return false;
    }
    
    const marksNum = parseInt(marks);
    if (isNaN(marksNum) || marksNum <= 0) {
      Alert.alert('Error', 'Please enter a valid mark value.');
      return false;
    }
    
    return true;
  };
  
  // Submit form to create a test
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Convert form values to numbers
      const durationNum = parseInt(duration);
      const questionsNum = parseInt(questions);
      const marksNum = parseInt(marks);
      
      // Create a new test
      const testData = {
        title,
        description,
        examId: selectedExamId,
        fileId: '',
        fileName: '',
        coverId: coverId || '',
        isActive: true,
        views: 0,
        downloads: 0,
        uploadedBy: session.$id,
        author: session.$id,
        duration: durationNum,
        questions: questionsNum,
        marks: marksNum,
        hasQuestions: false, // Initially false, will be updated when questions are added
        createdAt: new Date().toISOString()
      };
      
      const response = await database.createDocument(
        DATABASE_ID,
        TESTS_COLLECTION_ID,
        ID.unique(),
        testData
      );
      
      if (response.$id) {
        Alert.alert(
          'Test Created',
          'Test has been created successfully. Would you like to add questions now?',
          [
            {
              text: 'Later',
              style: 'cancel',
              onPress: () => router.push('/(app)/mock-tests/' as any)
            },
            {
              text: 'Add Questions',
              onPress: () => router.push({
                pathname: "/(app)/manage-tests/questions",
                params: { testId: response.$id }
              } as any)
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error creating test:', error);
      Alert.alert('Error', 'Failed to create test. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
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
          Add New Test
        </TextCustom>
        <View style={styles.placeholder} />
      </LinearGradient>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView style={styles.scrollContent}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6B46C1" />
              <TextCustom style={styles.loadingText} fontSize={16}>
                Loading...
              </TextCustom>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={14}>
                  Test Title *
                </TextCustom>
                <TextInput
                  style={styles.textInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Enter test title"
                />
              </View>
              
              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={14}>
                  Description
                </TextCustom>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter test description (optional)"
                  multiline
                  numberOfLines={3}
                />
              </View>
              
              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={14}>
                  Cover Image
                </TextCustom>
                <View style={styles.coverImageContainer}>
                  {coverImage ? (
                    <View style={styles.selectedCoverContainer}>
                      <Image source={{ uri: coverImage }} style={styles.coverPreview} />
                      {uploadingCover && (
                        <View style={styles.uploadingOverlay}>
                          <ActivityIndicator size="large" color="white" />
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.placeholderCover}>
                      <FontAwesome name="image" size={40} color="#ccc" />
                      <TextCustom style={styles.placeholderText} fontSize={14}>
                        No image selected
                      </TextCustom>
                    </View>
                  )}
                  
                  <TouchableOpacity
                    style={styles.coverImageButton}
                    onPress={handlePickCoverImage}
                    disabled={uploadingCover}
                  >
                    <Ionicons name="image-outline" size={20} color="white" />
                    <TextCustom style={styles.coverImageButtonText} fontSize={14}>
                      {coverImage ? 'Change Cover Image' : 'Choose Cover Image'}
                    </TextCustom>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={14}>
                  Exam Category *
                </TextCustom>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.examPicker}>
                  {exams.map(exam => (
                    <TouchableOpacity
                      key={exam.$id}
                      style={[
                        styles.examChip,
                        selectedExamId === exam.$id && styles.selectedExamChip
                      ]}
                      onPress={() => setSelectedExamId(exam.$id)}
                    >
                      <TextCustom
                        style={[
                          styles.examChipText,
                          selectedExamId === exam.$id && styles.selectedExamChipText
                        ]}
                        fontSize={14}
                      >
                        {exam.name}
                      </TextCustom>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={14}>
                  Test Duration (minutes) *
                </TextCustom>
                <TextInput
                  style={[styles.textInput, styles.numberInput]}
                  value={duration}
                  onChangeText={setDuration}
                  placeholder="Enter duration"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={14}>
                  Number of Questions *
                </TextCustom>
                <TextInput
                  style={[styles.textInput, styles.numberInput]}
                  value={questions}
                  onChangeText={setQuestions}
                  placeholder="Enter question count"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={14}>
                  Total Marks *
                </TextCustom>
                <TextInput
                  style={[styles.textInput, styles.numberInput]}
                  value={marks}
                  onChangeText={setMarks}
                  placeholder="Enter total marks"
                  keyboardType="numeric"
                />
              </View>
              
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <TextCustom style={styles.submitButtonText} fontSize={16}>
                    Add Test
                  </TextCustom>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      
      <AdminTabBar activeTab="contents" />
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  placeholder: {
    width: 28,
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#444',
  },
  textInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  numberInput: {
    width: '40%',
  },
  examPicker: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  examChip: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  selectedExamChip: {
    backgroundColor: '#6B46C1',
  },
  examChipText: {
    color: '#666',
  },
  selectedExamChipText: {
    color: 'white',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#6B46C1',
    borderRadius: 4,
    padding: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  coverImageContainer: {
    marginBottom: 10,
  },
  placeholderCover: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#999',
    marginTop: 8,
  },
  selectedCoverContainer: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
    position: 'relative',
  },
  coverPreview: {
    width: '100%',
    height: '100%',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImageButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImageButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: 'bold',
  },
}); 