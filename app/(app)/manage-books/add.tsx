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
const BOOKS_COLLECTION_ID = '682710e0002c728483e2'; // Books collection ID
const BUCKET_ID = '6805d851000f17ea756f'; // Storage bucket ID
const EXAMS_COLLECTION_ID = '67f630fb0019582e45ac'; // Exams collection

interface Book {
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

export default function AddBook() {
  const { isAdmin, session } = useAuth();
  const params = useLocalSearchParams<{ bookId?: string }>();
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

  // Load book data if in edit mode
  useEffect(() => {
    fetchExams();
    
    if (params.bookId) {
      setIsEditMode(true);
      fetchBookData(params.bookId);
    }
  }, [params.bookId]);

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

  // Fetch book data for editing
  const fetchBookData = async (bookId: string) => {
    setLoading(true);
    try {
      const response = await database.getDocument(
        DATABASE_ID,
        BOOKS_COLLECTION_ID,
        bookId
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
      console.error('Error fetching book data:', error);
      Alert.alert('Error', 'Failed to load book data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Pick a document/file
  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/epub+zip"],
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

  // Submit the book
  const handleSubmit = async () => {
    // Validate inputs
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a book title');
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
      Alert.alert('Error', 'Please select a book file');
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
          Alert.alert('Upload Error', 'Failed to upload book file. Please try again later.');
          setSubmitting(false);
          return;
        }
      } else if (!isEditMode) {
        // If not in edit mode and no file is selected, show an error
        Alert.alert('Error', 'Please select a book file');
        setSubmitting(false);
        return;
      } else if (!existingFileId) {
        // If in edit mode but no existing file and no new file, show an error
        Alert.alert('Error', 'A book file is required');
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
          Alert.alert('Cover Upload Warning', 'Failed to upload cover image. The book will be saved without a cover.');
          // Continue without the cover image
        }
      }

      // Prepare book data
      const bookData: Book = {
        title,
        author,
        description,
        subject,
        fileId: fileId || '',
        fileName: fileName || '',
        createdAt: new Date().toISOString(),
        uploadedBy: session.$id,
        views: 0,
        downloads: 0,
        isActive: true
      };

      if (selectedExam) {
        bookData.examId = selectedExam.$id;
      }

      if (coverId) {
        bookData.coverId = coverId;
      }

      console.log('Saving book data to collection:', BOOKS_COLLECTION_ID);
      
      try {
        let response;
        
        if (isEditMode && params.bookId) {
          // Update existing book
          response = await database.updateDocument(
            DATABASE_ID,
            BOOKS_COLLECTION_ID,
            params.bookId,
            bookData
          );
        } else {
          // Create new book
          response = await database.createDocument(
            DATABASE_ID,
            BOOKS_COLLECTION_ID,
            ID.unique(),
            bookData
          );
        }

        console.log('Book saved successfully, ID:', response.$id);
        
        if (response.$id) {
          Alert.alert(
            'Success',
            isEditMode ? 'Book updated successfully' : 'Book added successfully',
            [
              {
                text: 'OK',
                onPress: () => router.back()
              }
            ]
          );
        }
      } catch (dbError: any) {
        console.error('Error saving book to database:', dbError);
        let errorMessage = 'Failed to save book data. Please try again.';
        
        if (dbError.message) {
          errorMessage += ' Error: ' + dbError.message;
        }
        
        Alert.alert('Database Error', errorMessage);
      }
    } catch (error) {
      console.error('Error in book submission process:', error);
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
          <TextCustom style={styles.loadingText} fontSize={16}>Loading book data...</TextCustom>
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
              {isEditMode ? 'Edit Book' : 'Add Book'}
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
                  placeholder="Enter book title"
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
                  placeholder="Enter book subject"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={16}>Select Exam</TextCustom>
                <TouchableOpacity 
                  style={styles.examPicker}
                  onPress={toggleExamPicker}
                >
                  <TextCustom style={selectedExam ? styles.selectedExamText : styles.examPickerText} fontSize={14}>
                    {selectedExam ? selectedExam.name : 'Select an exam'}
                  </TextCustom>
                  <Ionicons name="chevron-down" size={20} color="#6B46C1" />
                </TouchableOpacity>
                
                {showExamPicker && (
                  <View style={styles.examDropdown}>
                    <ScrollView style={styles.examList} nestedScrollEnabled={true}>
                      {exams.map(exam => (
                        <TouchableOpacity 
                          key={exam.$id}
                          style={styles.examItem}
                          onPress={() => handleExamSelect(exam)}
                        >
                          <TextCustom style={styles.examItemText} fontSize={14}>
                            {exam.name}
                          </TextCustom>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={16}>Description</TextCustom>
                <TextInput
                  style={[styles.textInput, styles.textAreaInput]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter book description"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={16}>Cover Image</TextCustom>
                
                {coverImageUri && (
                  <View style={styles.coverImageContainer}>
                    <Image 
                      source={{ uri: coverImageUri }} 
                      style={styles.coverImage}
                      resizeMode="cover"
                    />
                  </View>
                )}
                
                <TouchableOpacity 
                  style={styles.filePicker}
                  onPress={handleCoverImagePick}
                >
                  <Ionicons name="image" size={24} color="#6B46C1" />
                  <TextCustom style={styles.filePickerText} fontSize={14}>
                    {selectedCoverImage ? 'Change cover image' : 'Select cover image'}
                  </TextCustom>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={16}>Book File</TextCustom>
                
                {existingFileId && !selectedFile && (
                  <View style={styles.existingFileContainer}>
                    <TextCustom style={styles.existingFileName} fontSize={14}>
                      Current file: {existingFileName}
                    </TextCustom>
                  </View>
                )}
                
                <TouchableOpacity 
                  style={styles.filePicker}
                  onPress={handleFilePick}
                >
                  <Ionicons name="document-attach" size={24} color="#6B46C1" />
                  <TextCustom style={styles.filePickerText} fontSize={14}>
                    {selectedFile && !selectedFile.canceled && selectedFile.assets[0]?.name || 'Select PDF or EPUB file'}
                  </TextCustom>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <TextCustom style={styles.submitButtonText} fontSize={16}>
                    {isEditMode ? 'Update Book' : 'Add Book'}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  formContainer: {
    padding: 20,
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
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textAreaInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    color: '#666',
    marginTop: 5,
  },
  existingFileContainer: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 10,
  },
  existingFileName: {
    color: '#333',
  },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  filePickerText: {
    marginLeft: 10,
    color: '#666',
    flex: 1,
  },
  examPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  examPickerText: {
    color: '#999',
  },
  selectedExamText: {
    color: '#333',
  },
  examDropdown: {
    marginTop: 5,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    maxHeight: 150,
  },
  examList: {
    padding: 8,
  },
  examItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  examItemText: {
    color: '#333',
  },
  coverImageContainer: {
    width: '100%',
    height: 200,
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  submitButton: {
    backgroundColor: '#6B46C1',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}); 