import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import TextCustom from '../../components/TextCustom';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { database, storage } from '../../../lib/appwriteConfig';
import { Query, ID, Models } from 'react-native-appwrite';
import AdminTabBar from '../../components/AdminTabBar';
import { useAuth } from '../../../context/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

// Appwrite config constants
const DATABASE_ID = '67f3615a0027484c95d5';
const NOTES_COLLECTION_ID = '682d9ac0001b401b3121'; // Notes collection ID
const BUCKET_ID = '6805d851000f17ea756f'; // Storage bucket ID
const EXAMS_COLLECTION_ID = '67f630fb0019582e45ac'; // Exams collection

interface Note {
  title: string;          // Required
  author: string;         // Required
  subject: string;        // Required
  description?: string;   // Optional
  examId?: string;        // Optional
  fileId: string;         // Required
  fileName: string;       // Required
  coverId?: string;       // Optional
  createdAt: string;      // Required (Datetime)
  uploadedBy: string;     // Required
  views: number;          // Optional Integer
  downloads: number;      // Optional Integer
  isActive: boolean;      // Required Boolean
}

interface ExamDocument {
  $id: string;
  name: string;
  description?: string;
  iconId?: string;
}

export default function AddNote() {
  const { isAdmin, session } = useAuth();
  const params = useLocalSearchParams<{ noteId?: string }>();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingFileId, setExistingFileId] = useState<string | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [selectedCoverImage, setSelectedCoverImage] = useState<ImagePicker.ImagePickerResult | null>(null);
  const [existingCoverId, setExistingCoverId] = useState<string | null>(null);
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [exams, setExams] = useState<ExamDocument[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamDocument | null>(null);
  const [showExamPicker, setShowExamPicker] = useState(false);

  // Load note data if in edit mode
  useEffect(() => {
    fetchExams();
    
    if (params.noteId) {
      setIsEditMode(true);
      fetchNoteData(params.noteId);
    }
  }, [params.noteId]);

  // Fetch available exams
  const fetchExams = async () => {
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        EXAMS_COLLECTION_ID,
        [Query.orderDesc('$createdAt')]
      );
      
      setExams(response.documents as unknown as ExamDocument[]);
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  // Fetch note data for editing
  const fetchNoteData = async (noteId: string) => {
    setLoading(true);
    try {
      const response = await database.getDocument(
        DATABASE_ID,
        NOTES_COLLECTION_ID,
        noteId
      );
      
      setTitle(response.title);
      setAuthor(response.author);
      setDescription(response.description);
      setSubject(response.subject || '');
      
      if (response.examId) {
        // Find the selected exam
        const exam = exams.find(e => e.$id === response.examId);
        if (exam) {
          setSelectedExam(exam);
        }
      }
      
      if (response.fileId) {
        setExistingFileId(response.fileId);
        setExistingFileName(response.fileName);
      }
      
      if (response.coverId) {
        setExistingCoverId(response.coverId);
        // Fetch the cover image
        try {
          const fileUrl = await storage.getFileView(BUCKET_ID, response.coverId);
          setCoverImageUri(fileUrl.href);
        } catch (error) {
          console.error('Error loading cover image:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching note data:', error);
      Alert.alert('Error', 'Failed to load note data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Pick a document/file
  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        console.log("File selected:", result.assets[0].name);
        console.log("File URI:", result.assets[0].uri);
        setSelectedFile(result);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to select file. Please try again.');
    }
  };

  // Pick a cover image
  const handleCoverImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 1.0,
      });

      if (!result.canceled) {
        console.log("Image selected:", result.assets[0].uri);
        setSelectedCoverImage(result);
        setCoverImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking cover image:', error);
      Alert.alert('Error', 'Failed to select cover image. Please try again.');
    }
  };

  // Toggle exam picker
  const toggleExamPicker = () => {
    setShowExamPicker(!showExamPicker);
  };

  // Select an exam
  const handleExamSelect = (exam: ExamDocument) => {
    setSelectedExam(exam);
    setShowExamPicker(false);
  };

  // Submit the note
  const handleSubmit = async () => {
    // Validate inputs
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a note title');
      return;
    }

    if (!author.trim()) {
      Alert.alert('Error', 'Please enter an author name');
      return;
    }

    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }

    if (!isEditMode && !selectedFile) {
      Alert.alert('Error', 'Please select a note file');
      return;
    }

    setSubmitting(true);

    try {
      let fileId = existingFileId;
      let fileName = existingFileName;
      let coverId = existingCoverId;

      // Upload file if a new one is selected
      if (selectedFile && !selectedFile.canceled) {
        try {
          // If we're editing and replacing the file, delete the old one
          if (isEditMode && existingFileId) {
            try {
              await storage.deleteFile(BUCKET_ID, existingFileId);
              console.log("Deleted existing file:", existingFileId);
            } catch (deleteError) {
              console.error('Error deleting old file:', deleteError);
              // Continue with the upload even if delete fails
            }
          }

          console.log('Uploading file...');
          console.log('Bucket ID:', BUCKET_ID);
          
          // Create a unique ID for the file
          const uniqueFileId = ID.unique();
          console.log('Generated file ID:', uniqueFileId);
          
          // Check if the file exists and is accessible
          const fileInfo = await FileSystem.getInfoAsync(selectedFile.assets[0].uri);
          console.log('File exists:', fileInfo.exists);
          if (fileInfo.exists) {
            console.log('File size:', fileInfo.size ?? 'unknown');
          }
            
          if (!fileInfo.exists) {
            throw new Error('File does not exist at the specified URI');
          }
            
          try {
            // Upload file directly using the React Native Appwrite SDK format
            const uploadResponse = await storage.createFile(
              BUCKET_ID,
              uniqueFileId,
              {
                name: selectedFile.assets[0].name,
                type: selectedFile.assets[0].mimeType || 'application/pdf',
                size: fileInfo.size ?? 0,
                uri: selectedFile.assets[0].uri
              }
            );
            
            fileId = uploadResponse.$id;
            fileName = selectedFile.assets[0].name;
            console.log('File uploaded successfully, ID:', fileId);
          } catch (uploadError) {
            console.error('SDK upload failed:', uploadError);
            throw new Error('File upload failed');
          }
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          Alert.alert('Upload Error', 'Failed to upload note file. Please try again later.');
          setSubmitting(false);
          return;
        }
      } else if (!isEditMode) {
        // If not in edit mode and no file is selected, show an error
        Alert.alert('Error', 'Please select a note file');
        setSubmitting(false);
        return;
      } else if (!existingFileId) {
        // If in edit mode but no existing file and no new file, show an error
        Alert.alert('Error', 'A note file is required');
        setSubmitting(false);
        return;
      }

      // Ensure fileId and fileName are set
      if (!fileId || !fileName) {
        Alert.alert('Error', 'File information is missing');
        setSubmitting(false);
        return;
      }

      // Upload cover image if a new one is selected
      if (selectedCoverImage && !selectedCoverImage.canceled) {
        try {
          // If we're editing and replacing the cover, delete the old one
          if (isEditMode && existingCoverId) {
            try {
              await storage.deleteFile(BUCKET_ID, existingCoverId);
              console.log("Deleted existing cover:", existingCoverId);
            } catch (deleteError) {
              console.error('Error deleting old cover:', deleteError);
            }
          }

          console.log('Uploading cover image...');
          
          // Create a unique ID for the cover
          const uniqueCoverId = ID.unique();
          const coverFileName = `cover_${Date.now()}.jpg`;
          
          // Check if the image exists and is accessible
          const imageInfo = await FileSystem.getInfoAsync(selectedCoverImage.assets[0].uri);
          console.log('Image exists:', imageInfo.exists);
          if (imageInfo.exists) {
            console.log('Image size:', imageInfo.size ?? 'unknown');
          }
            
          if (!imageInfo.exists) {
            throw new Error('Image does not exist at the specified URI');
          }
            
          try {
            // Upload image directly using the React Native Appwrite SDK format
            const uploadResponse = await storage.createFile(
              BUCKET_ID,
              uniqueCoverId,
              {
                name: coverFileName,
                type: selectedCoverImage.assets[0].mimeType || 'image/jpeg',
                size: imageInfo.size ?? 0,
                uri: selectedCoverImage.assets[0].uri
              }
            );
            
            coverId = uploadResponse.$id;
            console.log('Cover image uploaded successfully, ID:', coverId);
          } catch (uploadError) {
            console.error('Cover image upload failed:', uploadError);
            // Continue without the cover image
          }
        } catch (uploadError) {
          console.error('Error uploading cover image:', uploadError);
          Alert.alert('Cover Upload Warning', 'Failed to upload cover image. The note will be saved without a cover.');
          // Continue without the cover image
        }
      }

      // Prepare note data
      const noteData: Note = {
        title,
        author,
        subject,
        description,
        fileId: fileId || '',
        fileName: fileName || '',
        createdAt: new Date().toISOString(),
        uploadedBy: session.$id,
        views: 0,
        downloads: 0,
        isActive: true
      };

      if (selectedExam) {
        noteData.examId = selectedExam.$id;
      }

      if (coverId) {
        noteData.coverId = coverId;
      }

      console.log('Saving note data to collection:', NOTES_COLLECTION_ID);
      
      try {
        let response;
        
        if (isEditMode && params.noteId) {
          // Update existing note
          response = await database.updateDocument(
            DATABASE_ID,
            NOTES_COLLECTION_ID,
            params.noteId,
            noteData
          );
        } else {
          // Create new note
          response = await database.createDocument(
            DATABASE_ID,
            NOTES_COLLECTION_ID,
            ID.unique(),
            noteData
          );
        }

        console.log('Note saved successfully, ID:', response.$id);
        
        if (response.$id) {
          Alert.alert(
            'Success',
            isEditMode ? 'Note updated successfully' : 'Note added successfully',
            [
              {
                text: 'OK',
                onPress: () => router.back()
              }
            ]
          );
        }
      } catch (dbError: any) {
        console.error('Error saving note to database:', dbError);
        let errorMessage = 'Failed to save note data. Please try again.';
        
        if (dbError.message) {
          errorMessage += ' Error: ' + dbError.message;
        }
        
        Alert.alert('Database Error', errorMessage);
      }
    } catch (error) {
      console.error('Error in note submission process:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6B46C1" />
          <TextCustom style={styles.loadingText} fontSize={16}>Loading note data...</TextCustom>
        </View>
      ) : (
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <LinearGradient
            colors={['#6B46C1', '#4A23A9']}
            style={styles.header}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TextCustom style={styles.headerTitle} fontSize={20}>
              {isEditMode ? 'Edit Note' : 'Add Note'}
            </TextCustom>
            <View style={styles.headerRight} />
          </LinearGradient>

          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formContainer}>
              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={16}>Title</TextCustom>
                <TextInput
                  style={styles.textInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Enter note title"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={16}>Author</TextCustom>
                <TextInput
                  style={styles.textInput}
                  value={author}
                  onChangeText={setAuthor}
                  placeholder="Enter author name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={16}>Subject</TextCustom>
                <TextInput
                  style={styles.textInput}
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="Enter note subject"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={16}>Select Exam</TextCustom>
                <TouchableOpacity 
                  style={styles.examPicker}
                  onPress={toggleExamPicker}
                >
                  <TextCustom style={styles.examPickerText} fontSize={14}>
                    {selectedExam ? selectedExam.name : 'Select an exam'}
                  </TextCustom>
                  <Ionicons 
                    name={showExamPicker ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#6B46C1" 
                  />
                </TouchableOpacity>
                
                {showExamPicker && (
                  <View style={styles.examDropdown}>
                    <ScrollView style={styles.examScrollView} nestedScrollEnabled={true}>
                      {exams.map((exam) => (
                        <TouchableOpacity 
                          key={exam.$id} 
                          style={styles.examItem}
                          onPress={() => handleExamSelect(exam)}
                        >
                          <TextCustom style={styles.examItemText} fontSize={14}>{exam.name}</TextCustom>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={16}>Description</TextCustom>
                <TextInput
                  style={styles.textAreaInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter note description"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={16}>Cover Image</TextCustom>
                <TouchableOpacity 
                  style={styles.coverImagePicker}
                  onPress={handleCoverImagePick}
                >
                  {coverImageUri ? (
                    <Image 
                      source={{ uri: coverImageUri }} 
                      style={styles.coverImagePreview} 
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.coverImagePlaceholder}>
                      <Ionicons name="image-outline" size={40} color="#6B46C1" />
                      <TextCustom style={styles.coverImageText} fontSize={14}>
                        Select Cover Image
                      </TextCustom>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={16}>Note File</TextCustom>
                <TouchableOpacity 
                  style={styles.filePicker}
                  onPress={handleFilePick}
                >
                  <Ionicons name="document-text-outline" size={24} color="#6B46C1" />
                  <TextCustom style={styles.filePickerText} fontSize={14}>
                    {selectedFile && !selectedFile.canceled 
                      ? selectedFile.assets[0].name
                      : existingFileName || 'Select Note File (PDF, DOC, DOCX)'}
                  </TextCustom>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.submitButton, submitting && styles.submittingButton]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <TextCustom style={styles.submitButtonText} fontSize={16}>
                    {isEditMode ? 'Update Note' : 'Save Note'}
                  </TextCustom>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
          
          <AdminTabBar activeTab="manage" />
        </KeyboardAvoidingView>
      )}
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
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  formContainer: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  textInput: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  textAreaInput: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    height: 120,
  },
  examPicker: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  examPickerText: {
    color: '#333',
  },
  examDropdown: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 4,
    maxHeight: 200,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  examScrollView: {
    padding: 8,
  },
  examItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  examItemText: {
    color: '#333',
  },
  filePicker: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filePickerText: {
    color: '#666',
    marginLeft: 8,
  },
  coverImagePicker: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    overflow: 'hidden',
    height: 160,
  },
  coverImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImageText: {
    color: '#666',
    marginTop: 8,
  },
  coverImagePreview: {
    width: '100%',
    height: '100%',
  },
  submitButton: {
    backgroundColor: '#6B46C1',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submittingButton: {
    backgroundColor: '#5D3FB3',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
}); 