import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, FlatList } from 'react-native';
import { router } from 'expo-router';
import TextCustom from '../../components/TextCustom';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { database, storage } from '../../../lib/appwriteConfig';
import { Query, Models } from 'react-native-appwrite';
import AdminTabBar from '../../components/AdminTabBar';
import { useAuth } from '../../../context/AuthContext';

// Appwrite config constants
const DATABASE_ID = '67f3615a0027484c95d5';
const NOTES_COLLECTION_ID = '682d9ac0001b401b3121'; // Notes collection ID
const BUCKET_ID = '6805d851000f17ea756f'; // Storage bucket ID
const EXAMS_COLLECTION_ID = '67f630fb0019582e45ac'; // Exams collection

interface Note {
  $id: string;
  title: string;
  author: string;
  subject: string;
  description?: string;
  examId?: string;
  fileId: string;
  fileName: string;
  coverId?: string;
  createdAt: string;
  uploadedBy: string;
  views: number;
  downloads: number;
  isActive: boolean;
}

interface ExamDocument {
  $id: string;
  name: string;
  description?: string;
  iconId?: string;
}

export default function ManageNotes() {
  const { isAdmin } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Record<string, string>>({});
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotes();
    fetchExams();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        NOTES_COLLECTION_ID,
        [Query.orderDesc('$createdAt')]
      );
      
      setNotes(response.documents as unknown as Note[]);
      
      // Load cover images
      const urls: Record<string, string> = {};
      for (const note of response.documents as unknown as Note[]) {
        if (note.coverId) {
          try {
            const fileUrl = await storage.getFileView(BUCKET_ID, note.coverId);
            urls[note.coverId] = fileUrl.href;
          } catch (error) {
            console.error(`Error loading cover for note ${note.$id}:`, error);
          }
        }
      }
      setCoverUrls(urls);
    } catch (error) {
      console.error('Error fetching notes:', error);
      Alert.alert('Error', 'Failed to load notes. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchExams = async () => {
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        EXAMS_COLLECTION_ID
      );
      
      const examMap: Record<string, string> = {};
      for (const exam of response.documents as unknown as ExamDocument[]) {
        examMap[exam.$id] = exam.name;
      }
      
      setExams(examMap);
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  const handleAddNote = () => {
    router.push('/(app)/manage-notes/add');
  };

  const handleEditNote = (note: Note) => {
    router.push({
      pathname: '/(app)/manage-notes/add',
      params: { noteId: note.$id }
    });
  };

  const handleDeleteNote = async (note: Note) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${note.title}"?`,
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
              // Delete the note document
              await database.deleteDocument(
                DATABASE_ID,
                NOTES_COLLECTION_ID,
                note.$id
              );
              
              // Try to delete the file
              if (note.fileId) {
                try {
                  await storage.deleteFile(BUCKET_ID, note.fileId);
                } catch (error) {
                  console.error('Error deleting note file:', error);
                }
              }
              
              // Try to delete the cover image
              if (note.coverId) {
                try {
                  await storage.deleteFile(BUCKET_ID, note.coverId);
                } catch (error) {
                  console.error('Error deleting note cover image:', error);
                }
              }
              
              // Remove the note from the list
              setNotes(prevNotes => prevNotes.filter(n => n.$id !== note.$id));
              
              Alert.alert('Success', 'Note deleted successfully');
            } catch (error) {
              console.error('Error deleting note:', error);
              Alert.alert('Error', 'Failed to delete note. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotes();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#6B46C1', '#4A23A9']}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TextCustom style={styles.headerTitle} fontSize={20}>
            Manage Notes
          </TextCustom>
          <View style={styles.headerRight} />
        </LinearGradient>

        <View style={styles.content}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddNote}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <TextCustom style={styles.addButtonText} fontSize={16}>Add New Note</TextCustom>
          </TouchableOpacity>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6B46C1" />
              <TextCustom style={styles.loadingText} fontSize={16}>Loading notes...</TextCustom>
            </View>
          ) : notes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome name="file-text-o" size={50} color="#ccc" />
              <TextCustom style={styles.emptyText} fontSize={16}>No notes available yet</TextCustom>
              <TextCustom style={styles.subText} fontSize={14}>
                Add your first note using the button above
              </TextCustom>
            </View>
          ) : (
            <FlatList
              data={notes}
              keyExtractor={(item) => item.$id}
              renderItem={({ item }) => (
                <View style={styles.noteCard}>
                  <View style={styles.noteInfo}>
                    <View style={styles.coverContainer}>
                      {item.coverId && coverUrls[item.coverId] ? (
                        <Image 
                          source={{ uri: coverUrls[item.coverId] }} 
                          style={styles.coverImage} 
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.placeholderCover}>
                          <FontAwesome name="file-text-o" size={30} color="#6B46C1" />
                        </View>
                      )}
                    </View>
                    <View style={styles.noteDetails}>
                      <TextCustom style={styles.noteTitle} fontSize={16}>{item.title}</TextCustom>
                      <TextCustom style={styles.noteAuthor} fontSize={14}>{item.author}</TextCustom>
                      <TextCustom style={styles.noteSubject} fontSize={12}>
                        {item.subject} {item.examId && exams[item.examId] ? `• ${exams[item.examId]}` : ''}
                      </TextCustom>
                      <TextCustom style={styles.noteDate} fontSize={12}>
                        Added on {formatDate(item.createdAt)}
                      </TextCustom>
                    </View>
                  </View>
                  <View style={styles.noteActions}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.editButton]}
                      onPress={() => handleEditNote(item)}
                    >
                      <Ionicons name="pencil" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteNote(item)}
                    >
                      <Ionicons name="trash" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.notesList}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          )}
        </View>

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
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  addButton: {
    backgroundColor: '#6B46C1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
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
  subText: {
    marginTop: 8,
    color: '#999',
    textAlign: 'center',
  },
  notesList: {
    paddingBottom: 100,
  },
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  coverContainer: {
    width: 60,
    height: 80,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  noteTitle: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  noteAuthor: {
    color: '#666',
    marginBottom: 2,
  },
  noteSubject: {
    color: '#888',
    marginBottom: 2,
  },
  noteDate: {
    color: '#999',
  },
  noteActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
}); 