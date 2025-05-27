import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import TextCustom from '../../components/TextCustom';
import AdminTabBar from '../../components/AdminTabBar';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { database, storage } from '../../../lib/appwriteConfig';
import { Query, Models } from 'react-native-appwrite';
import { LinearGradient } from 'expo-linear-gradient';

// Appwrite config constants
const DATABASE_ID = '67f3615a0027484c95d5';
const VIDEOS_COLLECTION_ID = 'videos';
const COLLECTION_ID = '67f630fb0019582e45ac'; // Exams collection
const BUCKET_ID = '6805d851000f17ea756f';

interface VideoLecture extends Models.Document {
  title: string;
  description: string;
  examId: string;
  thumbnailId: string;
  videoId: string;
  createdAt: string;
  views: number;
  duration: number;
}

interface Exam extends Models.Document {
  name: string;
}

const ManageVideosScreen: React.FC = () => {
  const [videos, setVideos] = useState<VideoLecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const [examNames, setExamNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchVideos();
    fetchExams();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        VIDEOS_COLLECTION_ID,
        [Query.orderDesc('$createdAt')]
      );
      
      setVideos(response.documents as unknown as VideoLecture[]);
      
      // Load thumbnail URLs
      const urls: Record<string, string> = {};
      for (const video of response.documents as unknown as VideoLecture[]) {
        if (video.thumbnailId) {
          try {
            const fileUrl = await storage.getFileView(BUCKET_ID, video.thumbnailId);
            urls[video.thumbnailId] = fileUrl.href;
          } catch (error) {
            console.error(`Error loading thumbnail for video ${video.$id}:`, error);
          }
        }
      }
      setThumbnailUrls(urls);
    } catch (error) {
      console.error('Error fetching videos:', error);
      Alert.alert('Error', 'Failed to load video lectures. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        COLLECTION_ID
      );
      
      const namesMap: Record<string, string> = {};
      (response.documents as unknown as Exam[]).forEach(exam => {
        namesMap[exam.$id] = exam.name;
      });
      setExamNames(namesMap);
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  const handleAddVideo = () => {
    router.push('/(app)/manage-videos/add');
  };

  const handleEditVideo = (videoId: string) => {
    router.push({
      pathname: "/(app)/manage-videos/edit",
      params: { id: videoId }
    });
  };

  const handleDeleteVideo = (videoId: string, thumbnailId: string, videoFileId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this video lecture? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from database
              await database.deleteDocument(
                DATABASE_ID,
                VIDEOS_COLLECTION_ID,
                videoId
              );
              
              // Delete associated files
              try {
                await storage.deleteFile(BUCKET_ID, thumbnailId);
              } catch (e) {
                console.error('Error deleting thumbnail:', e);
              }
              
              try {
                await storage.deleteFile(BUCKET_ID, videoFileId);
              } catch (e) {
                console.error('Error deleting video file:', e);
              }
              
              // Refresh the list
              fetchVideos();
              Alert.alert('Success', 'Video lecture deleted successfully.');
            } catch (error) {
              console.error('Error deleting video lecture:', error);
              Alert.alert('Error', 'Failed to delete video lecture. Please try again.');
            }
          }
        }
      ]
    );
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <TextCustom style={styles.headerTitle}>Manage Videos</TextCustom>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddVideo}
          >
            <FontAwesome name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6B46C1" />
            <TextCustom style={styles.loadingText}>Loading videos...</TextCustom>
          </View>
        ) : videos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="video-camera" size={50} color="#ccc" />
            <TextCustom style={styles.emptyText}>No video lectures found</TextCustom>
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={handleAddVideo}
            >
              <FontAwesome name="plus" size={16} color="#fff" style={{ marginRight: 8 }} />
              <TextCustom style={styles.addFirstButtonText}>Add Your First Video</TextCustom>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.videosList}>
            {videos.map((video) => (
              <View key={video.$id} style={styles.videoCard}>
                <View style={styles.videoThumbnailContainer}>
                  {video.thumbnailId && thumbnailUrls[video.thumbnailId] ? (
                    <Image 
                      source={{ uri: thumbnailUrls[video.thumbnailId] }} 
                      style={styles.videoThumbnail} 
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.placeholderThumbnail}>
                      <FontAwesome name="video-camera" size={24} color="#fff" />
                    </View>
                  )}
                  {video.duration > 0 && (
                    <View style={styles.durationBadge}>
                      <TextCustom style={styles.durationText}>{formatDuration(video.duration)}</TextCustom>
                    </View>
                  )}
                </View>
                <View style={styles.videoDetails}>
                  <TextCustom style={styles.videoTitle}>{video.title}</TextCustom>
                  <TextCustom style={styles.videoExam}>{examNames[video.examId] || 'Unknown Exam'}</TextCustom>
                  <View style={styles.videoStats}>
                    <View style={styles.videoStat}>
                      <FontAwesome name="eye" size={12} color="#666" />
                      <TextCustom style={styles.videoStatText}>{video.views} views</TextCustom>
                    </View>
                    <View style={styles.videoStat}>
                      <FontAwesome name="calendar" size={12} color="#666" />
                      <TextCustom style={styles.videoStatText}>
                        {new Date(video.createdAt).toLocaleDateString()}
                      </TextCustom>
                    </View>
                  </View>
                </View>
                <View style={styles.videoActions}>
                  <TouchableOpacity 
                    style={[styles.videoAction, styles.editButton]}
                    onPress={() => handleEditVideo(video.$id)}
                  >
                    <FontAwesome name="pencil" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.videoAction, styles.deleteButton]}
                    onPress={() => handleDeleteVideo(video.$id, video.thumbnailId, video.videoId)}
                  >
                    <FontAwesome name="trash" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
        
        <AdminTabBar activeTab="manage" />
      </View>
    </SafeAreaView>
  );
};

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
    backgroundColor: '#6B46C1',
    padding: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 10,
    color: '#666',
    marginBottom: 20,
  },
  addFirstButton: {
    flexDirection: 'row',
    backgroundColor: '#6B46C1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFirstButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  videosList: {
    padding: 16,
  },
  videoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  videoThumbnailContainer: {
    position: 'relative',
    height: 180,
    backgroundColor: '#f0f0f0',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6B46C1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
  },
  videoDetails: {
    padding: 12,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  videoExam: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  videoStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  videoStatText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  videoActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  videoAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#28a745',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
});

export default ManageVideosScreen; 