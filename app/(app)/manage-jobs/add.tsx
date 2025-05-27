import React, { useState } from 'react';
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import TextCustom from '../../components/TextCustom';
import { database, storage } from '../../../lib/appwriteConfig';
import { Models, ID, Query } from 'react-native-appwrite';

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
  imageId?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AddJobUpdate() {
  // Basic info (Step 1)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lastDate, setLastDate] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Additional info (Step 2)
  const [notificationDate, setNotificationDate] = useState('');
  const [applyStartDate, setApplyStartDate] = useState('');
  const [applyEndDate, setApplyEndDate] = useState('');
  const [organization, setOrganization] = useState('');
  const [applyMode, setApplyMode] = useState('');
  const [examType, setExamType] = useState('');
  const [applicationFee, setApplicationFee] = useState('');
  const [links, setLinks] = useState<{ title: string; url: string }[]>([{ title: '', url: '' }]);
  const [howToApply, setHowToApply] = useState('');
  const [detailedDescription, setDetailedDescription] = useState('');

  const [step, setStep] = useState(1); // Track current step
  const [loading, setLoading] = useState(false);

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
    }
  };

  const handleNextStep = () => {
    // Validate first step fields
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a job title');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a job description');
      return;
    }

    // Move to next step
    setStep(2);
  };

  const addLink = () => {
    setLinks([...links, { title: '', url: '' }]);
  };

  const updateLinkTitle = (text: string, index: number) => {
    const newLinks = [...links];
    newLinks[index].title = text;
    setLinks(newLinks);
  };

  const updateLinkUrl = (text: string, index: number) => {
    const newLinks = [...links];
    newLinks[index].url = text;
    setLinks(newLinks);
  };

  const removeLink = (index: number) => {
    const newLinks = [...links];
    newLinks.splice(index, 1);
    setLinks(newLinks);
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      console.log('Starting job creation with collection ID:', JOB_UPDATES_COLLECTION_ID);
      
      // Skip the collection check since we know it exists
      let imageId = null;

      // Upload image if one was selected
      if (image && fileName) {
        try {
          console.log('Uploading image...');
          const response = await fetch(image);
          if (response.ok) {
            const blob = await response.blob();
            const file = {
              name: fileName,
              type: blob.type || 'image/jpeg',
              size: blob.size,
              uri: image
            };
            
            console.log('Image file prepared:', { name: fileName, size: blob.size });

            const result = await storage.createFile(
              BUCKET_ID,
              ID.unique(),
              file
            );

            imageId = result.$id;
            console.log('Image uploaded successfully, ID:', imageId);
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          Alert.alert('Warning', 'Failed to upload image, but will continue creating job update');
        }
      }

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

      // Create the job update
      const now = new Date().toISOString();
      console.log('Creating job document with links:', JSON.stringify(stringLinks));
      console.log('Creating job document with data:', {
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
        imageId,
        createdAt: now,
        updatedAt: now
      });
      
      const result = await database.createDocument(
        DATABASE_ID,
        JOB_UPDATES_COLLECTION_ID,
        ID.unique(),
        {
          title: title,
          description: description,
          lastDate: lastDate || null,
          notificationDate: notificationDate || null,
          applyStartDate: applyStartDate || null,
          applyEndDate: applyEndDate || null,
          organization: organization || null,
          applyMode: applyMode || null,
          examType: examType || null,
          applicationFee: applicationFee || null,
          links: stringLinks.length > 0 ? stringLinks : null,
          howToApply: howToApply || null,
          detailedDescription: detailedDescription || null,
          imageId: imageId,
          createdAt: now,
          updatedAt: now
        }
      );

      console.log('Job created successfully, ID:', result.$id);
      Alert.alert('Success', 'Job update created successfully');
      router.back();
    } catch (error: any) {
      console.error('Error creating job update:', error);
      // More detailed error message
      let errorMessage = 'Failed to create job update. ';
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => step === 1 ? router.back() : setStep(1)} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TextCustom style={styles.headerTitle} fontSize={18}>
              Add Job Update {step === 2 ? '(2/2)' : '(1/2)'}
            </TextCustom>
            <View style={{ width: 40 }} />
          </View>

          {step === 1 ? (
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
                    onPress={() => { setImage(null); setFileName(null); }}
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
                onPress={handleNextStep}
              >
                <TextCustom style={styles.submitButtonText} fontSize={16}>
                  Next
                </TextCustom>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.formContainer}>
              {/* Additional fields for Step 2 */}
              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={14}>Notification Date</TextCustom>
                <TextInput
                  style={styles.input}
                  value={notificationDate}
                  onChangeText={setNotificationDate}
                  placeholder="Enter notification date"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={14}>Apply Start Date</TextCustom>
                <TextInput
                  style={styles.input}
                  value={applyStartDate}
                  onChangeText={setApplyStartDate}
                  placeholder="Enter application start date"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={14}>Apply End Date</TextCustom>
                <TextInput
                  style={styles.input}
                  value={applyEndDate}
                  onChangeText={setApplyEndDate}
                  placeholder="Enter application end date"
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
                  placeholder="Enter application mode (Online/Offline)"
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
                  <TouchableOpacity onPress={addLink} style={styles.addLinkButton}>
                    <Ionicons name="add-circle" size={20} color="#6B46C1" />
                    <TextCustom style={styles.addLinkText} fontSize={12}>Add Link</TextCustom>
                  </TouchableOpacity>
                </View>
                {links.map((link, index) => (
                  <View key={index} style={styles.linkContainer}>
                    <TextInput
                      style={[styles.input, styles.linkInput, { marginBottom: 8 }]}
                      value={link.title}
                      onChangeText={(text) => updateLinkTitle(text, index)}
                      placeholder="Link title"
                      placeholderTextColor="#999"
                    />
                    <View style={styles.linkRow}>
                      <TextInput
                        style={[styles.input, styles.linkInput, { flex: 1 }]}
                        value={link.url}
                        onChangeText={(text) => updateLinkUrl(text, index)}
                        placeholder="Enter website URL"
                        placeholderTextColor="#999"
                      />
                      {links.length > 1 && (
                        <TouchableOpacity 
                          onPress={() => removeLink(index)}
                          style={styles.removeLinkButton}
                        >
                          <Ionicons name="close-circle" size={24} color="#dc3545" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={14}>How to Apply</TextCustom>
                <TextInput
                  style={styles.textArea}
                  value={howToApply}
                  onChangeText={setHowToApply}
                  placeholder="Enter instructions on how to apply"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
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
                  numberOfLines={5}
                  textAlignVertical="top"
                />
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
                    Save Job Update
                  </TextCustom>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
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
}); 