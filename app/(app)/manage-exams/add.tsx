import React, { useState } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  TextInput,
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
import { ID } from 'react-native-appwrite';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

// Appwrite config constants
const DATABASE_ID = '67f3615a0027484c95d5';
const COLLECTION_ID = '67f630fb0019582e45ac';
const BUCKET_ID = '6805d851000f17ea756f';

interface ExamFormData {
  name: string;
  description: string;
  imageUri?: string;
}

const AddExamScreen: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<ExamFormData>({
    name: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePickerResponse, setImagePickerResponse] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const handleChange = (field: keyof ExamFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const pickImage = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'You need to grant permission to access your photos');
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setImagePickerResponse(selectedAsset);
        setFormData(prev => ({
          ...prev,
          imageUri: selectedAsset.uri
        }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleSubmit = async () => {
    // Validate form
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Exam name is required');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let iconId = null;
      
      // Upload image if exists
      if (imagePickerResponse && formData.imageUri) {
        try {
          const fileId = ID.unique();
          const fileInfo = await FileSystem.getInfoAsync(formData.imageUri);
          
          if (fileInfo.exists) {
            await storage.createFile(
              BUCKET_ID,
              fileId,
              {
                name: imagePickerResponse.fileName || `exam_image_${Date.now()}.jpg`,
                type: imagePickerResponse.mimeType || 'image/jpeg',
                size: fileInfo.size,
                uri: formData.imageUri
              }
            );
            
            // Save the file ID to use in exam document
            iconId = fileId;
          }
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          // Continue with exam creation even if image upload fails
        }
      }
      
      // Create exam document
      const examData = {
        name: formData.name,
        description: formData.description || '',
        iconId: iconId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save exam to database
      const createdExam = await database.createDocument(
        DATABASE_ID,
        COLLECTION_ID,
        ID.unique(),
        examData
      );
      
      Alert.alert(
        'Success', 
        'Exam added successfully!',
        [
          { 
            text: 'OK', 
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error adding exam:', error);
      Alert.alert('Error', 'Failed to add exam. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <TextCustom style={styles.headerTitle}>Add New Exam</TextCustom>
        </View>
        
        <View style={styles.formContainer}>
          {/* Image Upload */}
          <View style={styles.imageUploadContainer}>
            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={pickImage}
            >
              {formData.imageUri ? (
                <Image 
                  source={{ uri: formData.imageUri }} 
                  style={styles.previewImage} 
                />
              ) : (
                <View style={styles.placeholderContainer}>
                  <FontAwesome name="camera" size={24} color="#666" />
                  <TextCustom style={styles.placeholderText}>
                    Upload Exam Icon
                  </TextCustom>
                </View>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Exam Name */}
          <View style={styles.inputGroup}>
            <TextCustom style={styles.label}>Exam Name*</TextCustom>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => handleChange('name', text)}
              placeholder="Enter exam name (e.g., SSC CGL)"
              placeholderTextColor="#999"
            />
          </View>
          
          {/* Description */}
          <View style={styles.inputGroup}>
            <TextCustom style={styles.label}>Description</TextCustom>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => handleChange('description', text)}
              placeholder="Enter exam description"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
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
                  Save Exam
                </TextCustom>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <AdminTabBar activeTab="manage" />
    </KeyboardAvoidingView>
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
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageUploadContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePickerButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    minHeight: 100,
  },
  submitButton: {
    backgroundColor: '#6B46C1',
    borderRadius: 8,
    padding: 15,
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
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default AddExamScreen; 