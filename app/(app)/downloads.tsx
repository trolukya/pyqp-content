import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Text, Platform, Image, TextInput } from 'react-native';
import BottomTabBar from '../components/BottomTabBar';
import TextCustom from '../components/TextCustom';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database, storage } from '../../lib/appwriteConfig';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { Models } from 'react-native-appwrite';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import ContentItem from '../components/ContentItem';

// Appwrite config constants
const DATABASE_ID = '67f3615a0027484c95d5';
const PAPERS_COLLECTION_ID = '6805e9460039cc752d42';
const SIMPLE_PAPERS_COLLECTION_ID = '680b65cd002eb9c1b7a9';
const BOOKS_COLLECTION_ID = '682710e0002c728483e2'; // Books collection ID
const NOTES_COLLECTION_ID = '682d9ac0001b401b3121'; // Notes collection ID
const BUCKET_ID = '6805d851000f17ea756f';
const EXAMS_COLLECTION_ID = '67f630fb0019582e45ac';

// AsyncStorage keys
const DOWNLOADED_PAPERS_KEY = 'downloadedPapers';
const DOWNLOADED_BOOKS_KEY = 'downloadedBooks';
const DOWNLOADED_NOTES_KEY = 'downloadedNotes';

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

// Define the Book interface
interface Book extends Models.Document {
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

// Define the Note interface
interface Note extends Models.Document {
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

// Define tabs for the downloaded content
type TabType = 'papers' | 'books' | 'notes';

export default function DownloadsScreen() {
  // State for tab navigation
  const [activeTab, setActiveTab] = useState<TabType>('papers');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Papers state
  const [downloadedPaperIds, setDownloadedPaperIds] = useState<string[]>([]);
  const [downloadedPapers, setDownloadedPapers] = useState<PaperDocument[]>([]);
  const [papersLoading, setPapersLoading] = useState(true);
  const [paperLocalFiles, setPaperLocalFiles] = useState<Record<string, string>>({});
  
  // Books state
  const [downloadedBookIds, setDownloadedBookIds] = useState<string[]>([]);
  const [downloadedBooks, setDownloadedBooks] = useState<Book[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const [bookLocalFiles, setBookLocalFiles] = useState<Record<string, string>>({});
  
  // Notes state (placeholder)
  const [downloadedNoteIds, setDownloadedNoteIds] = useState<string[]>([]);
  const [downloadedNotes, setDownloadedNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [noteCoverUrls, setNoteCoverUrls] = useState<Record<string, string>>({});
  const [noteLocalFiles, setNoteLocalFiles] = useState<Record<string, string>>({});
  
  // Shared state
  const [examNames, setExamNames] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load exam names for reference
    loadExamNames();
    
    // Load content based on active tab
    if (activeTab === 'papers') {
      loadDownloadedPapers();
    } else if (activeTab === 'books') {
      loadDownloadedBooks();
    } else if (activeTab === 'notes') {
      loadDownloadedNotes();
    }
  }, [activeTab]);

  const loadDownloadedPapers = async () => {
    setPapersLoading(true);
    try {
      // Get downloaded paper IDs from AsyncStorage
      const storedIds = await AsyncStorage.getItem(DOWNLOADED_PAPERS_KEY);
      const paperIds: string[] = storedIds ? JSON.parse(storedIds) : [];
      setDownloadedPaperIds(paperIds);

      if (paperIds.length === 0) {
        setPapersLoading(false);
        return;
      }

      // Fetch paper details from both collections
      const papers: PaperDocument[] = [];
      const filePathMap: Record<string, string> = {};
      
      // Try to find papers in the first collection
      for (const id of paperIds) {
        try {
          const paper = await database.getDocument(
            DATABASE_ID,
            PAPERS_COLLECTION_ID,
            id
          );
          papers.push(paper as PaperDocument);
          
          // Check if the file exists locally
          const localPath = FileSystem.documentDirectory + (paper as PaperDocument).fileName;
          const fileInfo = await FileSystem.getInfoAsync(localPath);
          
          if (fileInfo.exists) {
            filePathMap[id] = localPath;
          }
        } catch (error) {
          // If not found in first collection, try the second one
          try {
            const paper = await database.getDocument(
              DATABASE_ID,
              SIMPLE_PAPERS_COLLECTION_ID,
              id
            );
            papers.push(paper as PaperDocument);
            
            // Check if the file exists locally
            const localPath = FileSystem.documentDirectory + (paper as PaperDocument).fileName;
            const fileInfo = await FileSystem.getInfoAsync(localPath);
            
            if (fileInfo.exists) {
              filePathMap[id] = localPath;
            }
          } catch (secondError) {
            console.error(`Paper with ID ${id} not found in either collection`);
          }
        }
      }

      setDownloadedPapers(papers);
      setPaperLocalFiles(filePathMap);
    } catch (error) {
      console.error('Error loading downloaded papers:', error);
      Alert.alert('Error', 'Failed to load downloaded papers. Please try again later.');
    } finally {
      setPapersLoading(false);
    }
  };

  const loadDownloadedBooks = async () => {
    setBooksLoading(true);
    try {
      // Get downloaded book IDs from AsyncStorage
      const storedIds = await AsyncStorage.getItem(DOWNLOADED_BOOKS_KEY);
      const bookIds: string[] = storedIds ? JSON.parse(storedIds) : [];
      setDownloadedBookIds(bookIds);

      if (bookIds.length === 0) {
        setBooksLoading(false);
        return;
      }

      // Fetch book details
      const books: Book[] = [];
      const filePathMap: Record<string, string> = {};
      const newCoverUrls: Record<string, string> = {};
      
      for (const id of bookIds) {
        try {
          const book = await database.getDocument(
            DATABASE_ID,
            BOOKS_COLLECTION_ID,
            id
          );
          books.push(book as Book);
          
          // Check if the file exists locally
          const localPath = FileSystem.documentDirectory + (book as Book).fileName;
          const fileInfo = await FileSystem.getInfoAsync(localPath);
          
          if (fileInfo.exists) {
            filePathMap[id] = localPath;
          }
          
          // Get cover image URL if available
          if (book.coverId) {
            try {
              const fileUrl = await storage.getFileView(BUCKET_ID, book.coverId);
              newCoverUrls[book.coverId] = fileUrl.href;
            } catch (coverError) {
              console.error(`Error loading cover for book ${book.$id}:`, coverError);
            }
          }
        } catch (error) {
          console.error(`Book with ID ${id} not found`);
        }
      }

      setDownloadedBooks(books);
      setBookLocalFiles(filePathMap);
      setCoverUrls(newCoverUrls);
    } catch (error) {
      console.error('Error loading downloaded books:', error);
      Alert.alert('Error', 'Failed to load downloaded books. Please try again later.');
    } finally {
      setBooksLoading(false);
    }
  };

  const loadDownloadedNotes = async () => {
    setNotesLoading(true);
    try {
      // Get downloaded note IDs from AsyncStorage
      const storedIds = await AsyncStorage.getItem(DOWNLOADED_NOTES_KEY);
      const noteIds: string[] = storedIds ? JSON.parse(storedIds) : [];
      setDownloadedNoteIds(noteIds);

      if (noteIds.length === 0) {
        setNotesLoading(false);
        return;
      }

      // Fetch note details
      const notes: Note[] = [];
      const filePathMap: Record<string, string> = {};
      const newCoverUrls: Record<string, string> = {};
      
      for (const id of noteIds) {
        try {
          const note = await database.getDocument(
            DATABASE_ID,
            NOTES_COLLECTION_ID,
            id
          );
          notes.push(note as Note);
          
          // Check if the file exists locally
          const localPath = FileSystem.documentDirectory + (note as Note).fileName;
          const fileInfo = await FileSystem.getInfoAsync(localPath);
          
          if (fileInfo.exists) {
            filePathMap[id] = localPath;
          }
          
          // Get cover image URL if available
          if (note.coverId) {
            try {
              const fileUrl = await storage.getFileView(BUCKET_ID, note.coverId);
              newCoverUrls[note.coverId] = fileUrl.href;
            } catch (coverError) {
              console.error(`Error loading cover for note ${note.$id}:`, coverError);
            }
          }
        } catch (error) {
          console.error(`Note with ID ${id} not found`);
        }
      }

      setDownloadedNotes(notes);
      setNoteLocalFiles(filePathMap);
      setNoteCoverUrls(newCoverUrls);
    } catch (error) {
      console.error('Error loading downloaded notes:', error);
      Alert.alert('Error', 'Failed to load downloaded notes. Please try again later.');
    } finally {
      setNotesLoading(false);
    }
  };

  const loadExamNames = async () => {
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        EXAMS_COLLECTION_ID
      );
      
      const namesMap: Record<string, string> = {};
      response.documents.forEach(exam => {
        namesMap[exam.$id] = exam.name;
      });
      setExamNames(namesMap);
    } catch (error) {
      console.error('Error loading exam names:', error);
    }
  };

  const handleRemovePaper = async (paperId: string) => {
    try {
      // Remove from downloaded papers list
      const updatedIds = downloadedPaperIds.filter(id => id !== paperId);
      setDownloadedPaperIds(updatedIds);
      
      // Remove from displayed papers
      setDownloadedPapers(prev => prev.filter(paper => paper.$id !== paperId));
      
      // Delete the local file if it exists
      if (paperLocalFiles[paperId]) {
        await FileSystem.deleteAsync(paperLocalFiles[paperId], { idempotent: true });
        
        // Update local files map
        const updatedFiles = {...paperLocalFiles};
        delete updatedFiles[paperId];
        setPaperLocalFiles(updatedFiles);
      }
      
      // Update AsyncStorage
      await AsyncStorage.setItem(DOWNLOADED_PAPERS_KEY, JSON.stringify(updatedIds));
      
      Alert.alert('Success', 'Paper removed from downloads');
    } catch (error) {
      console.error('Error removing paper:', error);
      Alert.alert('Error', 'Failed to remove paper. Please try again.');
    }
  };

  const handleRemoveBook = async (bookId: string) => {
    try {
      // Remove from downloaded books list
      const updatedIds = downloadedBookIds.filter(id => id !== bookId);
      setDownloadedBookIds(updatedIds);
      
      // Remove from displayed books
      setDownloadedBooks(prev => prev.filter(book => book.$id !== bookId));
      
      // Delete the local file if it exists
      if (bookLocalFiles[bookId]) {
        await FileSystem.deleteAsync(bookLocalFiles[bookId], { idempotent: true });
        
        // Update local files map
        const updatedFiles = {...bookLocalFiles};
        delete updatedFiles[bookId];
        setBookLocalFiles(updatedFiles);
      }
      
      // Update AsyncStorage
      await AsyncStorage.setItem(DOWNLOADED_BOOKS_KEY, JSON.stringify(updatedIds));
      
      Alert.alert('Success', 'Book removed from downloads');
    } catch (error) {
      console.error('Error removing book:', error);
      Alert.alert('Error', 'Failed to remove book. Please try again.');
    }
  };

  const handleRemoveNote = async (noteId: string) => {
    try {
      // Remove from downloaded books
      const updatedDownloadedIds = downloadedNoteIds.filter(id => id !== noteId);
      setDownloadedNoteIds(updatedDownloadedIds);
      setDownloadedNotes(prevNotes => prevNotes.filter(note => note.$id !== noteId));
      
      // Update AsyncStorage
      await AsyncStorage.setItem(DOWNLOADED_NOTES_KEY, JSON.stringify(updatedDownloadedIds));
      
      // Try to remove local file
      const note = downloadedNotes.find(note => note.$id === noteId);
      if (note) {
        const localPath = FileSystem.documentDirectory + note.fileName;
        try {
          const fileInfo = await FileSystem.getInfoAsync(localPath);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(localPath);
          }
        } catch (error) {
          console.error('Error deleting local note file:', error);
        }
      }
      
      // Show confirmation
      Alert.alert('Note Removed', 'The note has been removed from your downloads');
    } catch (error) {
      console.error('Error removing note:', error);
      Alert.alert('Error', 'Failed to remove note. Please try again.');
    }
  };

  const handleOpenPaper = async (paper: PaperDocument) => {
    try {
      // Check if we have the file locally
      if (paperLocalFiles[paper.$id]) {
        // Open the local file
        Linking.openURL(paperLocalFiles[paper.$id]);
      } else {
        // If not available locally, try to get from server
        const fileUrl = await storage.getFileView(BUCKET_ID, paper.fileId);
        
        if (fileUrl?.href) {
          Linking.openURL(fileUrl.href);
        }
      }
    } catch (error) {
      console.error('Error opening paper:', error);
      Alert.alert('Error', 'Failed to open the paper. Please try again.');
    }
  };

  const handleOpenBook = async (book: Book) => {
    try {
      // Check if we have the file locally
      if (bookLocalFiles[book.$id]) {
        // Open the local file
        Linking.openURL(bookLocalFiles[book.$id]);
      } else {
        // If not available locally, try to get from server
        const fileUrl = await storage.getFileView(BUCKET_ID, book.fileId);
        
        // Increment the views count
        try {
          await database.updateDocument(
            DATABASE_ID,
            BOOKS_COLLECTION_ID,
            book.$id,
            { views: (book.views || 0) + 1 }
          );
        } catch (error) {
          console.error('Error updating views count:', error);
          // Continue even if updating views fails
        }
        
        if (fileUrl?.href) {
          Linking.openURL(fileUrl.href);
        }
      }
    } catch (error) {
      console.error('Error opening book:', error);
      Alert.alert('Error', 'Failed to open the book. Please try again.');
    }
  };

  const handleOpenNote = async (note: Note) => {
    try {
      const localPath = noteLocalFiles[note.$id];
      
      if (localPath) {
        // If we have a local file, open it directly
        await Linking.openURL(FileSystem.documentDirectory + note.fileName);
      } else {
        // Otherwise, get it from the server
        try {
          // Increment the views count
          await database.updateDocument(
            DATABASE_ID,
            NOTES_COLLECTION_ID,
            note.$id,
            { views: (note.views || 0) + 1 }
          );
        } catch (error) {
          console.error('Error updating views count:', error);
          // Continue even if updating views fails
        }
        
        // Get the file URL and open it
        const fileUrl = await storage.getFileView(BUCKET_ID, note.fileId);
        await Linking.openURL(fileUrl.href);
      }
    } catch (error) {
      console.error('Error opening note:', error);
      Alert.alert('Error', 'Failed to open note. Please try again.');
    }
  };

  // Filter papers based on search query
  const filteredPapers = downloadedPapers.filter(paper => 
    paper.paperName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (examNames[paper.examId] && examNames[paper.examId].toLowerCase().includes(searchQuery.toLowerCase())) ||
    paper.year.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter books based on search query
  const filteredBooks = downloadedBooks.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render tab buttons
  const renderTabButtons = () => {
    return (
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'papers' && styles.activeTabButton]}
          onPress={() => setActiveTab('papers')}
        >
          <FontAwesome 
            name="file-text" 
            size={18} 
            color={activeTab === 'papers' ? '#6B46C1' : '#666'} 
          />
          <TextCustom 
            style={[
              styles.tabButtonText, 
              activeTab === 'papers' && styles.activeTabButtonText
            ]} 
            fontSize={14}
          >
            Papers
          </TextCustom>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'books' && styles.activeTabButton]}
          onPress={() => setActiveTab('books')}
        >
          <FontAwesome 
            name="book" 
            size={18} 
            color={activeTab === 'books' ? '#6B46C1' : '#666'} 
          />
          <TextCustom 
            style={[
              styles.tabButtonText, 
              activeTab === 'books' && styles.activeTabButtonText
            ]} 
            fontSize={14}
          >
            Books
          </TextCustom>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'notes' && styles.activeTabButton]}
          onPress={() => setActiveTab('notes')}
        >
          <FontAwesome 
            name="sticky-note-o" 
            size={18} 
            color={activeTab === 'notes' ? '#6B46C1' : '#666'} 
          />
          <TextCustom 
            style={[
              styles.tabButtonText, 
              activeTab === 'notes' && styles.activeTabButtonText
            ]} 
            fontSize={14}
          >
            Notes
          </TextCustom>
        </TouchableOpacity>
      </View>
    );
  };

  // Render content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'papers':
        return renderPapersContent();
      case 'books':
        return renderBooksContent();
      case 'notes':
        return renderNotesContent();
      default:
        return null;
    }
  };

  const renderSearchBar = () => {
    return (
      <SearchBar
        placeholder={`Search ${activeTab}...`}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
    );
  };

  // Render papers content
  const renderPapersContent = () => {
    if (papersLoading) {
      return <LoadingState message="Loading downloaded papers..." />;
    }

    if (downloadedPapers.length === 0) {
      return (
        <EmptyState
          icon="file-text-o"
          title="No downloaded papers yet"
          subtitle="Papers you download will appear here"
        />
      );
    }

    return (
      <View style={styles.listContainer}>
        {renderSearchBar()}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredPapers.map(paper => (
            <ContentItem
              key={paper.$id}
              type="paper"
              title={paper.paperName}
              subtitle={`${examNames[paper.examId] || 'Unknown Exam'} • ${paper.year}`}
              description={paper.description}
              isLocal={!!paperLocalFiles[paper.$id]}
              onPress={() => handleOpenPaper(paper)}
              onRemove={() => handleRemovePaper(paper.$id)}
            />
          ))}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    );
  };

  // Render books content
  const renderBooksContent = () => {
    if (booksLoading) {
      return <LoadingState message="Loading downloaded books..." />;
    }

    if (downloadedBooks.length === 0) {
      return (
        <EmptyState
          icon="book"
          title="No downloaded books yet"
          subtitle="Books you download will appear here"
        />
      );
    }

    return (
      <View style={styles.listContainer}>
        {renderSearchBar()}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredBooks.map(book => (
            <ContentItem
              key={book.$id}
              type="book"
              title={book.title}
              subtitle={book.author}
              description={book.subject}
              imageUrl={book.coverId && coverUrls[book.coverId] ? coverUrls[book.coverId] : undefined}
              isLocal={!!bookLocalFiles[book.$id]}
              onPress={() => handleOpenBook(book)}
              onRemove={() => handleRemoveBook(book.$id)}
            />
          ))}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    );
  };

  // Render notes content (placeholder)
  const renderNotesContent = () => {
    if (notesLoading) {
      return <LoadingState message="Loading downloaded notes..." />;
    }

    if (downloadedNotes.length === 0) {
      return (
        <EmptyState
          icon="file-text-o"
          title="No Downloaded Notes"
          subtitle="You haven't downloaded any notes yet. Browse the notes section and download some for offline access."
        />
      );
    }

    const filteredNotes = searchQuery.trim() ? 
      downloadedNotes.filter(note => 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.subject.toLowerCase().includes(searchQuery.toLowerCase())
      ) : 
      downloadedNotes;

    if (filteredNotes.length === 0) {
      return (
        <EmptyState
          icon="search"
          title="No Results"
          subtitle={`No notes match "${searchQuery}". Try a different search term.`}
        />
      );
    }

    return (
      <View style={styles.notesContainer}>
        {filteredNotes.map(note => (
          <ContentItem
            key={note.$id}
            title={note.title}
            subtitle={note.author}
            description={note.subject}
            imageUrl={note.coverId && noteCoverUrls[note.coverId]}
            isLocal={!!noteLocalFiles[note.$id]}
            type="book"
            onPress={() => handleOpenNote(note)}
            onRemove={() => handleRemoveNote(note.$id)}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TextCustom style={styles.headerText} fontSize={24}>My Downloads</TextCustom>
        </View>
        
        {renderTabButtons()}
        
        <View style={styles.contentWrapper}>
          {renderContent()}
        </View>
        
        <BottomTabBar activeTab="home" />
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
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontWeight: 'bold',
    color: '#333',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#6B46C1',
  },
  tabButtonText: {
    marginLeft: 6,
    color: '#666',
  },
  activeTabButtonText: {
    color: '#6B46C1',
    fontWeight: 'bold',
  },
  // Papers styles
  papersList: {
    padding: 16,
  },
  paperCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  paperContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paperIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfTypeIcon: {
    backgroundColor: '#dc3545',
  },
  imageTypeIcon: {
    backgroundColor: '#4CAF50',
  },
  paperDetails: {
    flex: 1,
    marginLeft: 12,
  },
  paperName: {
    fontWeight: 'bold',
    color: '#333',
  },
  paperMeta: {
    color: '#666',
    marginTop: 2,
  },
  localFileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  badgeIcon: {
    marginRight: 4,
  },
  localFileText: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    justifyContent: 'center',
  },
  removeButton: {
    padding: 8,
  },
  // Books styles
  booksList: {
    padding: 16,
  },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bookContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookCoverContainer: {
    width: 60,
    height: 80,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookCover: {
    width: '100%',
    height: '100%',
  },
  bookCoverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookDetails: {
    flex: 1,
    marginLeft: 12,
  },
  bookTitle: {
    fontWeight: 'bold',
    color: '#333',
  },
  bookAuthor: {
    color: '#666',
    marginTop: 2,
  },
  bookMeta: {
    flexDirection: 'row',
    marginTop: 4,
  },
  bookMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  bookMetaText: {
    color: '#666',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
  },
  listContainer: {
    flex: 1,
    width: '100%',
  },
  scrollViewContent: {
    paddingVertical: 8,
    width: '100%',
  },
  bottomPadding: {
    height: 80, // Extra padding at the bottom to account for the tab bar
  },
  emptyStateWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesContainer: {
    flex: 1,
    padding: 16,
  },
}); 