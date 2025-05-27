import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import TextCustom from '../../components/TextCustom';
import { database, storage } from '../../../lib/appwriteConfig';
import { Models, ID } from 'react-native-appwrite';

// Appwrite config
const DATABASE_ID = '67f3615a0027484c95d5';
const JOB_UPDATES_COLLECTION_ID = '6809d0e1001e73976b82';
const BUCKET_ID = '6805d851000f17ea756f';

// Job update interface
interface JobUpdate extends Models.Document {
  title: string;
  description: string;
  lastDate?: string;
  notificationDate?: string;
  applyStartDate?: string;
  applyEndDate?: string;
  organization?: string;
  applyMode?: string;
  examType?: string;
  applicationFee?: string;
  links?: { title: string; url: string }[];
  howToApply?: string;
  detailedDescription?: string;
  imageId?: string;
  createdAt: string;
  updatedAt: string;
}

export default function EditJobUpdate() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lastDate, setLastDate] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [imageId, setImageId] = useState<string | null>(null);
  
  // Additional Info
  const [notificationDate, setNotificationDate] = useState('');
  const [applyStartDate, setApplyStartDate] = useState('');
  const [applyEndDate, setApplyEndDate] = useState('');
  const [organization, setOrganization] = useState('');
  const [applyMode, setApplyMode] = useState('');
  const [examType, setExamType] = useState('');
  const [applicationFee, setApplicationFee] = useState('');
  const [links, setLinks] = useState<{ title: string; url: string }[]>([]);
  const [howToApply, setHowToApply] = useState('');
  const [detailedDescription, setDetailedDescription] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      Alert.alert('Error', 'No job ID provided');
      router.back();
      return;
    }
    fetchJobDetails();
  }, [id]);

  const fetchJobDetails = async () => {
    try {
      setInitialLoading(true);
      const response = await database.getDocument(
        DATABASE_ID,
        JOB_UPDATES_COLLECTION_ID,
        id as string
      );
      
      const job = response as JobUpdate;
      setTitle(job.title);
      setDescription(job.description);
      setLastDate(job.lastDate || '');
      
      // Set additional info
      setNotificationDate(job.notificationDate || '');
      setApplyStartDate(job.applyStartDate || '');
      setApplyEndDate(job.applyEndDate || '');
      setOrganization(job.organization || '');
      setApplyMode(job.applyMode || '');
      setExamType(job.examType || '');
      setApplicationFee(job.applicationFee || '');
      
      // Handle links - convert from old format if needed
      if (job.links) {
        if (Array.isArray(job.links)) {
          if (job.links.length > 0) {
            // Check if the first item is a string or an object with title/url properties
            const firstItem = job.links[0];
            if (typeof firstItem === 'string') {
              // Convert from old format (string[]) to new format
              const oldLinks = job.links as unknown as string[];
              const convertedLinks = oldLinks.map(link => ({ title: '', url: link }));
              setLinks(convertedLinks);
            } else if (typeof firstItem === 'object' && firstItem !== null) {
              // Assume it's already in the new format
              setLinks(job.links as unknown as { title: string; url: string }[]);
            } else {
              setLinks([]);
            }
          } else {
            setLinks([]);
          }
        } else {
          setLinks([]);
        }
      } else {
        setLinks([]);
      }
      
      setHowToApply(job.howToApply || '');
      setDetailedDescription(job.detailedDescription || '');
      
      if (job.imageId) {
        setImageId(job.imageId);
        
        try {
          const fileUrl = await storage.getFileView(BUCKET_ID, job.imageId);
          setImage(fileUrl.href);
        } catch (error) {
          console.error('Error loading image:', error);
        }
      }
      
    } catch (error) {
      console.error('Error fetching job details:', error);
      Alert.alert('Error', 'Failed to load job details');
      router.back();
    } finally {
      setInitialLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      
      // Extract filename from URI
      const uri = result.assets[0].uri;
      const name = uri.split('/').pop() || `job_image_${Date.now()}.jpg`;
      setFileName(name);
      
      // Mark that the image was changed
      setImageId(null);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a job title');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a job description');
      return;
    }

    setLoading(true);

    try {
      let updatedImageId = imageId;

      // If a new image was selected
      if (image && fileName && !imageId) {
        try {
          // For simplicity, we'll create a new file 
          // In a real app, you'd delete the old file first
          const response = await fetch(image);
          if (response.ok) {
            const blob = await response.blob();
            const file = {
              name: fileName,
              type: blob.type || 'image/jpeg',
              size: blob.size,
              uri: image
            };

            // Create a new file
            const uploadResult = await storage.createFile(
              BUCKET_ID,
              ID.unique(),
              file
            );
            
            updatedImageId = uploadResult.$id;
            
            // Delete old image if there was one
            if (imageId) {
              try {
                await storage.deleteFile(BUCKET_ID, imageId);
              } catch (error) {
                console.error('Error deleting old image:', error);
              }
            }
          }
        } catch (error) {
          console.error('Error uploading new image:', error);
          Alert.alert('Warning', 'Failed to upload new image');
        }
      }

      // Update the job document
      const now = new Date().toISOString();
      
      // Filter out empty links
      const filteredLinks = links.filter(link => link.title.trim() !== '' || link.url.trim() !== '');
      
      // Convert links to string format for database compatibility
      const stringLinks = filteredLinks.map(link => {
        // If title is empty, just use the URL
        if (!link.title.trim()) {
          return link.url;
        } 
        // If both are provided, use format "title: url"
        return `${link.title}: ${link.url}`;
      });
      
      console.log('Updating job document with these links:', JSON.stringify(stringLinks));
      
      console.log('Updating job document with data:', {
        title,
        description,
        lastDate,
        notificationDate,
        applyStartDate,
        applyEndDate,
        organization,
        applyMode,
        examType,
        applicationFee,
        links: stringLinks,
        howToApply,
        detailedDescription,
        updatedAt: now,
        ...(updatedImageId !== undefined ? { imageId: updatedImageId } : {})
      });
      
      const updatedDoc = await database.updateDocument(
        DATABASE_ID,
        JOB_UPDATES_COLLECTION_ID,
        id as string,
        {
          title: title,
          description: description,
          lastDate: lastDate || null,
          notificationDate,
          applyStartDate,
          applyEndDate,
          organization,
          applyMode,
          examType,
          applicationFee,
          links: stringLinks.length > 0 ? stringLinks : null,
          howToApply,
          detailedDescription,
          updatedAt: now,
          ...(updatedImageId !== undefined ? { imageId: updatedImageId } : {})
        }
      );
      
      console.log('Job updated successfully:', updatedDoc.$id);
      Alert.alert(
        'Success', 
        'Job update saved successfully',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Error updating job:', error);
      let errorMessage = 'Failed to update job details. ';
      try {
        if (error.message) {
          errorMessage += 'Message: ' + error.message;
        }
        if (error.code) {
          errorMessage += '\nCode: ' + error.code;
        }
        if (error.response) {
          errorMessage += '\nResponse: ' + JSON.stringify(error.response);
        }
      } catch (e) {
        errorMessage += '\nCould not parse error details';
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6B46C1" />
          <TextCustom style={styles.loadingText} fontSize={16}>Loading job details...</TextCustom>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TextCustom style={styles.headerTitle} fontSize={18}>
              Edit Job Update
            </TextCustom>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={styles.formContainer}>
            <View style={styles.formGroup}>
              <TextCustom style={styles.label} fontSize={14}>Job Title *</TextCustom>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter job title"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <TextCustom style={styles.label} fontSize={14}>Job Description *</TextCustom>
              <TextInput
                style={styles.textArea}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter job description"
                placeholderTextColor="#999"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <TextCustom style={styles.label} fontSize={14}>Last Date</TextCustom>
              <TextInput
                style={styles.input}
                value={lastDate}
                onChangeText={setLastDate}
                placeholder="Enter last date to apply (e.g., 30-06-2023)"
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={styles.formGroup}>
              <TextCustom style={styles.label} fontSize={14}>Notification Date</TextCustom>
              <TextInput
                style={styles.input}
                value={notificationDate}
                onChangeText={setNotificationDate}
                placeholder="Enter notification date (e.g., 15-07-2023)"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <TextCustom style={styles.label} fontSize={14}>Apply Start Date</TextCustom>
              <TextInput
                style={styles.input}
                value={applyStartDate}
                onChangeText={setApplyStartDate}
                placeholder="Enter apply start date (e.g., 01-06-2023)"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <TextCustom style={styles.label} fontSize={14}>Apply End Date</TextCustom>
              <TextInput
                style={styles.input}
                value={applyEndDate}
                onChangeText={setApplyEndDate}
                placeholder="Enter apply end date (e.g., 30-06-2023)"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <TextCustom style={styles.label} fontSize={14}>Organization</TextCustom>
              <TextInput
                style={styles.input}
                value={organization}
                onChangeText={setOrganization}
                placeholder="Enter organization name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <TextCustom style={styles.label} fontSize={14}>Apply Mode</TextCustom>
              <TextInput
                style={styles.input}
                value={applyMode}
                onChangeText={setApplyMode}
                placeholder="Enter apply mode (e.g., Online, Offline)"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <TextCustom style={styles.label} fontSize={14}>Exam Type</TextCustom>
              <TextInput
                style={styles.input}
                value={examType}
                onChangeText={setExamType}
                placeholder="Enter exam type"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <TextCustom style={styles.label} fontSize={14}>Application Fee</TextCustom>
              <TextInput
                style={styles.input}
                value={applicationFee}
                onChangeText={setApplicationFee}
                placeholder="Enter application fee"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <TextCustom style={styles.label} fontSize={14}>Links</TextCustom>
                <TouchableOpacity 
                  style={styles.addLinkButton}
                  onPress={() => setLinks([...links, { title: '', url: '' }])}
                >
                  <Ionicons name="add-circle" size={20} color="#6B46C1" />
                  <TextCustom style={styles.addLinkText} fontSize={14}>
                    Add Link
                  </TextCustom>
                </TouchableOpacity>
              </View>
              {links.map((link, index) => (
                <View key={index} style={styles.linkContainer}>
                  <TextInput
                    style={[styles.input, styles.linkInput, { marginBottom: 8 }]}
                    value={link.title}
                    onChangeText={(text) => {
                      const updatedLinks = [...links];
                      updatedLinks[index].title = text;
                      setLinks(updatedLinks);
                    }}
                    placeholder="Link title"
                    placeholderTextColor="#999"
                  />
                  <View style={styles.linkRow}>
                    <TextInput
                      style={[styles.input, styles.linkInput, { flex: 1 }]}
                      value={link.url}
                      onChangeText={(text) => {
                        const updatedLinks = [...links];
                        updatedLinks[index].url = text;
                        setLinks(updatedLinks);
                      }}
                      placeholder="Enter website URL"
                      placeholderTextColor="#999"
                    />
                    <TouchableOpacity 
                      style={styles.removeLinkButton}
                      onPress={() => {
                        const updatedLinks = [...links];
                        updatedLinks.splice(index, 1);
                        setLinks(updatedLinks);
                      }}
                    >
                      <Ionicons name="close-circle" size={24} color="#dc3545" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.formGroup}>
              <TextCustom style={styles.label} fontSize={14}>How To Apply</TextCustom>
              <TextInput
                style={styles.textArea}
                value={howToApply}
                onChangeText={setHowToApply}
                placeholder="Enter how to apply instructions"
                placeholderTextColor="#999"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <TextCustom style={styles.label} fontSize={14}>Detailed Description</TextCustom>
              <TextInput
                style={styles.textArea}
                value={detailedDescription}
                onChangeText={setDetailedDescription}
                placeholder="Enter detailed job description"
                placeholderTextColor="#999"
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <TextCustom style={styles.label} fontSize={14}>Job Image</TextCustom>
              <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.previewImage} />
                ) : (
                  <View style={styles.placeholderContainer}>
                    <Ionicons name="image-outline" size={40} color="#ccc" />
                    <TextCustom style={styles.placeholderText} fontSize={14}>
                      Tap to select an image
                    </TextCustom>
                  </View>
                )}
              </TouchableOpacity>
              {image && (
                <TouchableOpacity 
                  style={styles.removeImageButton} 
                  onPress={() => { 
                    setImage(null); 
                    setFileName(null);
                    setImageId(null);
                  }}
                >
                  <Ionicons name="close-circle" size={24} color="#dc3545" />
                  <TextCustom style={styles.removeImageText} fontSize={14}>
                    Remove Image
                  </TextCustom>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <TextCustom style={styles.submitButtonText} fontSize={16}>
                  Update Job
                </TextCustom>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#6B46C1',
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontWeight: '500',
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
  },
  imagePicker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
    height: 200,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    marginTop: 10,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  removeImageText: {
    color: '#dc3545',
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: '#6B46C1',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  linkContainer: {
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  removeLinkButton: {
    marginLeft: 8,
    padding: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0ebfa',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  addLinkText: {
    color: '#6B46C1',
    marginLeft: 6,
    fontWeight: '500',
  },
}); 