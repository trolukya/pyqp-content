import { View, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from "react-native";
import React, { useState, useEffect } from "react";
import { database, storage } from "../../lib/appwriteConfig";
import { Models } from "react-native-appwrite";
import { FontAwesome } from '@expo/vector-icons';
import { router, useLocalSearchParams } from "expo-router";
import TextCustom from "../components/TextCustom";
import AdminTabBar from "../components/AdminTabBar";
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Appwrite config constants
const DATABASE_ID = '67f3615a0027484c95d5';
const PAPERS_COLLECTION_ID = '6805e9460039cc752d42';
const SIMPLE_PAPERS_COLLECTION_ID = '680b65cd002eb9c1b7a9';
const EXAMS_COLLECTION_ID = '67f630fb0019582e45ac';
const PAPERS_BUCKET_ID = '6805d851000f17ea756f';

// AsyncStorage key
const SAVED_PAPERS_KEY = 'savedPapers';

// Define the paper document type
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

export default function PaperDetailsScreen() {
  const params = useLocalSearchParams();
  const paperId = params.id as string;
  
  const [paper, setPaper] = useState<PaperDocument | null>(null);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [savedPapers, setSavedPapers] = useState<string[]>([]);

  useEffect(() => {
    if (paperId) {
      fetchPaperDetails();
      loadSavedPapers();
    }
  }, [paperId]);

  const loadSavedPapers = async () => {
    try {
      const storedPapers = await AsyncStorage.getItem(SAVED_PAPERS_KEY);
      if (storedPapers) {
        setSavedPapers(JSON.parse(storedPapers));
      }
    } catch (error) {
      console.error('Error loading saved papers:', error);
    }
  };

  const handleSavePaper = async () => {
    if (!paper) return;
    
    try {
      // Check if already saved
      const isSaved = savedPapers.includes(paper.$id);
      
      if (isSaved) {
        // Remove from saved papers
        const updatedSaved = savedPapers.filter(id => id !== paper.$id);
        setSavedPapers(updatedSaved);
        await AsyncStorage.setItem(SAVED_PAPERS_KEY, JSON.stringify(updatedSaved));
        Alert.alert('Removed', `${paper.paperName} has been removed from your saved papers.`);
      } else {
        // Add to saved papers
        const updatedSaved = [...savedPapers, paper.$id];
        setSavedPapers(updatedSaved);
        await AsyncStorage.setItem(SAVED_PAPERS_KEY, JSON.stringify(updatedSaved));
        Alert.alert('Saved', `${paper.paperName} has been added to your saved papers.`);
      }
    } catch (error) {
      console.error('Error saving paper:', error);
      Alert.alert('Error', 'Failed to save the paper. Please try again.');
    }
  };

  const fetchPaperDetails = async () => {
    setLoading(true);
    try {
      // Try to fetch from original collection first
      let paperData: PaperDocument | null = null;
      
      try {
        // Attempt to get the paper from the original collection
        const response = await database.getDocument(
          DATABASE_ID,
          PAPERS_COLLECTION_ID,
          paperId
        );
        paperData = response as PaperDocument;
      } catch (error) {
        console.log('Paper not found in original collection, trying simple collection...');
        // If not found, try the new collection
        try {
          const response = await database.getDocument(
            DATABASE_ID,
            SIMPLE_PAPERS_COLLECTION_ID,
            paperId
          );
          paperData = response as PaperDocument;
        } catch (innerError) {
          console.error('Paper not found in either collection:', innerError);
          throw new Error('Paper not found in either collection');
        }
      }
      
      if (!paperData) {
        throw new Error('Failed to load paper data');
      }
      
      // Fetch exam details if examId exists
      if (paperData.examId) {
        try {
          const examResponse = await database.getDocument(
            DATABASE_ID,
            EXAMS_COLLECTION_ID,
            paperData.examId
          );
          paperData.examName = examResponse.name;
        } catch (error) {
          console.error(`Error fetching exam details:`, error);
          paperData.examName = 'Unknown Exam';
        }
      } else {
        paperData.examName = 'No Exam';
      }
      
      // Get file URL
      const fileUrlResponse = await storage.getFileView(
        PAPERS_BUCKET_ID,
        paperData.fileId
      );
      
      setPaper(paperData);
      setFileUrl(fileUrlResponse.href);
    } catch (error) {
      console.error('Error fetching paper details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={20} color="#333" />
          </TouchableOpacity>
          <TextCustom style={styles.headerTitle}>
            {loading ? 'Loading...' : paper?.paperName || 'Paper Details'}
          </TextCustom>
          {paper && (
            <TouchableOpacity 
              style={[
                styles.saveButton, 
                savedPapers.includes(paper.$id) ? styles.activeSaveButton : {}
              ]}
              onPress={handleSavePaper}
            >
              <FontAwesome 
                name={savedPapers.includes(paper.$id) ? "bookmark" : "bookmark-o"} 
                size={20} 
                color="#fff" 
              />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#6B46C1" />
          </View>
        ) : paper ? (
          <View style={styles.contentContainer}>
            <View style={styles.paperInfo}>
              <TextCustom style={styles.paperTitle}>{paper.paperName}</TextCustom>
              <TextCustom style={styles.paperMeta}>
                {paper.examName} | {paper.year}
              </TextCustom>
              
              {paper.description && (
                <TextCustom style={styles.paperDescription}>
                  {paper.description}
                </TextCustom>
              )}
            </View>
            
            {fileUrl && (
              <View style={styles.fileViewerContainer}>
                <WebView 
                  source={{ uri: fileUrl }}
                  style={styles.webView}
                  startInLoadingState={true}
                  renderLoading={() => (
                    <ActivityIndicator 
                      size="large" 
                      color="#6B46C1" 
                      style={styles.webViewLoader}
                    />
                  )}
                />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.errorContainer}>
            <FontAwesome name="exclamation-circle" size={50} color="#dc3545" />
            <TextCustom style={styles.errorText}>
              Failed to load paper details
            </TextCustom>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchPaperDetails}
            >
              <TextCustom style={styles.retryButtonText}>Retry</TextCustom>
            </TouchableOpacity>
          </View>
        )}
        
        <AdminTabBar activeTab="home" />
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#28A745',
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  activeSaveButton: {
    backgroundColor: '#218838',
    borderWidth: 1,
    borderColor: '#fff',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  paperInfo: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  paperTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  paperMeta: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  paperDescription: {
    fontSize: 14,
    color: '#555',
    marginTop: 12,
    lineHeight: 20,
  },
  fileViewerContainer: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  webView: {
    flex: 1,
  },
  webViewLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#6B46C1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}); 