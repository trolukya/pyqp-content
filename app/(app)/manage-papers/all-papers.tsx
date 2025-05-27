import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView, SafeAreaView } from "react-native";
import React, { useState, useEffect } from "react";
import { database, storage } from "../../../lib/appwriteConfig";
import { Query, Models } from "react-native-appwrite";
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { router } from "expo-router";
import TextCustom from "../../components/TextCustom";
import AdminTabBar from "../../components/AdminTabBar";
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
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

export default function AllPapersScreen() {
  const [papers, setPapers] = useState<PaperDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savedPapers, setSavedPapers] = useState<string[]>([]);

  useEffect(() => {
    fetchPapers();
    loadSavedPapers();
  }, []);

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

  const handleSavePaper = async (paper: PaperDocument) => {
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

  const fetchPapers = async () => {
    setLoading(true);
    try {
      // Fetch papers from original collection
      const originalResponse = await database.listDocuments(
        DATABASE_ID,
        PAPERS_COLLECTION_ID,
        [Query.orderDesc('$createdAt')]
      );
      
      // Fetch papers from new collection
      const newResponse = await database.listDocuments(
        DATABASE_ID,
        SIMPLE_PAPERS_COLLECTION_ID,
        [Query.orderDesc('$createdAt')]
      );
      
      const originalPaperDocs = originalResponse.documents as PaperDocument[];
      const newPaperDocs = newResponse.documents as PaperDocument[];
      
      // Combine both sets of papers
      const allPaperDocs = [...originalPaperDocs, ...newPaperDocs];
      
      // Fetch exam details for each paper to show exam name
      const papersWithExamDetails = await Promise.all(
        allPaperDocs.map(async (paper) => {
          if (!paper.examId) {
            return { ...paper, examName: 'No Exam' };
          }
          
          try {
            const examResponse = await database.getDocument(
              DATABASE_ID,
              EXAMS_COLLECTION_ID,
              paper.examId
            );
            return { ...paper, examName: examResponse.name };
          } catch (error) {
            console.error(`Error fetching exam details for paper ${paper.$id}:`, error);
            return { ...paper, examName: 'Unknown Exam' };
          }
        })
      );
      
      // Sort all papers by creation date
      const sortedPapers = papersWithExamDetails.sort((a, b) => {
        const dateA = a.uploadDate ? new Date(a.uploadDate).getTime() : 
                     a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.uploadDate ? new Date(b.uploadDate).getTime() : 
                     b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      setPapers(sortedPapers);
    } catch (error) {
      console.error('Error fetching papers:', error);
      Alert.alert('Error', 'Failed to load papers. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPapers();
  };

  const handlePaperPress = (paper: PaperDocument) => {
    try {
      // Navigate directly to the paper details page
      router.push({
        pathname: "/(app)/paper-details",
        params: { 
          id: paper.$id
        }
      });
    } catch (error) {
      console.error('Error handling paper press:', error);
      Alert.alert('Error', 'Failed to open paper. Please try again.');
    }
  };

  const handleEditPaper = (paper: PaperDocument) => {
    // Navigate to the edit paper screen with the paper ID
    router.push({
      pathname: "/(app)/manage-papers/edit",
      params: { id: paper.$id }
    });
  };

  const handleDeletePaper = async (paperId: string, isSimplePaper: boolean = false) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this paper? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from the appropriate collection
              const collectionId = isSimplePaper ? SIMPLE_PAPERS_COLLECTION_ID : PAPERS_COLLECTION_ID;
              
              await database.deleteDocument(
                DATABASE_ID,
                collectionId,
                paperId
              );
              // Remove the deleted paper from the state
              setPapers(papers.filter(paper => paper.$id !== paperId));
              Alert.alert('Success', 'Paper deleted successfully');
            } catch (error) {
              console.error('Error deleting paper:', error);
              Alert.alert('Error', 'Failed to delete paper. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDownload = (paper: PaperDocument) => {
    try {
      // Get the file preview URL and open it in browser
      const fileUrl = storage.getFileView(
        PAPERS_BUCKET_ID,
        paper.fileId
      );
      
      Linking.openURL(fileUrl.href);
    } catch (error) {
      console.error('Error downloading paper:', error);
      Alert.alert('Error', 'Failed to download paper. Please try again.');
    }
  };

  const handleAddPaper = () => {
    router.push('/(app)/manage-papers/add');
  };

  const renderPaperItem = ({ item }: { item: PaperDocument }) => {
    // Determine the icon based on file type
    const fileIcon = item.fileType?.includes('pdf') 
      ? 'file-pdf-o' 
      : item.fileType?.includes('image') 
        ? 'file-image-o' 
        : 'file-text-o';
    
    // Determine if this is a paper from the new collection
    const isSimplePaper = Boolean(!item.createdAt && item.uploadDate);
    
    // Get the date string
    const dateString = item.uploadDate 
      ? new Date(item.uploadDate).toLocaleDateString() 
      : item.createdAt 
        ? new Date(item.createdAt).toLocaleDateString()
        : 'Unknown date';

    return (
      <TouchableOpacity
        style={styles.paperCard}
        onPress={() => handlePaperPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.paperHeader}>
          <View style={styles.paperIconContainer}>
            <FontAwesome name={fileIcon} size={20} color="#fff" />
          </View>
          <View style={styles.paperInfo}>
            <TextCustom style={styles.paperName}>
              {item.paperName}
            </TextCustom>
            <TextCustom style={styles.paperMeta}>
              {item.examName} | {item.year || 'No Year'}
            </TextCustom>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                savedPapers.includes(item.$id) ? styles.activeSaveButton : {}
              ]}
              onPress={() => handleSavePaper(item)}
            >
              <FontAwesome 
                name={savedPapers.includes(item.$id) ? "bookmark" : "bookmark-o"} 
                size={18} 
                color="#fff" 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditPaper(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <FontAwesome name="edit" size={18} color="#6B46C1" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeletePaper(item.$id, isSimplePaper)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <FontAwesome name="trash" size={18} color="#dc3545" />
            </TouchableOpacity>
          </View>
        </View>

        {item.description && (
          <TextCustom style={styles.paperDescription}>
            {item.description}
          </TextCustom>
        )}
        
        <View style={styles.paperFooter}>
          <TextCustom style={styles.paperDate}>
            Added on {dateString}
          </TextCustom>
          <TouchableOpacity
            onPress={() => handleDownload(item)}
            activeOpacity={0.7}
          >
            <View style={styles.footerBadge}>
              <FontAwesome name="download" size={12} color="#fff" style={styles.footerBadgeIcon} />
              <TextCustom style={styles.footerBadgeText}>Download</TextCustom>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
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
          <TextCustom style={styles.headerTitle}>Manage Papers</TextCustom>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddPaper}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={24} color="#E53935" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#6B46C1" />
          </View>
        ) : papers.length === 0 ? (
          <ScrollView contentContainerStyle={styles.emptyContainer}>
            <FontAwesome name="file-text" size={70} color="#ccc" />
            <TextCustom style={styles.emptyText}>No papers available yet</TextCustom>
            <TextCustom style={styles.emptySubText}>
              Paper upload feature will be available soon
            </TextCustom>
          </ScrollView>
        ) : (
          <FlatList
            data={papers}
            renderItem={renderPaperItem}
            keyExtractor={(item) => item.$id}
            contentContainerStyle={styles.papersList}
            showsVerticalScrollIndicator={false}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        )}
        
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
  },
  addButton: {
    padding: 8,
    marginLeft: 8,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  papersList: {
    padding: 16,
  },
  paperCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  paperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paperIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6B46C1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paperInfo: {
    flex: 1,
  },
  paperName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  paperMeta: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  paperDescription: {
    fontSize: 14,
    color: '#555',
    marginTop: 12,
    marginBottom: 12,
  },
  paperFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  paperDate: {
    fontSize: 12,
    color: '#888',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    marginRight: 4,
  },
  deleteButton: {
    padding: 8,
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B46C1',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  footerBadgeIcon: {
    marginRight: 4,
  },
  footerBadgeText: {
    fontSize: 12,
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 400,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  saveButton: {
    padding: 8,
    marginRight: 4,
    backgroundColor: '#28A745',
    borderRadius: 12,
  },
  activeSaveButton: {
    backgroundColor: '#218838',
    borderWidth: 1,
    borderColor: '#fff',
  },
}); 