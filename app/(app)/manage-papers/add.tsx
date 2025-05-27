import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  Alert,
  BackHandler,
  TextInput,
  ActivityIndicator, 
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  FlatList,
  Modal
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import TextCustom from '../../components/TextCustom';
import AdminTabBar from '../../components/AdminTabBar';
import * as DocumentPicker from 'expo-document-picker';
import { database, storage } from "../../../lib/appwriteConfig";
import { Query, ID } from "react-native-appwrite";
import * as FileSystem from 'expo-file-system';

// Appwrite config constants - using hardcoded values since env variables might not be available in production build
const DATABASE_ID = '67f3615a0027484c95d5';
const SIMPLE_PAPERS_COLLECTION_ID = '680b65cd002eb9c1b7a9'; 
const PAPERS_BUCKET_ID = '6805d851000f17ea756f';
const EXAMS_COLLECTION_ID = '67f630fb0019582e45ac';

// Default exam ID to use as fallback
const DEFAULT_EXAM_ID = '67f630fb0019582e45ad';

interface ExamOption {
  id: string;
  name: string;
}

interface PaperFormData {
  paperName: string;
  examId: string;
  examName: string;
  year: string;
  description: string;
  fileUri?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}

export default function AddPaperScreen() {
  console.log('Rendering AddPaperScreen component');
  
  const [formData, setFormData] = useState<PaperFormData>({
    paperName: '',
    examId: '',
    examName: '',
    year: new Date().getFullYear().toString(),
    description: '',
  });
  
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showExamModal, setShowExamModal] = useState(false);
  
  // Handle Android back button
  useFocusEffect(
    useCallback(() => {
      console.log('Setting up back button handler');
      const onBackPress = () => {
        if (showExamModal) {
          setShowExamModal(false);
          return true;
        }
        handleBack();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      return () => subscription.remove();
    }, [showExamModal])
  );
  
  // Fetch exam categories on component mount
  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    console.log('Fetching exams');
    setIsLoadingExams(true);
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        EXAMS_COLLECTION_ID,
        [Query.orderAsc('name')]
      );
      
      console.log('Exams fetched:', response.documents.length);
      
      if (response.documents.length > 0) {
        const examsList = response.documents.map(exam => ({
          id: exam.$id,
          name: exam.name,
      }));
      
        setExams(examsList);
        
        // Set default exam if available
        if (examsList.length > 0) {
          setFormData(prev => ({
            ...prev,
            examId: examsList[0].id,
            examName: examsList[0].name
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      // Silently fail but set a default exam ID
      setFormData(prev => ({
        ...prev,
        examId: DEFAULT_EXAM_ID,
        examName: 'Default Exam'
      }));
    } finally {
      setIsLoadingExams(false);
    }
  };

  const handleBack = () => {
    console.log('Back button pressed');
    try {
      router.replace('/(app)/manage-papers/all-papers');
    } catch (error) {
      console.error('Error navigating back:', error);
      try {
        router.replace('/(app)/contents');
      } catch (innerError) {
        console.error('Fallback navigation failed:', innerError);
        Alert.alert('Navigation Error', 'Could not navigate back. Please try again.');
      }
    }
  };

  const handleChange = (field: keyof PaperFormData, value: string) => {
    console.log('Form field changed:', field, value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectExam = (exam: ExamOption) => {
    setFormData(prev => ({
      ...prev,
      examId: exam.id,
      examName: exam.name
    }));
    setShowExamModal(false);
  };

  const pickDocument = async () => {
    console.log('Picking document');
    setUploadError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('Document picking canceled');
        return;
      }
      
      const selectedAsset = result.assets[0];
      console.log('Document selected:', selectedAsset.name);
      
      // Check if file exists at the URI
      const fileInfo = await FileSystem.getInfoAsync(selectedAsset.uri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist at the specified URI');
      }
      
      console.log('File exists:', fileInfo);
      
      // Check file size - limit to 10MB
      if (fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
        Alert.alert('Error', 'File is too large. Please select a file smaller than 10MB.');
        return;
      }
      
      setSelectedFile(selectedAsset);
        
      // Update form data with file details
      setFormData(prev => ({
        ...prev,
        fileUri: selectedAsset.uri,
        fileName: selectedAsset.name,
        fileType: selectedAsset.mimeType,
        fileSize: selectedAsset.size,
      }));
    } catch (error) {
      console.error('Error picking document:', error);
      setUploadError('Failed to select document. Please try again.');
      Alert.alert('Error', 'Failed to select document. Please try again.');
    }
  };

  const validateForm = () => {
    console.log('Validating form');
    const { paperName, year, examId } = formData;
    
    if (!paperName || paperName.trim() === '') {
      Alert.alert('Error', 'Please enter a paper name');
      return false;
    }

    if (!examId) {
      Alert.alert('Error', 'Please select an exam');
      return false;
    }
    
    if (!year || year.trim() === '') {
      Alert.alert('Error', 'Please enter a year');
      return false;
    }

    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
      Alert.alert('Error', 'Please enter a valid year');
      return false;
    }
    
    if (!selectedFile) {
      Alert.alert('Error', 'Please upload a paper file');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    console.log('Submit button pressed');
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setUploadError(null);
    
    try {
      // Generate a unique ID for the file
      const fileId = ID.unique();
      console.log('Generated file ID:', fileId);
      
      // Check if file is accessible
      if (!selectedFile || !selectedFile.uri) {
        throw new Error('No file selected or file URI is missing');
      }
      
      const fileInfo = await FileSystem.getInfoAsync(selectedFile.uri);
      console.log('File info before upload:', fileInfo);
      
      if (!fileInfo.exists) {
        throw new Error('File does not exist at path: ' + selectedFile.uri);
      }
      
      console.log('Uploading file to Appwrite storage...');
      console.log('Bucket ID:', PAPERS_BUCKET_ID);
      console.log('File details:', {
        name: selectedFile.name,
        type: selectedFile.mimeType,
        size: selectedFile.size,
      });
      
      // Upload the file using try-catch to get detailed error
      let fileUpload;
      try {
        fileUpload = await storage.createFile(
        PAPERS_BUCKET_ID,
        fileId,
        {
            name: selectedFile.name || 'paper.pdf',
            type: selectedFile.mimeType || 'application/pdf',
            size: selectedFile.size || 0,
            uri: selectedFile.uri
          }
        );
        console.log('File uploaded successfully:', fileUpload.$id);
      } catch (uploadError: any) {
        console.error('File upload error:', uploadError);
        // Provide detailed error message
        const errorMessage = uploadError.message || 'Unknown error during file upload';
        setUploadError('File upload failed: ' + errorMessage);
        throw new Error('File upload failed: ' + errorMessage);
      }
      
      console.log('Creating document in database...');
      // Create the paper document
      await database.createDocument(
        DATABASE_ID,
        SIMPLE_PAPERS_COLLECTION_ID,
        ID.unique(),
        {
          paperName: formData.paperName,
          examId: formData.examId,
          year: formData.year,
          description: formData.description,
          fileId: fileUpload.$id,
          fileName: selectedFile.name,
          fileType: selectedFile.mimeType,
          uploadDate: new Date().toISOString(),
        }
      );
      
      console.log('Paper added successfully!');
      Alert.alert(
        'Success', 
        'Paper added successfully!',
        [
          { 
            text: 'OK', 
            onPress: () => router.replace('/(app)/manage-papers/all-papers')
          }
        ]
      );
    } catch (error: any) {
      console.error('Error adding paper:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      Alert.alert('Error', `Failed to add paper: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Exam selection modal
  const ExamSelectionModal = () => (
    <Modal
      visible={showExamModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowExamModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TextCustom style={styles.modalTitle}>Select Exam</TextCustom>
            <TouchableOpacity onPress={() => setShowExamModal(false)}>
              <FontAwesome name="times" size={20} color="#333" />
            </TouchableOpacity>
          </View>
          
          {isLoadingExams ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6B46C1" />
              <Text style={styles.loadingText}>Loading exams...</Text>
            </View>
          ) : exams.length === 0 ? (
            <View style={styles.emptyListContainer}>
              <TextCustom style={styles.emptyListText}>No exams available</TextCustom>
            </View>
          ) : (
            <FlatList
              data={exams}
              keyExtractor={(item) => item.id}
              renderItem={({item}) => (
                <TouchableOpacity 
                  style={[
                    styles.examItem, 
                    formData.examId === item.id && styles.selectedExamItem
                  ]}
                  onPress={() => selectExam(item)}
                >
                  <TextCustom 
                    style={[
                      styles.examItemText,
                      formData.examId === item.id && styles.selectedExamItemText
                    ]}
                  >
                    {item.name}
                  </TextCustom>
                  {formData.examId === item.id && (
                    <FontAwesome name="check" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              )}
              style={styles.examList}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  // Normal UI with simplified form
  return (
    <SafeAreaView style={styles.safeArea}>
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
          >
            <FontAwesome name="arrow-left" size={20} color="#333" />
          </TouchableOpacity>
          <TextCustom style={styles.headerTitle}>Add Paper</TextCustom>
        </View>
        
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formContainer}>
            {/* Exam Selection Button */}
            <View style={styles.inputGroup}>
              <TextCustom style={styles.label}>Select Exam*</TextCustom>
              <TouchableOpacity 
                style={styles.examSelectButton}
                onPress={() => setShowExamModal(true)}
              >
                <TextCustom style={styles.examSelectText}>
                  {formData.examName || 'Select an exam'}
                </TextCustom>
                <FontAwesome name="chevron-down" size={14} color="#666" />
              </TouchableOpacity>
          </View>
          
          {/* Paper Name */}
          <View style={styles.inputGroup}>
            <TextCustom style={styles.label}>Paper Name*</TextCustom>
            <TextInput
              style={styles.input}
              value={formData.paperName}
              onChangeText={(text) => handleChange('paperName', text)}
                placeholder="Enter paper name (e.g., Physics Final Exam)"
              placeholderTextColor="#999"
            />
          </View>
          
          {/* Year */}
          <View style={styles.inputGroup}>
            <TextCustom style={styles.label}>Year*</TextCustom>
            <TextInput
              style={styles.input}
              value={formData.year}
              onChangeText={(text) => handleChange('year', text)}
                placeholder="2023"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
          
          {/* Description */}
          <View style={styles.inputGroup}>
            <TextCustom style={styles.label}>Description</TextCustom>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => handleChange('description', text)}
              placeholder="Enter paper description"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
          
          {/* File Upload */}
          <View style={styles.inputGroup}>
            <TextCustom style={styles.label}>Upload Paper File*</TextCustom>
            <TouchableOpacity
              style={styles.fileUploadContainer}
              onPress={pickDocument}
            >
              {selectedFile ? (
                <View style={styles.fileInfoContainer}>
                  <FontAwesome 
                    name={selectedFile.mimeType?.includes('image') ? 'file-image-o' : 'file-pdf-o'} 
                    size={24} 
                    color="#6B46C1" 
                  />
                  <TextCustom style={styles.fileName}>
                    {selectedFile.name}
                  </TextCustom>
                  <TextCustom style={styles.fileSize}>
                    {selectedFile.size ? ((selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB') : ''}
                  </TextCustom>
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <FontAwesome name="cloud-upload" size={28} color="#666" />
                  <TextCustom style={styles.uploadText}>
                    Upload PDF or Image (Click here)
                  </TextCustom>
                </View>
              )}
            </TouchableOpacity>
              {uploadError && (
                <TextCustom style={styles.errorText}>{uploadError}</TextCustom>
              )}
          </View>
          
          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                  <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                <TextCustom style={styles.submitButtonText}>
                  Upload Paper
                </TextCustom>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <AdminTabBar activeTab="manage" />
        
        {/* Exam Selection Modal */}
        <ExamSelectionModal />
    </KeyboardAvoidingView>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
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
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
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
  },
  fileUploadContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#fff',
    padding: 12,
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    marginTop: 10,
    color: '#666',
    textAlign: 'center',
  },
  fileInfoContainer: {
    alignItems: 'center',
    width: '100%',
  },
  fileName: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  fileSize: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#6B46C1',
    borderRadius: 6,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
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
  loadingContainer: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  errorText: {
    color: 'red',
    marginTop: 8,
    fontSize: 14,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  examList: {
    maxHeight: 300,
  },
  examItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedExamItem: {
    backgroundColor: '#6B46C1',
  },
  examItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedExamItemText: {
    color: 'white',
  },
  emptyListContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyListText: {
    color: '#666',
    fontSize: 16,
  },
  examSelectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#fff',
  },
  examSelectText: {
    fontSize: 16,
    color: '#333',
  },
}); 