import { View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, Text, Modal, FlatList } from "react-native";
import React, { useState, useEffect } from "react";
import { database, storage } from "../../../lib/appwriteConfig";
import { Models, ID } from "react-native-appwrite";
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from "expo-router";
import TextCustom from "../../components/TextCustom";
import AdminTabBar from "../../components/AdminTabBar";
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

// Appwrite config constants
const DATABASE_ID = '67f3615a0027484c95d5';
const PAPERS_COLLECTION_ID = '6805e9460039cc752d42';
const SIMPLE_PAPERS_COLLECTION_ID = '680b65cd002eb9c1b7a9';
const EXAMS_COLLECTION_ID = '67f630fb0019582e45ac';
const PAPERS_BUCKET_ID = '6805d851000f17ea756f';

// Default exam ID to use as fallback
const DEFAULT_EXAM_ID = '67f630fb0019582e45ad';

// Define interfaces
interface ExamOption {
  id: string;
  name: string;
}

interface PaperFormData {
  examId: string;
  examName: string;
  paperName: string;
  year: string;
  description: string;
  fileUri?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}

interface PaperDocument extends Models.Document {
  examId: string;
  examName?: string;
  paperName: string;
  year: string;
  description?: string;
  fileId: string;
  fileName: string;
  fileType: string;
  createdAt?: string;
  uploadDate?: string;
}

export default function EditPaperScreen() {
  const params = useLocalSearchParams();
  const paperId = params.id as string;
  
  const [formData, setFormData] = useState<PaperFormData>({
    examId: '',
    examName: '',
    paperName: '',
    year: '',
    description: '',
  });
  
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPaper, setCurrentPaper] = useState<PaperDocument | null>(null);
  const [fileChanged, setFileChanged] = useState(false);
  const [collectionId, setCollectionId] = useState<string>(PAPERS_COLLECTION_ID);
  const [showExamModal, setShowExamModal] = useState(false);
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    fetchExams();
    fetchPaperDetails();
  }, []);

  const fetchExams = async () => {
    setIsLoadingExams(true);
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        EXAMS_COLLECTION_ID,
        []
      );
      
      const examsList = response.documents.map(exam => ({
        id: exam.$id,
        name: exam.name
      }));
      
      setExams(examsList);
    } catch (error) {
      console.error('Error fetching exams:', error);
      // Silently fail
    } finally {
      setIsLoadingExams(false);
    }
  };

  const fetchPaperDetails = async () => {
    setLoading(true);
    try {
      // Try to fetch from original collection first
      try {
        const response = await database.getDocument(
          DATABASE_ID,
          PAPERS_COLLECTION_ID,
          paperId
        );
        
        const paperData = response as PaperDocument;
        setCurrentPaper(paperData);
        setCollectionId(PAPERS_COLLECTION_ID);
        
        // Find exam name for the selected exam ID
        let examName = "";
        if (paperData.examId) {
          try {
            const examDoc = await database.getDocument(
              DATABASE_ID,
              EXAMS_COLLECTION_ID,
              paperData.examId
            );
            examName = examDoc.name || "";
          } catch (examError) {
            console.error("Error fetching exam name:", examError);
          }
        }
        
        // Set form data with current paper details
        setFormData({
          examId: paperData.examId,
          examName: examName,
          paperName: paperData.paperName,
          year: paperData.year,
          description: paperData.description || '',
        });
        return; // Successfully found the paper, exit the function
      } catch (error) {
        console.log('Paper not found in original collection, trying simple collection...');
      }

      // If we get here, try the simple collection
      const response = await database.getDocument(
        DATABASE_ID,
        SIMPLE_PAPERS_COLLECTION_ID,
        paperId
      );
      
      const paperData = response as PaperDocument;
      setCurrentPaper(paperData);
      setCollectionId(SIMPLE_PAPERS_COLLECTION_ID);
      
      // Find exam name for the selected exam ID
      let examName = "";
      if (paperData.examId) {
        try {
          const examDoc = await database.getDocument(
            DATABASE_ID,
            EXAMS_COLLECTION_ID,
            paperData.examId
          );
          examName = examDoc.name || "";
        } catch (examError) {
          console.error("Error fetching exam name:", examError);
        }
      }
      
      // Set form data with current paper details
      setFormData({
        examId: paperData.examId || '',
        examName: examName,
        paperName: paperData.paperName,
        year: paperData.year || new Date().getFullYear().toString(),
        description: paperData.description || '',
      });
    } catch (error) {
      console.error('Error fetching paper details:', error);
      Alert.alert('Error', 'Failed to load paper details. Please try again.', 
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof PaperFormData, value: string) => {
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
    setUploadError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      
      if (result.canceled) {
        return;
      }
      
      const selectedAsset = result.assets[0];
      
      // Check if file exists at the URI
      const fileInfo = await FileSystem.getInfoAsync(selectedAsset.uri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist at the specified URI');
      }
      
      // Check file size - limit to 10MB
      if (fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
        Alert.alert('Error', 'File is too large. Please select a file smaller than 10MB.');
        return;
      }
      
      setSelectedFile(selectedAsset);
      setFileChanged(true);
      
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
    const { examId, paperName, year } = formData;
    
    if (!examId) {
      Alert.alert('Error', 'Please select an exam category');
      return false;
    }
    
    if (!paperName || paperName.trim() === '') {
      Alert.alert('Error', 'Please enter a paper name');
      return false;
    }
    
    if (!year || year.trim() === '') {
      Alert.alert('Error', 'Please enter the year');
      return false;
    }
    
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
      Alert.alert('Error', 'Please enter a valid year');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      let updateData: any = {
        examId: formData.examId,
        paperName: formData.paperName,
        year: formData.year,
        description: formData.description,
      };
      
      // If a new file was selected, upload it
      if (fileChanged && selectedFile && currentPaper) {
        // Generate a unique ID for the file
        const fileId = ID.unique();
        
        // Upload the new file
        const fileUpload = await storage.createFile(
          PAPERS_BUCKET_ID,
          fileId,
          {
            name: selectedFile.name,
            type: selectedFile.mimeType || 'application/octet-stream',
            size: selectedFile.size || 0,
            uri: selectedFile.uri
          }
        );
        
        // Delete the old file
        try {
          await storage.deleteFile(
            PAPERS_BUCKET_ID,
            currentPaper.fileId
          );
        } catch (error) {
          console.error('Error deleting old file:', error);
        }
        
        // Update with new file details
        updateData = {
          ...updateData,
          fileId: fileUpload.$id,
          fileName: selectedFile.name,
          fileType: selectedFile.mimeType,
        };
      }
      
      // Update the document in the correct collection
      await database.updateDocument(
        DATABASE_ID,
        collectionId, // Use the appropriate collection ID
        paperId,
        updateData
      );
      
      Alert.alert(
        'Success', 
        'Paper updated successfully!',
        [
          { 
            text: 'OK', 
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error updating paper:', error);
      Alert.alert('Error', 'Failed to update paper. Please try again.');
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

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={20} color="#333" />
          </TouchableOpacity>
          <TextCustom style={styles.headerTitle}>Edit Exam Paper</TextCustom>
        </View>
        
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#6B46C1" />
          </View>
        ) : (
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
                placeholder="Enter paper name (e.g., Main Exam Paper)"
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
                placeholder="Enter year (e.g., 2023)"
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
              <TextCustom style={styles.label}>Upload Paper File {fileChanged ? '*' : '(Optional)'}</TextCustom>
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
                ) : currentPaper ? (
                  <View style={styles.fileInfoContainer}>
                    <FontAwesome 
                      name={currentPaper.fileType.includes('image') ? 'file-image-o' : 'file-pdf-o'} 
                      size={24} 
                      color="#6B46C1" 
                    />
                    <TextCustom style={styles.fileName}>
                      {currentPaper.fileName} (Current file)
                    </TextCustom>
                    <TextCustom style={styles.fileChangeHint}>
                      Tap to change file
                    </TextCustom>
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <FontAwesome name="cloud-upload" size={28} color="#666" />
                    <TextCustom style={styles.uploadText}>
                      Select a file to upload
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
                  <FontAwesome name="save" size={16} color="#fff" />
                  <TextCustom style={styles.submitButtonText}>
                    Update Paper
                  </TextCustom>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      
      <AdminTabBar activeTab="manage" />
      
      {/* Exam Selection Modal */}
      <ExamSelectionModal />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 70,
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  fileUploadContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    borderStyle: 'dashed',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  fileInfoContainer: {
    alignItems: 'center',
  },
  fileName: {
    marginTop: 8,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  fileSize: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
  },
  fileChangeHint: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B46C1',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    marginTop: 8,
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#6B46C1',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    marginBottom: 10,
  },
  pickerInput: {
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#333',
  },
}); 