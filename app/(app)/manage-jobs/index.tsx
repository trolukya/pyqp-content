import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator, Image, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { database, storage } from '../../../lib/appwriteConfig';
import { Models, Query } from 'react-native-appwrite';
import TextCustom from '../../components/TextCustom';
import AdminTabBar from '../../components/AdminTabBar';

// Appwrite config
const DATABASE_ID = '67f3615a0027484c95d5';
const JOB_UPDATES_COLLECTION_ID = '6809d0e1001e73976b82'; // User's specific collection ID
const BUCKET_ID = '6805d851000f17ea756f';

// Job update interface
interface JobUpdate extends Models.Document {
  title: string;
  description: string;
  imageId?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ManageJobs() {
  const [jobUpdates, setJobUpdates] = useState<JobUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchJobUpdates();
  }, []);

  const fetchJobUpdates = async () => {
    try {
      setLoading(true);
      // Check if collection exists first (this helps with first-time setup)
      try {
        const response = await database.listDocuments(
          DATABASE_ID,
          JOB_UPDATES_COLLECTION_ID,
          [Query.orderDesc('$createdAt')]
        );
        
        const jobs = response.documents as JobUpdate[];
        setJobUpdates(jobs);
        
        // Load image URLs for jobs that have images
        const urls: Record<string, string> = {};
        for (const job of jobs) {
          if (job.imageId) {
            try {
              const fileUrl = await storage.getFileView(BUCKET_ID, job.imageId);
              urls[job.imageId] = fileUrl.href;
            } catch (error) {
              console.error(`Error loading image for job ${job.$id}:`, error);
            }
          }
        }
        setImageUrls(urls);
      } catch (error) {
        // Collection might not exist yet
        console.log('Error fetching job updates. The collection may not exist yet:', error);
        setJobUpdates([]);
      }
    } catch (error) {
      console.error('Error fetching job updates:', error);
      Alert.alert('Error', 'Failed to load job updates');
    } finally {
      setLoading(false);
    }
  };

  const handleAddJob = () => {
    router.push('/(app)/manage-jobs/add');
  };

  const handleEditJob = (jobId: string) => {
    router.push({
      pathname: "/(app)/manage-jobs/edit",
      params: { id: jobId }
    });
  };

  const handleDeleteJob = async (jobId: string, imageId?: string) => {
    Alert.alert(
      'Delete Job Update',
      'Are you sure you want to delete this job update?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.deleteDocument(DATABASE_ID, JOB_UPDATES_COLLECTION_ID, jobId);
              
              // If there's an image, delete that too
              if (imageId) {
                try {
                  await storage.deleteFile(BUCKET_ID, imageId);
                } catch (error) {
                  console.error('Error deleting image file:', error);
                }
              }
              
              // Refresh the list
              fetchJobUpdates();
              Alert.alert('Success', 'Job update deleted successfully');
            } catch (error) {
              console.error('Error deleting job update:', error);
              Alert.alert('Error', 'Failed to delete job update');
            }
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobUpdates();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TextCustom style={styles.headerTitle} fontSize={18}>
            Manage Job Updates
          </TextCustom>
          <TouchableOpacity onPress={handleAddJob} style={styles.addButton}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6B46C1']}
              tintColor={'#6B46C1'}
            />
          }
        >
          {loading ? (
            <ActivityIndicator size="large" color="#6B46C1" style={styles.loader} />
          ) : jobUpdates.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="briefcase-outline" size={50} color="#ccc" />
              <TextCustom style={styles.emptyText} fontSize={16}>No job updates available</TextCustom>
              <TextCustom style={styles.subEmptyText} fontSize={14}>
                Tap the + button to add your first job update
              </TextCustom>
            </View>
          ) : (
            <View style={styles.jobsList}>
              {jobUpdates.map((job) => (
                <View key={job.$id} style={styles.jobCard}>
                  {job.imageId && imageUrls[job.imageId] ? (
                    <Image 
                      source={{ uri: imageUrls[job.imageId] }} 
                      style={styles.jobImage} 
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.jobImagePlaceholder}>
                      <Ionicons name="briefcase-outline" size={40} color="#ccc" />
                    </View>
                  )}
                  <View style={styles.jobContent}>
                    <TextCustom style={styles.jobTitle} fontSize={16}>{job.title}</TextCustom>
                    <Text 
                      numberOfLines={2} 
                      style={[styles.jobDescription, {marginBottom: 16, fontSize: 14, color: '#666'}]}
                    >
                      {job.description}
                    </Text>
                    <View style={styles.jobActions}>
                      <TouchableOpacity 
                        onPress={() => handleEditJob(job.$id)} 
                        style={styles.editButton}
                      >
                        <FontAwesome name="edit" size={16} color="#6B46C1" />
                        <TextCustom style={styles.actionButtonText} fontSize={12}>Edit</TextCustom>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleDeleteJob(job.$id, job.imageId)} 
                        style={styles.deleteButton}
                      >
                        <FontAwesome name="trash" size={16} color="#dc3545" />
                        <TextCustom style={[styles.actionButtonText, {color: '#dc3545'}]} fontSize={12}>
                          Delete
                        </TextCustom>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
        
        <AdminTabBar activeTab="manage" />
      </View>
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
    paddingBottom: 60, // Space for bottom tab bar
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
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flexGrow: 1,
    padding: 16,
  },
  loader: {
    marginVertical: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginVertical: 20,
  },
  emptyText: {
    color: '#666',
    marginTop: 10,
  },
  subEmptyText: {
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  jobsList: {
    marginTop: 10,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  jobImage: {
    width: '100%',
    height: 150,
  },
  jobImagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobContent: {
    padding: 16,
  },
  jobTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  jobDescription: {
    color: '#666',
    marginBottom: 16,
  },
  jobActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  actionButtonText: {
    marginLeft: 5,
    color: '#6B46C1',
    fontWeight: '500',
  },
}); 