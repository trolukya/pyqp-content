import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Text, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { database, storage } from '../../lib/appwriteConfig';
import { Models } from 'react-native-appwrite';
import { Query } from 'react-native-appwrite';
import TextCustom from '../components/TextCustom';
import BottomTabBar from '../components/BottomTabBar';
import { router } from 'expo-router';

// Appwrite config
const DATABASE_ID = '67f3615a0027484c95d5';
const JOB_UPDATES_COLLECTION_ID = '6809d0e1001e73976b82';
const BUCKET_ID = '6805d851000f17ea756f';

// Job update interface
interface JobUpdate extends Models.Document {
  title: string;
  description: string;
  lastDate?: string;
  imageId?: string;
  createdAt: string;
  updatedAt: string;
}

export default function JobAlerts() {
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
        console.log('Error fetching job updates:', error);
        setJobUpdates([]);
      }
    } catch (error) {
      console.error('Error fetching job updates:', error);
    } finally {
      setLoading(false);
    }
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
          <TextCustom style={styles.headerTitle} fontSize={18}>
            Job Alerts
          </TextCustom>
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
              <TextCustom style={styles.emptyText} fontSize={16}>No job alerts available</TextCustom>
              <TextCustom style={styles.subEmptyText} fontSize={14}>
                Check back later for new opportunities
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
                      style={[styles.jobDescription, {marginBottom: 16, fontSize: 14, color: '#666'}]}
                    >
                      {job.description}
                    </Text>
                    
                    <TouchableOpacity 
                      style={styles.applyButton}
                      onPress={() => router.push(`/job-details?id=${job.$id}`)}
                    >
                      <TextCustom style={styles.applyButtonText} fontSize={14}>Know More</TextCustom>
                    </TouchableOpacity>
                    
                    <View style={styles.jobFooter}>
                      <TextCustom style={styles.jobDate} fontSize={12}>
                        Posted: {new Date(job.createdAt).toLocaleDateString()}
                      </TextCustom>
                      {job.lastDate && (
                        <TextCustom style={styles.lastDate} fontSize={12}>
                          Last Date: {job.lastDate}
                        </TextCustom>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
        
        <BottomTabBar activeTab="jobs" />
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
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#6B46C1',
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
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
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  jobDate: {
    color: '#999',
  },
  lastDate: {
    color: '#ff6b6b',
    fontWeight: '500',
  },
  applyButton: {
    backgroundColor: '#6B46C1',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}); 