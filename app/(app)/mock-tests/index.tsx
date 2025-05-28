import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import { router } from 'expo-router';
import TextCustom from '../../components/TextCustom';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { database, storage, config } from '../../../lib/appwriteConfig';
import { Models, Query } from 'react-native-appwrite';
import { useAuth } from '../../../context/AuthContext';
import EmptyState from '../../components/EmptyState';

// Appwrite config constants
const DATABASE_ID = config.databaseId;
const MOCK_TESTS_COLLECTION_ID = '683576d00034b71e29ba';

// Define MockTest interface
interface MockTest extends Models.Document {
  title: string;
  examId: string;
  instructions?: string;
  coverId?: string;
}

export default function MockTestsScreen() {
  const { session, isAdmin } = useAuth();
  
  // State variables
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setLoading(true);
    try {
      await fetchMockTests();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch mock tests
  const fetchMockTests = async () => {
    try {
      console.log('Fetching mock tests, Collection ID:', MOCK_TESTS_COLLECTION_ID);
      console.log('Database ID:', DATABASE_ID);
      
      // Make a direct request to the API with explicit configuration
      const response = await database.listDocuments(
        DATABASE_ID,
        MOCK_TESTS_COLLECTION_ID,
        [
          Query.limit(100) // Ensure we get all documents
        ]
      );
      
      console.log('Mock tests API response status:', response ? 'Success' : 'Failed');
      console.log('Mock tests documents count:', response.documents?.length || 0);
      console.log('Mock tests total:', response.total);
      
      if (response.documents && Array.isArray(response.documents)) {
        // Print each document ID for debugging
        response.documents.forEach((doc, index) => {
          console.log(`Document ${index + 1} ID: ${doc.$id}, Title: ${doc.title || 'No title'}`);
        });
        
        // Set the state with the documents
        if (response.documents.length > 0) {
          console.log('Setting mockTests state with', response.documents.length, 'documents');
          setMockTests(response.documents as MockTest[]);
          
          // Show success message if tests were found
          if (response.documents.length > 0) {
            console.log(`Successfully loaded ${response.documents.length} mock tests`);
          }
        } else {
          console.log('No mock tests found in the response');
          setMockTests([]);
        }
      } else {
        console.error('Invalid response format:', response);
        setMockTests([]);
      }
    } catch (error: any) {
      console.error('Error fetching mock tests:', error);
      setMockTests([]);
      Alert.alert(
        'Database Error', 
        `Failed to load mock tests: ${error.message || 'Unknown error'}. Collection ID: ${MOCK_TESTS_COLLECTION_ID}`
      );
    }
  };
  
  // Get cover image URL
  const getCoverImageUrl = (coverId: string) => {
    if (!coverId) return null;
    
    try {
      // Return placeholder since we don't have direct access to the storage URL structure
      return 'https://via.placeholder.com/400x140?text=Mock+Test';
    } catch (error) {
      console.error('Error generating cover URL:', error);
      return 'https://via.placeholder.com/400x140?text=Mock+Test';
    }
  };
  
  // Get formatted date
  const getFormattedDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  // Add this function to manually refresh the data
  const handleRefresh = () => {
    setLoading(true);
    loadData();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#6B46C1', '#4A23A9']}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <TextCustom style={styles.headerTitle} fontSize={20}>
          Mock Tests
        </TextCustom>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={handleRefresh}
        >
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {isAdmin && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push("/(app)/manage-tests/add")}
          >
            <Ionicons name="add" size={24} color="white" />
            <TextCustom style={styles.addButtonText} fontSize={16}>
              Add Tests
            </TextCustom>
          </TouchableOpacity>
        )}
        
        {/* Mock Tests Section Header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <FontAwesome name="file-text-o" size={18} color="#6B46C1" style={styles.sectionIcon} />
            <TextCustom style={styles.sectionTitle} fontSize={18}>
              Available Mock Tests
            </TextCustom>
          </View>
          <TouchableOpacity onPress={handleRefresh}>
            <TextCustom style={styles.viewAllText} fontSize={14}>
              Refresh
            </TextCustom>
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6B46C1" />
            <TextCustom style={styles.loadingText} fontSize={16}>
              Loading mock tests...
            </TextCustom>
          </View>
        ) : (
          <View style={styles.testListContainer}>
            {mockTests.length > 0 ? (
              <View style={styles.mockTestsGrid}>
                <FlatList
                  data={mockTests}
                  keyExtractor={item => item.$id}
                  numColumns={2}
                  contentContainerStyle={styles.mockTestsGridContent}
                  columnWrapperStyle={styles.mockTestRow}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.mockTestCard}
                      onPress={() => router.push({
                        pathname: `/(app)/mock-tests/${item.$id}`,
                        params: {}
                      } as any)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.mockTestCoverContainer}>
                        {item.coverId ? (
                          <Image 
                            source={{ uri: getCoverImageUrl(item.coverId) || 'https://via.placeholder.com/100x150?text=Mock+Test' }} 
                            style={styles.mockTestCover} 
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.mockTestCoverPlaceholder}>
                            <FontAwesome name="file-text-o" size={28} color="#6B46C1" />
                          </View>
                        )}
                      </View>
                      <View style={styles.mockTestInfo}>
                        <TextCustom 
                          style={styles.mockTestTitle} 
                          fontSize={14}
                        >
                          {item.title.length > 30 ? item.title.substring(0, 30) + '...' : item.title}
                        </TextCustom>
                        <TouchableOpacity 
                          style={styles.mockTestStartButton}
                          onPress={() => router.push({
                            pathname: `/(app)/mock-tests/${item.$id}`,
                            params: {}
                          } as any)}
                        >
                          <TextCustom style={styles.mockTestStartText} fontSize={12}>
                            Start Test
                          </TextCustom>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                      <FontAwesome name="file-text-o" size={50} color="#ccc" />
                      <TextCustom style={styles.emptyText} fontSize={16}>
                        No mock tests available yet
                      </TextCustom>
                    </View>
                  )}
                />
              </View>
            ) : (
              <EmptyState
                hideContent={true}
                icon="file-text-o"
                title="No mock tests available"
                message={isAdmin ? "Add your first test using the button above" : "Check back later for new tests"}
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 36, // Balance the layout with backButton
  },
  scrollContent: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllText: {
    color: '#6B46C1',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  testListContainer: {
    flex: 1,
  },
  refreshButton: {
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    color: '#666',
  },
  mockTestsGrid: {
    flex: 1,
    paddingTop: 16,
  },
  mockTestsGridContent: {
    paddingBottom: 20,
  },
  mockTestRow: {
    justifyContent: 'space-between',
    marginHorizontal: 4,
  },
  mockTestCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: '48%',
  },
  mockTestCoverContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockTestCover: {
    width: '100%',
    height: '100%',
  },
  mockTestCoverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f2f2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockTestInfo: {
    padding: 12,
  },
  mockTestTitle: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  mockTestStartButton: {
    backgroundColor: '#6B46C1',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  mockTestStartText: {
    color: 'white',
    fontWeight: 'bold',
  },
}); 