import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import TextCustom from '../../components/TextCustom';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { database, storage, config } from '../../../lib/appwriteConfig';
import { Models } from 'react-native-appwrite';
import { useAuth } from '../../../context/AuthContext';

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

export default function MockTestDetails() {
  const params = useLocalSearchParams();
  const { testId } = params;
  const { session } = useAuth();
  
  // State variables
  const [test, setTest] = useState<MockTest | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (testId) {
      fetchTestDetails();
    } else {
      router.back();
    }
  }, [testId]);
  
  // Fetch test details
  const fetchTestDetails = async () => {
    setLoading(true);
    try {
      console.log('Fetching test with ID:', testId);
      
      // Fetch the test document
      const testDoc = await database.getDocument(
        DATABASE_ID,
        MOCK_TESTS_COLLECTION_ID,
        testId as string
      );
      
      console.log('Test document:', testDoc);
      setTest(testDoc as MockTest);
    } catch (error) {
      console.error('Error fetching test details:', error);
      Alert.alert('Error', 'Failed to load test details');
      router.back();
    } finally {
      setLoading(false);
    }
  };
  
  // Get cover image URL
  const getCoverImageUrl = (coverId: string) => {
    if (!coverId) return null;
    console.log('Getting cover image for ID:', coverId);
    
    try {
      // Return placeholder since we don't have direct access to the storage URL structure
      return 'https://via.placeholder.com/800x400?text=Mock+Test';
    } catch (error) {
      console.error('Error generating cover URL:', error);
      return 'https://via.placeholder.com/800x400?text=Mock+Test';
    }
  };
  
  // Render loading state
  if (loading) {
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
            Mock Test Details
          </TextCustom>
          <View style={styles.placeholder} />
        </LinearGradient>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6B46C1" />
          <TextCustom style={styles.loadingText} fontSize={16}>
            Loading test details...
          </TextCustom>
        </View>
      </SafeAreaView>
    );
  }
  
  // If test not found
  if (!test) return null;
  
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
          Mock Test Details
        </TextCustom>
        <View style={styles.placeholder} />
      </LinearGradient>
      
      <ScrollView style={styles.scrollView}>
        {/* Cover Image */}
        {test.coverId ? (
          <Image 
            source={{ uri: getCoverImageUrl(test.coverId) as any }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderCover}>
            <FontAwesome name="file-text-o" size={60} color="#ccc" />
          </View>
        )}
        
        {/* Test Details */}
        <View style={styles.contentContainer}>
          <TextCustom style={styles.title} fontSize={24}>
            {test.title}
          </TextCustom>
          
          {test.instructions && (
            <View style={styles.section}>
              <TextCustom style={styles.sectionTitle} fontSize={18}>
                Instructions
              </TextCustom>
              <TextCustom style={styles.instructions} fontSize={16}>
                {test.instructions}
              </TextCustom>
            </View>
          )}
          
          {/* Take Test Button */}
          <TouchableOpacity 
            style={styles.takeTestButton}
            onPress={() => {
              Alert.alert(
                'Coming Soon', 
                'This feature will be available in the next update.'
              );
            }}
          >
            <FontAwesome name="play-circle" size={20} color="white" />
            <TextCustom style={styles.takeTestButtonText} fontSize={16}>
              Start Test
            </TextCustom>
          </TouchableOpacity>
        </View>
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
    marginRight: 36,
  },
  placeholder: {
    width: 24,
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
  scrollView: {
    flex: 1,
  },
  coverImage: {
    width: '100%',
    height: 220,
  },
  placeholderCover: {
    width: '100%',
    height: 220,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#444',
  },
  instructions: {
    color: '#555',
    lineHeight: 24,
  },
  takeTestButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  takeTestButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 10,
  },
}); 