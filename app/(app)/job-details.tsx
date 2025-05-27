import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
  Alert,
  Text
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { database, storage } from '../../lib/appwriteConfig';
import { Models } from 'react-native-appwrite';
import TextCustom from '../components/TextCustom';

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
  links?: Array<string | { title: string; url: string }>;
  howToApply?: string;
  detailedDescription?: string;
  imageId?: string;
  createdAt: string;
  updatedAt: string;
}

export default function JobDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<JobUpdate | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      Alert.alert('Error', 'Job ID not found');
      router.back();
      return;
    }
    fetchJobDetails();
  }, [id]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const response = await database.getDocument(
        DATABASE_ID,
        JOB_UPDATES_COLLECTION_ID,
        id as string
      );
      
      const jobData = response as JobUpdate;
      setJob(jobData);
      
      // Fetch image if available
      if (jobData.imageId) {
        try {
          const fileUrl = await storage.getFileView(BUCKET_ID, jobData.imageId);
          setImageUrl(fileUrl.href);
        } catch (error) {
          console.error('Error loading image:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
      Alert.alert('Error', 'Failed to load job details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (job?.links && job.links.length > 0) {
      // Find the first valid link
      for (const link of job.links) {
        // Extract URL from link string
        let url = link;
        if (typeof link === 'string' && link.includes(': ')) {
          // If format is "title: url", extract the URL part
          url = link.split(': ').slice(1).join(': ');
        } else if (typeof link === 'object' && link?.url) {
          url = link.url;
        }
        
        if (url && typeof url === 'string') {
          try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
              await Linking.openURL(url);
              return;
            }
          } catch (error) {
            console.error('Error opening URL:', error);
          }
        }
      }
      
      // If we get here, no valid links were found
      Alert.alert('Error', 'No valid application links available');
    } else if (job?.howToApply) {
      // If there's application instructions but no links
      Alert.alert('How to Apply', job.howToApply);
    } else {
      // If no specific application details
      Alert.alert('Application', 'Please check the job description for application details.');
    }
  };

  const renderInfoItem = (label: string, value?: string) => {
    if (!value) return null;
    return (
      <View style={styles.infoItem}>
        <TextCustom style={styles.infoLabel} fontSize={14}>{label}:</TextCustom>
        <TextCustom style={styles.infoValue} fontSize={14}>{value}</TextCustom>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6B46C1" />
          <TextCustom style={styles.loadingText} fontSize={16}>Loading job details...</TextCustom>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={50} color="#ff6b6b" />
          <TextCustom style={styles.errorText} fontSize={16}>Job not found</TextCustom>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TextCustom style={styles.headerTitle} fontSize={18}>
            Job Details
          </TextCustom>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.contentContainer}>
          {/* Image Section */}
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.jobImage} resizeMode="cover" />
          ) : (
            <View style={styles.jobImagePlaceholder}>
              <Ionicons name="briefcase-outline" size={50} color="#ccc" />
            </View>
          )}

          {/* Job Title and Description */}
          <View style={styles.jobHeaderSection}>
            <TextCustom style={styles.jobTitle} fontSize={20}>{job.title}</TextCustom>
            {job.organization && (
              <TextCustom style={styles.organization} fontSize={16}>{job.organization}</TextCustom>
            )}
            <TextCustom style={styles.description} fontSize={15}>{job.description}</TextCustom>
          </View>

          {/* Key Dates Section */}
          {(job.notificationDate || job.lastDate || job.applyStartDate || job.applyEndDate) && (
            <View style={styles.section}>
              <TextCustom style={styles.sectionTitle} fontSize={16}>Key Dates</TextCustom>
              {renderInfoItem('Notification Date', job.notificationDate)}
              {renderInfoItem('Apply Start Date', job.applyStartDate)}
              {renderInfoItem('Apply End Date', job.applyEndDate)}
              {renderInfoItem('Last Date to Apply', job.lastDate)}
            </View>
          )}

          {/* Application Details Section */}
          {(job.applyMode || job.examType || job.applicationFee) && (
            <View style={styles.section}>
              <TextCustom style={styles.sectionTitle} fontSize={16}>Application Details</TextCustom>
              {renderInfoItem('Application Mode', job.applyMode)}
              {renderInfoItem('Exam Type', job.examType)}
              {renderInfoItem('Application Fee', job.applicationFee)}
            </View>
          )}

          {/* How to Apply Section */}
          {job.howToApply && (
            <View style={styles.section}>
              <TextCustom style={styles.sectionTitle} fontSize={16}>How to Apply</TextCustom>
              <TextCustom style={styles.howToApply} fontSize={14}>{job.howToApply}</TextCustom>
            </View>
          )}

          {/* Detailed Description Section */}
          {job.detailedDescription && (
            <View style={styles.section}>
              <TextCustom style={styles.sectionTitle} fontSize={16}>Detailed Description</TextCustom>
              <TextCustom style={styles.detailedDescription} fontSize={14}>{job.detailedDescription}</TextCustom>
            </View>
          )}

          {/* Links Section */}
          {job.links && job.links.length > 0 && (
            <View style={styles.section}>
              <TextCustom style={styles.sectionTitle} fontSize={16}>Important Links</TextCustom>
              {job.links.map((link, index) => {
                // Handle null or invalid links
                if (!link) {
                  return (
                    <View key={index} style={styles.linkItem}>
                      <Ionicons name="alert-circle-outline" size={18} color="#ff6b6b" />
                      <TextCustom style={[styles.linkText, {color: '#ff6b6b'}]} fontSize={14}>
                        Invalid Link
                      </TextCustom>
                    </View>
                  );
                }
                
                // Handle different link formats
                let title = '';
                let url = '';
                
                if (typeof link === 'string') {
                  if (link.includes(': ')) {
                    // Format: "title: url"
                    const parts = link.split(': ');
                    title = parts[0];
                    url = parts.slice(1).join(': ');
                  } else {
                    // Just a URL
                    title = link;
                    url = link;
                  }
                } else if (typeof link === 'object') {
                  title = link.title || link.url;
                  url = link.url;
                }
                
                return (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.linkItem}
                    onPress={() => Linking.openURL(url)}
                  >
                    <Ionicons name="link-outline" size={18} color="#6B46C1" />
                    <TextCustom style={styles.linkText} fontSize={14}>
                      {title || 'Link'}
                    </TextCustom>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Posted Date */}
          <View style={styles.footerSection}>
            <TextCustom style={styles.postedDate} fontSize={12}>
              Posted: {new Date(job.createdAt).toLocaleDateString()}
            </TextCustom>
            <TextCustom style={styles.updatedDate} fontSize={12}>
              Updated: {new Date(job.updatedAt).toLocaleDateString()}
            </TextCustom>
          </View>
        </ScrollView>
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
  contentContainer: {
    padding: 0,
  },
  jobImage: {
    width: '100%',
    height: 200,
  },
  jobImagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobHeaderSection: {
    padding: 16,
    backgroundColor: '#fff',
  },
  jobTitle: {
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 5,
  },
  organization: {
    color: '#6B46C1',
    marginBottom: 12,
    fontWeight: '500',
  },
  description: {
    color: '#444',
    lineHeight: 22,
  },
  section: {
    marginTop: 8,
    backgroundColor: '#fff',
    padding: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    flex: 1,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    flex: 1.5,
    color: '#333',
  },
  howToApply: {
    color: '#333',
    lineHeight: 20,
  },
  detailedDescription: {
    color: '#333',
    lineHeight: 20,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkText: {
    color: '#6B46C1',
    marginLeft: 8,
    textDecorationLine: 'underline',
  },
  footerSection: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  postedDate: {
    color: '#999',
  },
  updatedDate: {
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#666',
    marginTop: 12,
  },
}); 