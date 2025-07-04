import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Image, ActivityIndicator, Text, ImageBackground, TextInput } from "react-native";
import { useAuth } from "../../context/AuthContext";
import TextCustom from "../components/TextCustom";
import BottomTabBar from "../components/BottomTabBar";
import Header from "../components/Header";
import DrawerNavigation from "../components/DrawerNavigation";
import AdminDashboard from "./admin-dashboard";
import React, { useState, useEffect } from "react";
import { database, storage } from "../../lib/appwriteConfig";
import { Query, Models } from "react-native-appwrite";
import { FontAwesome, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import { Alert } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system';

// Appwrite config constants
const DATABASE_ID = '67f3615a0027484c95d5';
const COLLECTION_ID = '67f630fb0019582e45ac';
const BUCKET_ID = '6805d851000f17ea756f';
const PAPERS_COLLECTION_ID = '6805e9460039cc752d42';
const SIMPLE_PAPERS_COLLECTION_ID = '680b65cd002eb9c1b7a9';
const NOTIFICATIONS_COLLECTION_ID = '68060b61002f4a16927d';

// AsyncStorage keys
const READ_NOTIFICATIONS_KEY = 'readNotifications';
const SAVED_PAPERS_KEY = 'savedPapers';
const DOWNLOADED_PAPERS_KEY = 'downloadedPapers';

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

export default function Index() {
  const { user, isAdmin } = useAuth();
  const [exams, setExams] = useState<ExamDocument[]>([]);
  const [papers, setPapers] = useState<PaperDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [papersLoading, setPapersLoading] = useState(true);
  const [iconUrls, setIconUrls] = useState<Record<string, string>>({});
  const [examNames, setExamNames] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    exams: ExamDocument[];
    papers: PaperDocument[];
  } | null>(null);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [savedPapers, setSavedPapers] = useState<string[]>([]);
  const [downloadedPapers, setDownloadedPapers] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    fetchExams();
    fetchRecentPapers();
    loadSavedPapers();
    loadDownloadedPapers();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        COLLECTION_ID,
        [Query.orderDesc('$createdAt')]
      );
      
      const examDocs = response.documents as ExamDocument[];
      setExams(examDocs);
      
      // Create a lookup map for exam names
      const namesMap: Record<string, string> = {};
      examDocs.forEach(exam => {
        namesMap[exam.$id] = exam.name;
      });
      setExamNames(namesMap);
      
      // Load icon URLs for exams that have icons
      const urls: Record<string, string> = {};
      for (const exam of examDocs) {
        if (exam.iconId) {
          try {
            const fileUrl = await storage.getFileView(BUCKET_ID, exam.iconId);
            urls[exam.iconId] = fileUrl.href;
          } catch (error) {
            console.error(`Error loading icon for exam ${exam.$id}:`, error);
          }
        }
      }
      setIconUrls(urls);
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentPapers = async () => {
    setPapersLoading(true);
    try {
      // Fetch papers from original collection
      const originalResponse = await database.listDocuments(
        DATABASE_ID,
        PAPERS_COLLECTION_ID,
        [
          Query.orderDesc('$createdAt'),
          Query.limit(20)
        ]
      );
      
      // Fetch papers from new collection
      const newResponse = await database.listDocuments(
        DATABASE_ID,
        SIMPLE_PAPERS_COLLECTION_ID,
        [
          Query.orderDesc('$createdAt'),
          Query.limit(20)
        ]
      );
      
      const originalPapers = originalResponse.documents as PaperDocument[];
      const newPapers = newResponse.documents as PaperDocument[];
      
      // Combine both sets of papers
      const allPapers = [...originalPapers, ...newPapers];
      
      // Sort all papers by creation date
      const sortedPapers = allPapers.sort((a, b) => {
        const dateA = a.uploadDate ? new Date(a.uploadDate).getTime() : 
                   a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.uploadDate ? new Date(b.uploadDate).getTime() : 
                   b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      // Use all papers instead of limiting to 5
      setPapers(sortedPapers);
    } catch (error) {
      console.error('Error fetching papers:', error);
    } finally {
      setPapersLoading(false);
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

  const loadDownloadedPapers = async () => {
    try {
      const storedPapers = await AsyncStorage.getItem(DOWNLOADED_PAPERS_KEY);
      if (storedPapers) {
        setDownloadedPapers(JSON.parse(storedPapers));
      }
    } catch (error) {
      console.error('Error loading downloaded papers:', error);
    }
  };

  const handleDownloadPaper = async (paper: PaperDocument) => {
    // Set downloading state for this paper
    setIsDownloading(prev => ({ ...prev, [paper.$id]: true }));
    
    try {
      // Get file view URL
      const fileUrl = await storage.getFileView(BUCKET_ID, paper.fileId);
      
      if (fileUrl?.href) {
        // For direct download to device
        Linking.openURL(fileUrl.href);
        
        // Add to downloaded papers
        if (!downloadedPapers.includes(paper.$id)) {
          const updatedDownloaded = [...downloadedPapers, paper.$id];
          setDownloadedPapers(updatedDownloaded);
          await AsyncStorage.setItem(DOWNLOADED_PAPERS_KEY, JSON.stringify(updatedDownloaded));
        }
      }
    } catch (error) {
      console.error('Error downloading paper:', error);
      Alert.alert('Error', 'Failed to download the paper. Please try again.');
    } finally {
      // Reset downloading state for this paper
      setIsDownloading(prev => ({ ...prev, [paper.$id]: false }));
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

  const handleExamPress = (examId: string) => {
    // Navigate to exam details page
    router.push({
      pathname: "/exams/[id]",
      params: { id: examId }
    });
  };

  const handlePaperPress = async (paper: PaperDocument) => {
    try {
      // Get file view URL
      const fileUrl = await storage.getFileView(BUCKET_ID, paper.fileId);
      
      // Open in browser instead of using router
      if (fileUrl?.href) {
        // Use Linking to open in browser
        Linking.openURL(fileUrl.href);
      }
    } catch (error) {
      console.error('Error opening paper:', error);
      Alert.alert('Error', 'Failed to open the paper. Please try again.');
    }
  };

  // Search functionality
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    
    if (text.trim() === '') {
      setSearchResults(null);
      setSearchModalVisible(false);
      return;
    }
    
    const query = text.toLowerCase().trim();
    
    // Search exams
    const matchedExams = exams.filter(exam => 
      exam.name.toLowerCase().includes(query) || 
      (exam.description && exam.description.toLowerCase().includes(query))
    );
    
    // Search papers
    const matchedPapers = papers.filter(paper => 
      paper.paperName.toLowerCase().includes(query) || 
      (paper.description && paper.description.toLowerCase().includes(query)) ||
      (paper.year && paper.year.toLowerCase().includes(query)) ||
      (examNames[paper.examId] && examNames[paper.examId].toLowerCase().includes(query))
    );
    
    setSearchResults({
      exams: matchedExams,
      papers: matchedPapers
    });
    
    setSearchModalVisible(true);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSearchModalVisible(false);
  };

  const handleSearchItemPress = (type: 'exam' | 'paper', item: ExamDocument | PaperDocument) => {
    clearSearch();
    if (type === 'exam') {
      handleExamPress((item as ExamDocument).$id);
    }
    // Paper clicks will be handled by the individual action buttons
  };

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  // If the user is an admin, show the admin dashboard
  if (isAdmin) {
    return <AdminDashboard />;
  }

  // Otherwise show the user dashboard
  return (
      <View style={styles.container}>
      <Header onMenuPress={toggleDrawer} />
      <DrawerNavigation isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      
      <ScrollView style={styles.scrollView}>
          <LinearGradient
            colors={['#6B46C1', '#4A23A9']}
            style={styles.welcomeCard}
          >
            <View style={styles.welcomeCardOverlay}>              
              <MaterialCommunityIcons name="file-document-multiple" size={30} color="#ffffff80" style={styles.welcomeIcon} />
              <TextCustom style={styles.welcomeText} fontSize={24}>
                All Exam Previous Year Question Papers
              </TextCustom>
              <TextCustom style={styles.welcomeSubText} fontSize={14}>
                Previous year question papers for all exams
              </TextCustom>
            </View>
          </LinearGradient>

          {/* Search Bar */}
          <View style={styles.searchBarContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search exams and papers..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={handleSearch}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearSearchButton}
                  onPress={clearSearch}
                >
                  <FontAwesome name="times-circle" size={16} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Search Results */}
          {searchModalVisible && searchResults && (
            <View style={styles.searchResultsContainer}>
              {searchResults.exams.length === 0 && searchResults.papers.length === 0 ? (
                <View style={styles.noResultsContainer}>
                  <FontAwesome name="search" size={30} color="#ccc" />
                  <TextCustom style={styles.noResultsText}>
                    No results found for "{searchQuery}"
                  </TextCustom>
                </View>
              ) : (
                <>
                  {searchResults.exams.length > 0 && (
                    <View style={styles.searchResultsSection}>
                      <TextCustom style={styles.searchResultsTitle}>Exams</TextCustom>
                      {searchResults.exams.map(exam => (
                        <TouchableOpacity 
                          key={exam.$id} 
                          style={styles.searchResultItem}
                          onPress={() => handleSearchItemPress('exam', exam)}
                        >
                          <View style={styles.searchResultIconContainer}>
                            <FontAwesome name="graduation-cap" size={16} color="#6B46C1" />
                          </View>
                          <View style={styles.searchResultDetails}>
                            <TextCustom style={styles.searchResultName}>{exam.name}</TextCustom>
                            {exam.description ? (
                              <Text 
                                style={styles.searchResultDescription}
                                numberOfLines={1}
                              >
                                {exam.description}
                              </Text>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  
                  {searchResults.papers.length > 0 && (
                    <View style={styles.searchResultsSection}>
                      <TextCustom style={styles.searchResultsTitle}>Papers</TextCustom>
                      {searchResults.papers.map(paper => (
                        <TouchableOpacity 
                          key={paper.$id} 
                          style={styles.searchResultItem}
                          activeOpacity={0.8}
                        >
                          <View style={[
                            styles.searchResultIconContainer,
                            paper.fileType?.includes('image') ? styles.imageTypeIcon : styles.pdfTypeIcon
                          ]}>
                            <FontAwesome 
                              name={paper.fileType?.includes('image') ? 'file-image-o' : 'file-pdf-o'} 
                              size={16} 
                              color="#fff" 
                            />
                          </View>
                          <TouchableOpacity 
                            style={styles.searchResultDetails}
                            onPress={() => {
                              clearSearch();
                              handlePaperPress(paper);
                            }}
                          >
                            <TextCustom style={styles.searchResultName}>{paper.paperName}</TextCustom>
                            <TextCustom style={styles.searchResultMeta}>
                              {examNames[paper.examId] || 'Unknown Exam'} • {paper.year}
                            </TextCustom>
                          </TouchableOpacity>
                          <View style={styles.searchResultActions}>
                            <TouchableOpacity 
                              style={[
                                styles.searchResultAction,
                                savedPapers.includes(paper.$id) ? styles.activeSaveButton : styles.saveButton
                              ]}
                              onPress={() => handleSavePaper(paper)}
                            >
                              <FontAwesome 
                                name={savedPapers.includes(paper.$id) ? "bookmark" : "bookmark-o"} 
                                size={14} 
                                color="#fff" 
                              />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[
                                styles.searchResultAction,
                                downloadedPapers.includes(paper.$id) ? styles.activeDownloadButton : styles.downloadButton
                              ]}
                              onPress={() => handleDownloadPaper(paper)}
                              disabled={isDownloading[paper.$id]}
                            >
                              {isDownloading[paper.$id] ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <FontAwesome name="download" size={14} color="#fff" />
                              )}
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Exams Section */}
          {!searchModalVisible && (
            <>
          <View style={styles.examsSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="school" size={22} color="#6B46C1" />
                <TextCustom style={styles.sectionTitle} fontSize={20}>
                  Exams
                </TextCustom>
              </View>
              
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => router.push("/(app)/all-exams")}
                activeOpacity={0.7}
              >
                <TextCustom style={styles.viewAllText} fontSize={14}>
                  View All
                </TextCustom>
                <Ionicons name="chevron-forward" size={16} color="#6B46C1" />
              </TouchableOpacity>
            </View>
            
            {loading ? (
              <ActivityIndicator size="large" color="#6B46C1" style={styles.loader} />
            ) : exams.length === 0 ? (
              <View style={styles.emptyContainer}>
                <FontAwesome name="graduation-cap" size={50} color="#ccc" />
                <TextCustom style={styles.emptyText} fontSize={16}>No exams available yet</TextCustom>
              </View>
            ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalExamsContainer}
              >
                {exams.map((exam) => (
                  <TouchableOpacity 
                    key={exam.$id} 
                    style={styles.examCardHorizontal}
                    onPress={() => handleExamPress(exam.$id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.examLogoContainerSmall}>
                      {exam.iconId && iconUrls[exam.iconId] ? (
                        <Image 
                          source={{ uri: iconUrls[exam.iconId] }} 
                          style={styles.examLogo} 
                          resizeMode="cover"
                        />
                      ) : (
                        <LinearGradient
                          colors={['#7E57C2', '#5E35B1']}
                          style={styles.fallbackLogoGradient}
                        >
                          <FontAwesome name="graduation-cap" size={20} color="#fff" />
                        </LinearGradient>
                      )}
                    </View>
                    <TextCustom style={styles.examNameSmall} fontSize={12}>
                      {exam.name}
                    </TextCustom>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Recently Added Papers Section */}
          <View style={styles.recentPapersSection}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="document-text" size={22} color="#6B46C1" />
              <TextCustom style={styles.sectionTitle} fontSize={20}>
                Recently Added Papers
              </TextCustom>
            </View>
            
            {papersLoading ? (
              <ActivityIndicator size="large" color="#6B46C1" style={styles.loader} />
            ) : papers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <FontAwesome name="file-pdf-o" size={50} color="#ccc" />
                <TextCustom style={styles.emptyText} fontSize={16}>No papers available yet</TextCustom>
              </View>
            ) : (
              <ScrollView 
                style={styles.papersScrollContainer}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
              <View style={styles.papersList}>
                {papers.map((paper) => (
                  <TouchableOpacity 
                    key={paper.$id} 
                    style={styles.paperCard}
                    onPress={() => handlePaperPress(paper)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.paperIconContainer,
                      paper.fileType?.includes('image') ? styles.imageTypeIcon : styles.pdfTypeIcon
                    ]}>
                      <FontAwesome 
                        name={paper.fileType?.includes('image') ? 'file-image-o' : 'file-pdf-o'} 
                        size={24} 
                        color="#fff" 
                      />
                    </View>
                    <View style={styles.paperDetails}>
                      <TextCustom style={styles.paperName} fontSize={16}>
                        {paper.paperName}
                      </TextCustom>
                      <View style={styles.paperMetaRow}>
                        <TextCustom style={styles.paperExam} fontSize={14}>
                          {examNames[paper.examId] || 'Unknown Exam'} • {paper.year}
                        </TextCustom>
                        <View style={styles.recentBadge}>
                          <Text style={styles.recentBadgeText}>NEW</Text>
                        </View>
                      </View>
                      {paper.description ? (
                        <Text 
                          style={styles.paperDescription}
                          numberOfLines={1}
                        >
                          {paper.description}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.paperActionButtons}>
                      <TouchableOpacity 
                        style={[
                          styles.paperActionButton, 
                          savedPapers.includes(paper.$id) ? styles.activeSaveButton : styles.saveButton
                        ]}
                        onPress={() => handleSavePaper(paper)}
                      >
                        <FontAwesome 
                          name={savedPapers.includes(paper.$id) ? "bookmark" : "bookmark-o"} 
                          size={16} 
                          color="#fff" 
                        />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[
                          styles.paperActionButton, 
                          downloadedPapers.includes(paper.$id) ? styles.activeDownloadButton : styles.downloadButton
                        ]}
                        onPress={() => handleDownloadPaper(paper)}
                        disabled={isDownloading[paper.$id]}
                      >
                        {isDownloading[paper.$id] ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <FontAwesome 
                            name="download" 
                            size={16} 
                            color="#fff" 
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              </ScrollView>
            )}
          </View>
            </>
          )}
        </ScrollView>

        <BottomTabBar activeTab="home" />
      </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    paddingBottom: 60, // Space for the bottom tab bar
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  welcomeCard: {
    padding: 20,
    paddingVertical: 25,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    alignItems: 'center',
  },
  welcomeCardOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeIcon: {
    marginBottom: 10,
  },
  welcomeText: {
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  welcomeSubText: {
    color: '#FFF',
    textAlign: 'center',
  },
  examsSection: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  recentPapersSection: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    marginTop: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    justifyContent: 'space-between',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  horizontalExamsContainer: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  examCardHorizontal: {
    backgroundColor: '#fff',
    borderRadius: 10,
      padding: 12,
    marginRight: 12,
    width: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  examLogoContainerSmall: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  fallbackLogoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 23,
  },
  examLogo: {
    width: '100%',
    height: '100%',
  },
  examNameSmall: {
    fontWeight: '500',
    textAlign: 'center',
    fontSize: 12,
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
  papersList: {
    marginTop: 10,
  },
  paperCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paperIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
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
  paperExam: {
    color: '#666',
    marginTop: 2,
  },
  paperDescription: {
    color: '#888',
    marginTop: 2,
    fontSize: 12
  },
  paperMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  recentBadge: {
    backgroundColor: '#6B46C1',
    borderRadius: 10,
    padding: 2,
    marginLeft: 8,
  },
  recentBadgeText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  paperActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  paperActionButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginLeft: 4,
  },
  saveButton: {
    backgroundColor: '#28A745',
  },
  downloadButton: {
    backgroundColor: '#dc3545',
  },
  activeSaveButton: {
    backgroundColor: '#218838',
    borderWidth: 1,
    borderColor: '#fff',
  },
  activeDownloadButton: {
    backgroundColor: '#c82333',
    borderWidth: 1,
    borderColor: '#fff',
  },
  imageTypeIcon: {
    backgroundColor: '#4CAF50',
  },
  pdfTypeIcon: {
    backgroundColor: '#dc3545',
  },
  notificationButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 10,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
    marginTop: -20,
    zIndex: 5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 24,
    padding: 0,
    fontSize: 14,
    color: '#333',
  },
  filterButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    marginLeft: 8,
    position: 'relative',
  },
  viewAllButton: {
    flexDirection: 'row',
      alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(107, 70, 193, 0.08)',
    marginLeft: 'auto',
    },
  viewAllText: {
    fontWeight: '600',
    color: '#6B46C1',
    marginRight: 4,
    },
  searchResultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noResultsText: {
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  searchResultsSection: {
    marginBottom: 20,
  },
  searchResultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  searchResultIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  searchResultDetails: {
    flex: 1,
  },
  searchResultName: {
    fontWeight: '500',
    color: '#333',
    fontSize: 14,
  },
  searchResultDescription: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  searchResultMeta: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  searchResultActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  searchResultAction: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  clearSearchButton: {
    padding: 6,
    marginLeft: 5,
    },
  papersScrollContainer: {
    maxHeight: 600, // Increased from 400 to show more papers
    },
});
