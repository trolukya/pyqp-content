import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import TextCustom from '../../components/TextCustom';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { database, storage } from '../../../lib/appwriteConfig';
import { Query, ID } from 'react-native-appwrite';
import AdminTabBar from '../../components/AdminTabBar';
import { useAuth } from '../../../context/AuthContext';

// Appwrite config constants
const DATABASE_ID = '67f3615a0027484c95d5';
const BOOKS_COLLECTION_ID = '682710e0002c728483e2'; // Books collection ID
const BUCKET_ID = '6805d851000f17ea756f'; // Storage bucket ID
const EXAMS_COLLECTION_ID = '67f630fb0019582e45ac'; // Exams collection

// Define the Book interface
interface Book {
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

// Define the exam document type
interface ExamDocument {
  $id: string;
  name: string;
  description?: string;
  iconId?: string;
}

export default function ManageBooks() {
  const { isAdmin, session } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const [exams, setExams] = useState<ExamDocument[]>([]);
  const [examNames, setExamNames] = useState<Record<string, string>>({});
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);

  useEffect(() => {
    // Check if user is admin
    if (!isAdmin) {
      Alert.alert('Access Denied', 'You need admin privileges to access this page.');
      router.replace('/(app)');
      return;
    }

    // Fetch books and exams
    fetchBooks();
    fetchExams();
  }, [isAdmin]);

  // Filter books when selectedExamId changes
  useEffect(() => {
    if (selectedExamId) {
      setFilteredBooks(books.filter(book => book.examId === selectedExamId));
    } else {
      setFilteredBooks(books);
    }
  }, [books, selectedExamId]);

  // Fetch books from the database
  const fetchBooks = async () => {
    setLoading(true);
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        BOOKS_COLLECTION_ID,
        [Query.orderDesc('$createdAt')]
      );
      
      const fetchedBooks = response.documents as unknown as Book[];
      setBooks(fetchedBooks);
      
      // Load cover images for books
      const coverUrlsMap: Record<string, string> = {};
      
      for (const book of fetchedBooks) {
        if (book.coverId) {
          try {
            const fileUrl = await storage.getFileView(BUCKET_ID, book.coverId);
            coverUrlsMap[book.coverId] = fileUrl.href;
          } catch (error) {
            console.error(`Error loading cover for book ${book.$id}:`, error);
          }
        }
      }
      
      setCoverUrls(coverUrlsMap);
    } catch (error) {
      console.error('Error fetching books:', error);
      Alert.alert('Error', 'Failed to load books. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch exams from the database
  const fetchExams = async () => {
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        EXAMS_COLLECTION_ID,
        [Query.orderDesc('$createdAt')]
      );
      
      const examDocs = response.documents as unknown as ExamDocument[];
      setExams(examDocs);
      
      // Create a lookup map for exam names
      const namesMap: Record<string, string> = {};
      examDocs.forEach(exam => {
        namesMap[exam.$id] = exam.name;
      });
      setExamNames(namesMap);
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  // Handle adding a new book
  const handleAddBook = () => {
    router.push('/(app)/manage-books/add');
  };

  // Handle editing a book
  const handleEditBook = (bookId: string) => {
    router.push({
      pathname: '/(app)/manage-books/add',
      params: { bookId }
    });
  };

  // Handle deleting a book
  const handleDeleteBook = async (book: Book) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${book.title}"?`,
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
              // Delete the book document
              await database.deleteDocument(
                DATABASE_ID,
                BOOKS_COLLECTION_ID,
                book.$id
              );

              // Delete the book file
              try {
                await storage.deleteFile(BUCKET_ID, book.fileId);
              } catch (error) {
                console.error('Error deleting book file:', error);
              }

              // Delete the cover image if it exists
              if (book.coverId) {
                try {
                  await storage.deleteFile(BUCKET_ID, book.coverId);
                } catch (error) {
                  console.error('Error deleting cover image:', error);
                }
              }

              // Update the books list
              setBooks(prevBooks => prevBooks.filter(b => b.$id !== book.$id));
              Alert.alert('Success', 'Book deleted successfully');
            } catch (error) {
              console.error('Error deleting book:', error);
              Alert.alert('Error', 'Failed to delete book. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Handle filtering by exam
  const handleExamFilter = (examId: string | null) => {
    setSelectedExamId(examId);
  };

  // Render each book item
  const renderBookItem = ({ item }: { item: Book }) => (
    <View style={styles.bookCard}>
      <View style={styles.bookContent}>
        <View style={styles.coverContainer}>
          {item.coverId && coverUrls[item.coverId] ? (
            <Image 
              source={{ uri: coverUrls[item.coverId] }} 
              style={styles.coverImage} 
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderCover}>
              <FontAwesome name="book" size={24} color="#fff" />
            </View>
          )}
        </View>
        <View style={styles.bookDetails}>
          <TextCustom style={styles.bookTitle} fontSize={16}>
            {item.title}
          </TextCustom>
          <TextCustom style={styles.bookAuthor} fontSize={14}>
            {item.author}
          </TextCustom>
          <View style={styles.bookMeta}>
            <TextCustom style={styles.bookSubject} fontSize={12}>
              {item.subject}
            </TextCustom>
            {item.examId && (
              <TextCustom style={styles.bookExam} fontSize={12}>
                {examNames[item.examId] || 'Unknown Exam'}
              </TextCustom>
            )}
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="eye-outline" size={14} color="#666" />
              <TextCustom style={styles.statText} fontSize={12}>{item.views || 0}</TextCustom>
            </View>
            <View style={styles.stat}>
              <Ionicons name="download-outline" size={14} color="#666" />
              <TextCustom style={styles.statText} fontSize={12}>{item.downloads || 0}</TextCustom>
            </View>
            <TextCustom style={styles.dateText} fontSize={12}>
              {new Date(item.createdAt).toLocaleDateString()}
            </TextCustom>
          </View>
        </View>
      </View>
      <View style={styles.bookActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditBook(item.$id)}
        >
          <Ionicons name="pencil" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteBook(item)}
        >
          <Ionicons name="trash" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

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
            Manage Books
          </TextCustom>
          <View style={styles.headerRight} />
        </LinearGradient>

        <View style={styles.filterSection}>
          <TextCustom style={styles.filterTitle} fontSize={16}>
            Filter by Exam:
          </TextCustom>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
          >
            <TouchableOpacity 
              style={[
                styles.filterChip,
                selectedExamId === null && styles.activeFilterChip
              ]}
              onPress={() => handleExamFilter(null)}
            >
              <TextCustom 
                style={[
                  styles.filterChipText,
                  selectedExamId === null && styles.activeFilterChipText
                ]} 
                fontSize={14}
              >
                All
              </TextCustom>
            </TouchableOpacity>
            {exams.map(exam => (
              <TouchableOpacity 
                key={exam.$id}
                style={[
                  styles.filterChip,
                  selectedExamId === exam.$id && styles.activeFilterChip
                ]}
                onPress={() => handleExamFilter(exam.$id)}
              >
                <TextCustom 
                  style={[
                    styles.filterChipText,
                    selectedExamId === exam.$id && styles.activeFilterChipText
                  ]} 
                  fontSize={14}
                >
                  {exam.name}
                </TextCustom>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.addButtonContainer}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddBook}
          >
            <LinearGradient
              colors={['#6B46C1', '#4A23A9']}
              style={styles.addButtonGradient}
            >
              <View style={styles.addButtonContent}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <TextCustom style={styles.addButtonText} fontSize={16}>
                  Add New Book
                </TextCustom>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#6B46C1" />
            <TextCustom style={styles.loaderText} fontSize={16}>
              Loading books...
            </TextCustom>
          </View>
        ) : filteredBooks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="book" size={50} color="#ccc" />
            <TextCustom style={styles.emptyText} fontSize={16}>
              {selectedExamId ? 'No books available for this exam' : 'No books available yet'}
            </TextCustom>
            <TextCustom style={styles.emptySubText} fontSize={14}>
              Add your first book using the button above
            </TextCustom>
          </View>
        ) : (
          <FlatList
            data={filteredBooks}
            renderItem={renderBookItem}
            keyExtractor={(item) => item.$id}
            contentContainerStyle={styles.booksList}
            showsVerticalScrollIndicator={false}
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
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    width: 40,
  },
  filterSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  filterList: {
    paddingVertical: 5,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 10,
  },
  activeFilterChip: {
    backgroundColor: '#6B46C1',
  },
  filterChipText: {
    color: '#666',
  },
  activeFilterChipText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  addButtonContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  addButton: {
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  addButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
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
    textAlign: 'center',
  },
  emptySubText: {
    marginTop: 5,
    color: '#999',
    textAlign: 'center',
  },
  booksList: {
    padding: 16,
    paddingBottom: 80,
  },
  bookCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bookContent: {
    flexDirection: 'row',
  },
  coverContainer: {
    width: 80,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6B46C1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookDetails: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  bookTitle: {
    fontWeight: 'bold',
    color: '#333',
  },
  bookAuthor: {
    color: '#666',
    marginTop: 4,
  },
  bookMeta: {
    flexDirection: 'row',
    marginTop: 8,
  },
  bookSubject: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    color: '#495057',
    marginRight: 8,
  },
  bookExam: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    color: '#1976d2',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    color: '#666',
    marginLeft: 4,
  },
  dateText: {
    color: '#999',
    marginLeft: 'auto',
  },
  bookActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  editButton: {
    backgroundColor: '#2196f3',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
}); 