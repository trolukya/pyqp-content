import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Alert,
  Text,
  Modal,
  TextInput
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import TextCustom from '../../components/TextCustom';
import BottomTabBar from '../../components/BottomTabBar';
import { FontAwesome } from '@expo/vector-icons';
import { database, storage } from '../../../lib/appwriteConfig';
import { Models, Query } from 'react-native-appwrite';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Appwrite config constants
const DATABASE_ID = '67f3615a0027484c95d5';
const COLLECTION_ID = '67f630fb0019582e45ac';
const BUCKET_ID = '6805d851000f17ea756f';
const PAPERS_COLLECTION_ID = '6805e9460039cc752d42';
const SIMPLE_PAPERS_COLLECTION_ID = '680b65cd002eb9c1b7a9';

// AsyncStorage key
const SAVED_PAPERS_KEY = 'savedPapers';

// Define the exam document type
interface ExamDocument extends Models.Document {
  name: string;
  description?: string;
  iconId?: string;
  createdAt: string;
  updatedAt: string;
}

// Define the paper document type
interface PaperDocument extends Models.Document {
  examId: string;
  paperName: string;
  year: string;
  description?: string;
  fileId: string;
  fileName: string;
  fileType: string;
  createdAt?: string;
  uploadDate?: string;
}

export default function ExamDetails() {
  const { id } = useLocalSearchParams();
  const { user, isAdmin } = useAuth();
  const [exam, setExam] = useState<ExamDocument | null>(null);
  const [papers, setPapers] = useState<PaperDocument[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<PaperDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [papersLoading, setPapersLoading] = useState(true);
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [yearModalVisible, setYearModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [savedPapers, setSavedPapers] = useState<string[]>([]);

  useEffect(() => {
    if (id) {
      fetchExam();
      fetchExamPapers();
      loadSavedPapers();
    }
  }, [id]);

  useEffect(() => {
    filterPapers();
  }, [searchQuery, selectedYear, papers]);

  const filterPapers = () => {
    let result = [...papers];
    
    // Filter by year if selected
    if (selectedYear) {
      result = result.filter(paper => paper.year === selectedYear);
    }
    
    // Filter by search query if not empty
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(paper => 
        paper.paperName.toLowerCase().includes(query) || 
        (paper.description && paper.description.toLowerCase().includes(query)) ||
        (paper.year && paper.year.toLowerCase().includes(query)) ||
        (paper.fileName && paper.fileName.toLowerCase().includes(query))
      );
    }
    
    // Sort results by year (descending) and then by name
    result.sort((a, b) => {
      // First sort by year (descending)
      if (a.year && b.year && a.year !== b.year) {
        return b.year.localeCompare(a.year);
      }
      // Then sort by name
      return a.paperName.localeCompare(b.paperName);
    });
    
    setFilteredPapers(result);
  };

  const fetchExam = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Fetch exam details
      const examDoc = await database.getDocument(
        DATABASE_ID,
        COLLECTION_ID,
        id as string
      );
      
      setExam(examDoc as ExamDocument);
      
      // Load icon if available
      if (examDoc.iconId) {
        try {
          const fileUrl = await storage.getFileView(BUCKET_ID, examDoc.iconId);
          setIconUrl(fileUrl.href);
        } catch (error) {
          console.error('Error loading icon:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching exam:', error);
      Alert.alert('Error', 'Failed to load exam details');
    } finally {
      setLoading(false);
    }
  };

  const fetchExamPapers = async () => {
    if (!id) return;
    
    setPapersLoading(true);
    try {
      // Fetch papers from original collection
      const originalResponse = await database.listDocuments(
        DATABASE_ID,
        PAPERS_COLLECTION_ID,
        [
          Query.equal('examId', id as string),
          Query.orderDesc('year')
        ]
      );
      
      // Fetch papers from new collection
      const newResponse = await database.listDocuments(
        DATABASE_ID,
        SIMPLE_PAPERS_COLLECTION_ID,
        [
          Query.equal('examId', id as string),
          Query.orderDesc('year')
        ]
      );
      
      const originalPapers = originalResponse.documents as PaperDocument[];
      const newPapers = newResponse.documents as PaperDocument[];
      
      // Combine papers from both collections
      const allPapers = [...originalPapers, ...newPapers];
      
      // Sort all papers by year (descending) and then by name
      const sortedPapers = allPapers.sort((a, b) => {
        // First sort by year (descending)
        if (a.year && b.year && a.year !== b.year) {
          return b.year.localeCompare(a.year);
        }
        // Then sort by name
        return a.paperName.localeCompare(b.paperName);
      });
      
      setPapers(sortedPapers);
      setFilteredPapers(sortedPapers);
      
      // Extract unique years from papers for filter
      const years = [...new Set(sortedPapers
        .filter(paper => paper.year) // Ensure paper has a year
        .map(paper => paper.year as string))];
      setAvailableYears(years);
    } catch (error) {
      console.error('Error fetching exam papers:', error);
    } finally {
      setPapersLoading(false);
    }
  };

  const handlePaperPress = async (paper: PaperDocument) => {
    try {
      // Get file view URL
      const fileUrl = await storage.getFileView(BUCKET_ID, paper.fileId);
      
      // Open in browser
      if (fileUrl?.href) {
        // Use Linking to open in browser
        const Linking = require('expo-linking');
        Linking.openURL(fileUrl.href);
      }
    } catch (error) {
      console.error('Error opening paper:', error);
      Alert.alert('Error', 'Could not open file. Please try again.');
    }
  };

  const handleYearFilter = (year: string | null) => {
    setSelectedYear(year);
    setYearModalVisible(false);
  };

  const handleDeleteExam = () => {
    // Confirm with user before deleting
    Alert.alert(
      'Delete Exam',
      'Are you sure you want to delete this exam? This action cannot be undone and will also delete all associated papers.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDeleteExam
        }
      ]
    );
  };

  const confirmDeleteExam = async () => {
    if (!exam) return;
    
    setLoading(true);
    try {
      // Delete all related papers from both collections
      for (const paper of papers) {
        try {
          // Delete the file from storage
          await storage.deleteFile(BUCKET_ID, paper.fileId);
          
          // Determine which collection the paper belongs to
          const isPaperFromSimpleCollection = !paper.createdAt && paper.uploadDate;
          const collectionId = isPaperFromSimpleCollection 
            ? SIMPLE_PAPERS_COLLECTION_ID 
            : PAPERS_COLLECTION_ID;
          
          // Delete the paper document from the appropriate collection
          await database.deleteDocument(
            DATABASE_ID,
            collectionId,
            paper.$id
          );
        } catch (error) {
          console.error(`Error deleting paper ${paper.$id}:`, error);
        }
      }
      
      // Delete the exam document
      await database.deleteDocument(
        DATABASE_ID,
        COLLECTION_ID,
        exam.$id
      );
      
      // Navigate back after successful deletion
      Alert.alert(
        'Success',
        'Exam deleted successfully',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(app)/admin-dashboard')
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting exam:', error);
      Alert.alert('Error', 'Failed to delete exam. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

  const handleSavePaper = async (paper: PaperDocument, event?: any) => {
    // Prevent triggering the parent onPress
    if (event) {
      event.stopPropagation();
    }
    
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={20} color="#333" />
          </TouchableOpacity>
          <TextCustom style={styles.headerTitle}>Exam Details</TextCustom>
        </View>
        
        {loading ? (
          <ActivityIndicator size="large" color="#6B46C1" style={styles.loader} />
        ) : exam ? (
          <View style={styles.examDetailsContainer}>
            <View style={styles.examHeader}>
              <View style={styles.iconContainer}>
                {iconUrl ? (
                  <Image 
                    source={{ uri: iconUrl }} 
                    style={styles.examIcon} 
                    resizeMode="cover"
                  />
                ) : (
                  <FontAwesome name="graduation-cap" size={40} color="#666" />
                )}
              </View>
              <TextCustom style={styles.examName}>{exam.name}</TextCustom>
              <TextCustom style={styles.examDescription}>
                {exam.description || 'No description available'}
              </TextCustom>
              
              {/* Admin Actions - Only show for admins */}
              {user && isAdmin && (
                <View style={styles.adminActions}>
                  <TouchableOpacity 
                    style={styles.adminButton}
                    onPress={() => router.push({
                      pathname: "/manage-exams/edit",
                      params: { id: exam.$id }
                    })}
                  >
                    <FontAwesome name="edit" size={16} color="#fff" />
                    <TextCustom style={styles.adminButtonText}>Edit Exam</TextCustom>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.adminButton, styles.deleteButton]}
                    onPress={handleDeleteExam}
                  >
                    <FontAwesome name="trash" size={16} color="#fff" />
                    <Text style={styles.adminButtonText}>Delete Exam</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            {/* Exam Papers Section */}
            <View style={styles.papersSection}>
              <View style={styles.papersSectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <TextCustom style={styles.sectionTitle}>Available Papers</TextCustom>
                  
                  {/* Year Filter Button */}
                  {!papersLoading && papers.length > 0 && (
                    <TouchableOpacity 
                      style={styles.yearFilterButton}
                      onPress={() => setYearModalVisible(true)}
                    >
                      <TextCustom style={styles.yearFilterButtonText}>
                        {selectedYear ? `Year: ${selectedYear}` : 'All Years'}
                      </TextCustom>
                      <MaterialIcons name="arrow-drop-down" size={24} color="#6B46C1" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Search Bar */}
                {!papersLoading && papers.length > 0 && (
                  <View style={styles.searchBarContainer}>
                    <FontAwesome name="search" size={16} color="#666" style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search papers..."
                      placeholderTextColor="#999"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity 
                        style={styles.clearSearchButton}
                        onPress={() => setSearchQuery('')}
                      >
                        <FontAwesome name="times-circle" size={16} color="#999" />
                      </TouchableOpacity>
                    )}
                  </View>
                  )}
                </View>

                {/* Year Selection Modal */}
                <Modal
                  visible={yearModalVisible}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setYearModalVisible(false)}
                >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Year</Text>
                  <TouchableOpacity 
                        style={styles.closeButton}
                    onPress={() => setYearModalVisible(false)}
                  >
                        <FontAwesome name="close" size={20} color="#666" />
                        </TouchableOpacity>
                      </View>
                      <ScrollView style={styles.yearList}>
                      {availableYears.map((year) => (
                        <TouchableOpacity
                          key={year}
                          style={styles.yearItem}
                            onPress={() => handleYearFilter(year)}
                          >
                          <Text style={styles.yearItemText}>{year}</Text>
                            {selectedYear === year && (
                            <FontAwesome name="check" size={16} color="#6B46C1" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                </View>
                </Modal>
              
              {papersLoading ? (
                <ActivityIndicator size="small" color="#6B46C1" style={styles.smallLoader} />
              ) : papers.length === 0 ? (
                <View style={styles.emptyPapers}>
                  <FontAwesome name="file-pdf-o" size={36} color="#ccc" />
                  <TextCustom style={styles.emptyText}>
                    No papers available yet
                  </TextCustom>
                </View>
              ) : filteredPapers.length === 0 ? (
                <View style={styles.emptyPapers}>
                  <FontAwesome name="search" size={36} color="#ccc" />
                  <TextCustom style={styles.emptyText}>
                    {searchQuery.trim() 
                      ? `No papers found matching "${searchQuery}"` 
                      : selectedYear 
                        ? `No papers found for ${selectedYear}` 
                        : 'No papers found'}
                  </TextCustom>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedYear(null);
                      setSearchQuery('');
                    }}
                    style={styles.resetFilterButton}
                  >
                    <TextCustom style={styles.resetFilterText}>
                      Reset Filters
                    </TextCustom>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.papersList}>
                  {filteredPapers.map((paper) => (
                    <TouchableOpacity 
                      key={paper.$id} 
                      style={styles.paperCard}
                      onPress={() => handlePaperPress(paper)}
                    >
                      <View style={styles.paperIconContainer}>
                        <FontAwesome 
                          name={paper.fileType?.includes('image') ? 'file-image-o' : 'file-pdf-o'} 
                          size={24} 
                          color="#dc3545" 
                        />
                      </View>
                      <View style={styles.paperDetails}>
                        <TextCustom style={styles.paperName} fontSize={16}>
                          {paper.paperName}
                        </TextCustom>
                        <TextCustom style={styles.paperYear} fontSize={14}>
                          Year: {paper.year}
                        </TextCustom>
                        {paper.description ? (
                          <Text 
                            style={styles.paperDescription}
                            numberOfLines={2}
                          >
                            {paper.description}
                          </Text>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.saveButton,
                          savedPapers.includes(paper.$id) ? styles.activeSaveButton : {}
                        ]}
                        onPress={(event) => handleSavePaper(paper, event)}
                      >
                        <FontAwesome 
                          name={savedPapers.includes(paper.$id) ? "bookmark" : "bookmark-o"} 
                          size={18} 
                          color="#fff" 
                        />
                      </TouchableOpacity>
                      <View style={styles.downloadButton}>
                        <FontAwesome name="download" size={18} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.errorContainer}>
            <FontAwesome name="exclamation-circle" size={50} color="#dc3545" />
            <TextCustom style={styles.errorText}>Exam not found</TextCustom>
          </View>
        )}
      </ScrollView>
      
      <BottomTabBar activeTab="home" />
    </View>
  );
}

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
  loader: {
    marginVertical: 50,
  },
  smallLoader: {
    margin: 20,
  },
  examDetailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  examHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  examIcon: {
    width: '100%',
    height: '100%',
  },
  examName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  examDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  papersSection: {
    padding: 20,
  },
  papersSectionHeader: {
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 36,
    fontSize: 15,
    color: '#333',
    padding: 0,
    fontFamily: 'System',
  },
  clearSearchButton: {
    padding: 6,
  },
  yearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  yearFilterButtonText: {
    fontSize: 14,
    color: '#444',
    marginRight: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    maxHeight: 350,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  yearList: {
    maxHeight: 300,
  },
  yearItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  yearItemSelected: {
    backgroundColor: '#f8f0ff',
  },
  yearItemText: {
    fontSize: 16,
    color: '#333',
  },
  papersList: {
    marginTop: 10,
  },
  emptyPapers: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
  },
  emptyText: {
    marginTop: 10,
    color: '#666',
    textAlign: 'center',
  },
  paperCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paperIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  paperDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  paperName: {
    fontWeight: '500',
    color: '#333',
  },
  paperYear: {
    color: '#666',
    marginTop: 2,
  },
  paperDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  downloadButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6B46C1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginVertical: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  adminActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    width: '100%',
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#6B46C1',
    borderRadius: 8,
    marginHorizontal: 6,
  },
  adminButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  resetFilterButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  resetFilterText: {
    fontSize: 14,
    color: '#6B46C1',
    fontWeight: '500',
  },
  closeButton: {
    padding: 10,
  },
  saveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#28A745',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  activeSaveButton: {
    backgroundColor: '#218838',
    borderWidth: 1,
    borderColor: '#fff',
  },
}); 