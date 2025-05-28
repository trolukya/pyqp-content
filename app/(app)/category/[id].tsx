import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Text, Image, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import TextCustom from '../../components/TextCustom';
import { Ionicons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { database, storage } from '../../../lib/appwriteConfig';
import { Query, Models } from 'react-native-appwrite';
import BottomTabBar from '../../components/BottomTabBar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useAuth } from '../../../context/AuthContext';
import * as FileSystem from 'expo-file-system';
import { config } from '../../../lib/appwriteConfig';

// Define the Paper interface
interface Paper {
  id: string;
  $id: string;
  title: string;
  paperName: string;
  exam: string;
  examId: string;
  year: string;
  grade: string;
  description?: string;
  fileId: string;
  fileType: string;
  isNew: boolean;
}

// Define the exam document type
interface ExamDocument extends Models.Document {
  name: string;
  description?: string;
  iconId?: string;
  createdAt: string;
  updatedAt: string;
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

// Define the video lecture type
interface VideoLecture extends Models.Document {
  title: string;
  description: string;
  examId: string;
  subject: string;
  thumbnailId: string;
  videoId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  duration: number;
  isActive: boolean;
}

// Define the Daily Quiz type
interface DailyQuiz extends Models.Document {
  question: string;
  options: string;
  createdAt: string;
  isActive: boolean;
  userId: string;
  category?: string;
  difficulty?: string;
  score?: number;
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

// Add a Test interface to the top of the file with other interfaces
interface Test extends Models.Document {
  title: string;
  description?: string;
  examId?: string;
  fileId?: string;
  fileName?: string;
  coverId?: string;
  createdAt: string;
  uploadedBy: string;
  author: string;
  views: number;
  downloads: number;
  isActive: boolean;
  duration: number;
  questions: number;
  marks: number;
  hasQuestions: boolean;
}

// AsyncStorage keys
const SAVED_PAPERS_KEY = 'savedPapers';
const DOWNLOADED_PAPERS_KEY = 'downloadedPapers';
const QUIZ_ANSWERS_KEY = 'quizAnswers';
const SAVED_BOOKS_KEY = 'savedBooks'; // Add new key for saved books
const DOWNLOADED_BOOKS_KEY = 'downloadedBooks'; // Add new key for downloaded books
const SAVED_NOTES_KEY = 'savedNotes'; // Add new key for saved notes
const DOWNLOADED_NOTES_KEY = 'downloadedNotes'; // Add new key for downloaded notes

// Appwrite config constants
const DATABASE_ID = config.databaseId;
const BUCKET_ID = '6805d851000f17ea756f';
const COLLECTION_ID = config.collections.exams; // Exams collection
const VIDEOS_COLLECTION_ID = '6825ae40002771eaf8c0'; // Videos collection
const BOOKS_COLLECTION_ID = '682710e0002c728483e2'; // Books collection
const NOTES_COLLECTION_ID = '682d9ac0001b401b3121'; // Notes collection
const TESTS_COLLECTION_ID = config.collections.tests; // Tests collection

// Dummy data for exam papers
const EXAM_PAPERS: Paper[] = [
  {
    id: 'p1',
    $id: 'p1',
    title: 'Paper-II-Set-A',
    paperName: 'Paper-II-Set-A',
    exam: 'ADRE',
    examId: 'adre1',
    year: '2024',
    grade: 'Grade-4',
    fileId: 'file1',
    fileType: 'application/pdf',
    isNew: true
  },
  {
    id: 'p2',
    $id: 'p2',
    title: 'Paper-I-Set-A',
    paperName: 'Paper-I-Set-A',
    exam: 'ADRE',
    examId: 'adre1',
    year: '2024',
    grade: 'Grade-4',
    fileId: 'file2',
    fileType: 'application/pdf',
    isNew: true
  },
  {
    id: 'p3',
    $id: 'p3',
    title: 'Paper-V-Set-A',
    paperName: 'Paper-V-Set-A',
    exam: 'ADRE',
    examId: 'adre1',
    year: '2024',
    grade: 'Grade-3',
    fileId: 'file3',
    fileType: 'application/pdf',
    isNew: true
  },
  {
    id: 'p4',
    $id: 'p4',
    title: 'Paper-IV-Set-A',
    paperName: 'Paper-IV-Set-A',
    exam: 'ADRE',
    examId: 'adre1',
    year: '2024',
    grade: 'Grade-3',
    fileId: 'file4',
    fileType: 'application/pdf',
    isNew: true
  }
];

export default function CategoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth(); // Get admin status from auth context
  const [categoryTitle, setCategoryTitle] = useState('Category Details');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [exams, setExams] = useState<ExamDocument[]>([]);
  const [examNames, setExamNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [examsLoading, setExamsLoading] = useState(false);
  const [savedPapers, setSavedPapers] = useState<string[]>([]);
  const [downloadedPapers, setDownloadedPapers] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>({});
  const [iconUrls, setIconUrls] = useState<Record<string, string>>({});
  // New state for videos
  const [videos, setVideos] = useState<VideoLecture[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  // Add a new state for selected exam filtering
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [filteredVideos, setFilteredVideos] = useState<VideoLecture[]>([]);
  const [quizzes, setQuizzes] = useState<DailyQuiz[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  // Add this to store selected answers for each quiz
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  // Add state for books
  const [books, setBooks] = useState<Book[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  // Add state for saved books
  const [savedBooks, setSavedBooks] = useState<string[]>([]);
  // Add state for book download status
  const [isDownloadingBook, setIsDownloadingBook] = useState<Record<string, boolean>>({});
  // Add state for notes
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteCoverUrls, setNoteCoverUrls] = useState<Record<string, string>>({});
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  // Add state for saved notes
  const [savedNotes, setSavedNotes] = useState<string[]>([]);
  // Add state for note download status
  const [isDownloadingNote, setIsDownloadingNote] = useState<Record<string, boolean>>({});
  // Inside the CategoryDetail component, add these state variables
  const [tests, setTests] = useState<Test[]>([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const [testCoverUrls, setTestCoverUrls] = useState<Record<string, string>>({});
  const [filteredTests, setFilteredTests] = useState<Test[]>([]);

  useEffect(() => {
    // Set category title and load papers based on id
    if (id === '1') {
      setCategoryTitle('Exam Papers');
      setPapers(EXAM_PAPERS);
      // In a real app, this would be:
      // fetchPapers();
    } else if (id === '3') {
      setCategoryTitle('Mock Tests');
      // Fetch exams for mock tests page
      fetchExams();
      // Fetch tests
      fetchTests();
    } else if (id === '4') {
      setCategoryTitle('Video Lectures');
      // Fetch exams for video lectures page
      fetchExams();
      // Fetch videos
      fetchVideos();
    } else if (id === '5') {
      setCategoryTitle('Live Classes');
    } else if (id === '6') {
      setCategoryTitle('Notes');
      // Fetch exams for notes page
      fetchExams();
      // Fetch notes
      fetchNotes();
      // Load saved notes
      loadSavedNotes();
    } else if (id === '7') {
      setCategoryTitle('E-Books');
      // Fetch exams for e-books page
      fetchExams();
      // Fetch books
      fetchBooks();
      // Load saved books
      loadSavedBooks();
    } else if (id === '8') {
      setCategoryTitle('Daily Quiz');
      fetchQuizzes();
      loadSavedAnswers();
    }

    // Create a dummy mapping of exam IDs to names
    const namesMap: Record<string, string> = {};
    namesMap['adre1'] = 'ADRE';
    setExamNames(namesMap);

    // Load saved and downloaded papers
    loadSavedPapers();
    loadDownloadedPapers();
  }, [id]);

  // Add useEffect to filter tests by examId
  useEffect(() => {
    if (selectedExamId) {
      setFilteredTests(tests.filter(test => test.examId === selectedExamId));
    } else {
      setFilteredTests(tests);
    }
  }, [tests, selectedExamId]);

  // Add effect to filter resources when selectedExamId changes
  useEffect(() => {
    if (selectedExamId) {
      setFilteredVideos(videos.filter(video => video.examId === selectedExamId));
      setFilteredBooks(books.filter(book => book.examId === selectedExamId));
      setFilteredNotes(notes.filter(note => note.examId === selectedExamId));
      setFilteredTests(tests.filter(test => test.examId === selectedExamId));
    } else {
      setFilteredVideos(videos);
      setFilteredBooks(books);
      setFilteredNotes(notes);
      setFilteredTests(tests);
    }
  }, [videos, books, notes, tests, selectedExamId]);

  // Update the fetchVideos function to reset selectedExamId
  const fetchVideos = async () => {
    setVideosLoading(true);
    setSelectedExamId(null); // Reset selected exam when fetching all videos
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
      setVideosLoading(false);
    }
  };

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle video play
  const handleVideoPress = async (video: VideoLecture) => {
    try {
      // Get video URL
      const fileUrl = await storage.getFileView(BUCKET_ID, video.videoId);
      if (fileUrl?.href) {
        // Update views count
        try {
          await database.updateDocument(
            DATABASE_ID,
            VIDEOS_COLLECTION_ID,
            video.$id,
            { views: video.views + 1 }
          );
        } catch (error) {
          console.error('Error updating view count:', error);
        }
        
        // Open video using Linking
        Linking.openURL(fileUrl.href);
      }
    } catch (error) {
      console.error('Error opening video:', error);
      Alert.alert('Error', 'Failed to open video. Please try again.');
    }
  };

  const fetchExams = async () => {
    setExamsLoading(true);
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
      setExamsLoading(false);
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

  const handlePaperPress = async (paper: Paper) => {
    try {
      // Simulate getting file view URL
      console.log(`Opening paper ${paper.id}`);
      // In a real app, this would be:
      // const fileUrl = await storage.getFileView(BUCKET_ID, paper.fileId);
      // if (fileUrl?.href) {
      //   Linking.openURL(fileUrl.href);
      // }
    } catch (error) {
      console.error('Error opening paper:', error);
    }
  };

  const handleSavePaper = async (paper: Paper) => {
    try {
      // Check if already saved
      const isSaved = savedPapers.includes(paper.$id);
      
      if (isSaved) {
        // Remove from saved papers
        const updatedSaved = savedPapers.filter(id => id !== paper.$id);
        setSavedPapers(updatedSaved);
        await AsyncStorage.setItem(SAVED_PAPERS_KEY, JSON.stringify(updatedSaved));
      } else {
        // Add to saved papers
        const updatedSaved = [...savedPapers, paper.$id];
        setSavedPapers(updatedSaved);
        await AsyncStorage.setItem(SAVED_PAPERS_KEY, JSON.stringify(updatedSaved));
      }
    } catch (error) {
      console.error('Error saving paper:', error);
    }
  };

  const handleDownloadPaper = async (paper: Paper) => {
    // Set downloading state for this paper
    setIsDownloading(prev => ({ ...prev, [paper.$id]: true }));
    
    try {
      // Simulate downloading
      console.log(`Downloading paper ${paper.id}`);
      
      // Add to downloaded papers
      if (!downloadedPapers.includes(paper.$id)) {
        const updatedDownloaded = [...downloadedPapers, paper.$id];
        setDownloadedPapers(updatedDownloaded);
        await AsyncStorage.setItem(DOWNLOADED_PAPERS_KEY, JSON.stringify(updatedDownloaded));
      }
      
      // In a real app, this would be:
      // const fileUrl = await storage.getFileView(BUCKET_ID, paper.fileId);
      // if (fileUrl?.href) {
      //   Linking.openURL(fileUrl.href);
      // }
    } catch (error) {
      console.error('Error downloading paper:', error);
    } finally {
      // Reset downloading state for this paper
      setTimeout(() => {
        setIsDownloading(prev => ({ ...prev, [paper.$id]: false }));
      }, 1000);
    }
  };

  // Update handleExamPress to filter videos when on video lectures page
  const handleExamPress = (examId: string) => {
    if (id === '4') {
      // For Video Lectures page, filter videos by exam
      setSelectedExamId(examId);
      
      // Update the page title to show selected exam
      const examName = examNames[examId] || exams.find(e => e.$id === examId)?.name || 'Selected Exam';
      setCategoryTitle(`${examName} Videos`);
    } else if (id === '6') {
      // For Notes page, filter notes by exam
      setSelectedExamId(examId);
      
      // Update the page title to show selected exam
      const examName = examNames[examId] || exams.find(e => e.$id === examId)?.name || 'Selected Exam';
      setCategoryTitle(`${examName} Notes`);
    } else if (id === '7') {
      // For E-Books page, filter books by exam
      setSelectedExamId(examId);
      
      // Update the page title to show selected exam
      const examName = examNames[examId] || exams.find(e => e.$id === examId)?.name || 'Selected Exam';
      setCategoryTitle(`${examName} Books`);
    } else {
      // For other pages, navigate to exam details page
      router.push({
        pathname: "/exams/[id]",
        params: { id: examId }
      });
    }
  };

  // Handler for Add Video Lecture button
  const handleAddVideoLecture = () => {
    // Navigate to the add video lecture page
    router.push('/(app)/manage-videos/add');
  };

  // Add a reset filter function
  const resetVideoFilters = () => {
    setSelectedExamId(null);
    if (id === '4') {
      setCategoryTitle('Video Lectures');
    } else if (id === '6') {
      setCategoryTitle('Notes');
    } else if (id === '7') {
      setCategoryTitle('E-Books');
    }
  };

  // Add a function to handle adding daily quiz
  const handleAddDailyQuiz = () => {
    router.push('/(app)/manage-quizzes/add');
  };

  const handleAddBooks = () => {
    router.push('/(app)/manage-books/add');
  };

  const handleAddNotes = () => {
    router.push('/(app)/manage-notes/add');
  };

  const handleAddTests = () => {
    router.push('/(app)/manage-tests/add' as any);
  };

  const fetchQuizzes = async () => {
    setQuizzesLoading(true);
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        '6826e04b002731aaf7f4', // Daily quizzes collection ID
        [Query.orderDesc('$createdAt'), Query.equal('isActive', true)]
      );
      
      setQuizzes(response.documents as unknown as DailyQuiz[]);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      Alert.alert('Error', 'Failed to load quizzes. Please try again.');
    } finally {
      setQuizzesLoading(false);
    }
  };

  // Add a function to parse the options string
  const parseQuizOptions = (optionsString: string) => {
    try {
      const [options, correctIndexStr] = optionsString.split(':');
      const optionsList = options.split('|');
      const correctIndex = parseInt(correctIndexStr, 10);
      return { optionsList, correctIndex };
    } catch (e) {
      return { optionsList: [], correctIndex: -1 };
    }
  };

  // Add this function after the fetchQuizzes function
  const handleDeleteQuiz = async (quizId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this quiz?',
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
              await database.deleteDocument(
                DATABASE_ID,
                '6826e04b002731aaf7f4', // Daily quizzes collection ID
                quizId
              );
              
              // Remove the deleted quiz from the list
              setQuizzes(prevQuizzes => prevQuizzes.filter(quiz => quiz.$id !== quizId));
              
              // Show success message
              Alert.alert('Success', 'Quiz deleted successfully');
            } catch (error) {
              console.error('Error deleting quiz:', error);
              Alert.alert('Error', 'Failed to delete quiz. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Add this function to handle answer selection
  const handleOptionSelect = (quizId: string, selectedIndex: number, correctIndex: number) => {
    // Store the selected answer for this quiz
    const updatedAnswers = {
      ...selectedAnswers,
      [quizId]: selectedIndex
    };
    
    // Update state
    setSelectedAnswers(updatedAnswers);
    
    // Save to AsyncStorage
    try {
      AsyncStorage.setItem(QUIZ_ANSWERS_KEY, JSON.stringify(updatedAnswers));
    } catch (error) {
      console.error('Error saving quiz answers:', error);
    }
  };

  // Add this function to load saved answers
  const loadSavedAnswers = async () => {
    try {
      const savedAnswers = await AsyncStorage.getItem(QUIZ_ANSWERS_KEY);
      if (savedAnswers) {
        setSelectedAnswers(JSON.parse(savedAnswers));
      }
    } catch (error) {
      console.error('Error loading saved quiz answers:', error);
    }
  };

  // Fetch books from the database
  const fetchBooks = async () => {
    setBooksLoading(true);
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        BOOKS_COLLECTION_ID,
        [Query.orderDesc('$createdAt'), Query.equal('isActive', true)]
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
      setBooksLoading(false);
    }
  };

  // Add this function to handle book press
  const handleBookPress = async (book: Book) => {
    try {
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
      
      // Get the file URL
      const fileUrl = await storage.getFileView(BUCKET_ID, book.fileId);
      
      // Open the file URL
      await Linking.openURL(fileUrl.href);
    } catch (error) {
      console.error('Error opening book:', error);
      Alert.alert('Error', 'Failed to open book. Please try again.');
    }
  };

  // Add this function to handle saving books
  const handleSaveBook = async (book: Book) => {
    try {
      // Check if already saved
      const isSaved = savedBooks.includes(book.$id);
      
      if (isSaved) {
        // Remove from saved books
        const updatedSaved = savedBooks.filter(id => id !== book.$id);
        setSavedBooks(updatedSaved);
        await AsyncStorage.setItem(SAVED_BOOKS_KEY, JSON.stringify(updatedSaved));
        Alert.alert('Book Removed', `"${book.title}" has been removed from your favorites`);
      } else {
        // Add to saved books
        const updatedSaved = [...savedBooks, book.$id];
        setSavedBooks(updatedSaved);
        await AsyncStorage.setItem(SAVED_BOOKS_KEY, JSON.stringify(updatedSaved));
        Alert.alert('Book Saved', `"${book.title}" has been saved to your favorites`);
      }
    } catch (error) {
      console.error('Error saving book:', error);
      Alert.alert('Error', 'Failed to save book. Please try again.');
    }
  };

  // Update handleDownloadBook to show download status
  const handleDownloadBook = async (book: Book) => {
    // Set downloading state for this book
    setIsDownloadingBook(prev => ({ ...prev, [book.$id]: true }));
    
    try {
      // Get the file URL
      const fileUrl = await storage.getFileView(BUCKET_ID, book.fileId);
      
      // Increment the downloads count
      try {
        await database.updateDocument(
          DATABASE_ID,
          BOOKS_COLLECTION_ID,
          book.$id,
          { downloads: (book.downloads || 0) + 1 }
        );
        
        // Update the book in the local state to show the updated download count
        setBooks(prevBooks => 
          prevBooks.map(b => 
            b.$id === book.$id ? { ...b, downloads: (b.downloads || 0) + 1 } : b
          )
        );
        
        // Also update filtered books if needed
        if (filteredBooks.some(b => b.$id === book.$id)) {
          setFilteredBooks(prevBooks => 
            prevBooks.map(b => 
              b.$id === book.$id ? { ...b, downloads: (b.downloads || 0) + 1 } : b
            )
          );
        }
      } catch (error) {
        console.error('Error updating downloads count:', error);
        // Continue even if updating downloads fails
      }
      
      // Save the book ID to downloaded books in AsyncStorage
      try {
        // Get current downloaded book IDs
        const storedIds = await AsyncStorage.getItem(DOWNLOADED_BOOKS_KEY);
        const bookIds: string[] = storedIds ? JSON.parse(storedIds) : [];
        
        // Add this book ID if it's not already in the list
        if (!bookIds.includes(book.$id)) {
          bookIds.push(book.$id);
          await AsyncStorage.setItem(DOWNLOADED_BOOKS_KEY, JSON.stringify(bookIds));
        }
      } catch (error) {
        console.error('Error saving downloaded book ID:', error);
      }
      
      // Try to download the file to local storage
      try {
        const localPath = FileSystem.documentDirectory + book.fileName;
        const downloadResumable = FileSystem.createDownloadResumable(
          fileUrl.href,
          localPath,
          {},
          (downloadProgress) => {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            console.log(`Download progress: ${progress * 100}%`);
          }
        );
        
        // Start the download
        const downloadResult = await downloadResumable.downloadAsync();
        if (downloadResult && downloadResult.uri) {
          console.log('File downloaded to:', downloadResult.uri);
        }
      } catch (downloadError) {
        console.error('Error downloading file locally:', downloadError);
        // Continue even if local download fails
      }
      
      // Open the file URL for download
      await Linking.openURL(fileUrl.href);
      
      // Show confirmation
      Alert.alert('Download Started', `"${book.title}" is being downloaded and added to your Downloads page`);
    } catch (error) {
      console.error('Error downloading book:', error);
      Alert.alert('Error', 'Failed to download book. Please try again.');
    } finally {
      // Reset downloading state for this book after a short delay
      setTimeout(() => {
        setIsDownloadingBook(prev => ({ ...prev, [book.$id]: false }));
      }, 1000);
    }
  };

  // Add function to load saved books
  const loadSavedBooks = async () => {
    try {
      const storedBooks = await AsyncStorage.getItem(SAVED_BOOKS_KEY);
      if (storedBooks) {
        setSavedBooks(JSON.parse(storedBooks));
      }
    } catch (error) {
      console.error('Error loading saved books:', error);
    }
  };

  // Update the fetchNotes function to load cover images
  const fetchNotes = async () => {
    setNotesLoading(true);
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        NOTES_COLLECTION_ID,
        [Query.orderDesc('$createdAt'), Query.equal('isActive', true)]
      );
      
      const fetchedNotes = response.documents as unknown as Note[];
      setNotes(fetchedNotes);
      
      // Load cover images for notes
      const coverUrlsMap: Record<string, string> = {};
      
      for (const note of fetchedNotes) {
        if (note.coverId) {
          try {
            const fileUrl = await storage.getFileView(BUCKET_ID, note.coverId);
            coverUrlsMap[note.coverId] = fileUrl.href;
          } catch (error) {
            console.error(`Error loading cover for note ${note.$id}:`, error);
          }
        }
      }
      
      setNoteCoverUrls(coverUrlsMap);
    } catch (error) {
      console.error('Error fetching notes:', error);
      Alert.alert('Error', 'Failed to load notes. Please try again.');
    } finally {
      setNotesLoading(false);
    }
  };

  // Add this function to handle note press
  const handleNotePress = async (note: Note) => {
    try {
      // Increment the views count
      try {
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
      
      // Get the file URL
      const fileUrl = await storage.getFileView(BUCKET_ID, note.fileId);
      
      // Open the file URL
      await Linking.openURL(fileUrl.href);
    } catch (error) {
      console.error('Error opening note:', error);
      Alert.alert('Error', 'Failed to open note. Please try again.');
    }
  };

  // Add this function to handle saving notes
  const handleSaveNote = async (note: Note) => {
    try {
      // Check if already saved
      const isSaved = savedNotes.includes(note.$id);
      
      if (isSaved) {
        // Remove from saved notes
        const updatedSaved = savedNotes.filter(id => id !== note.$id);
        setSavedNotes(updatedSaved);
        await AsyncStorage.setItem(SAVED_NOTES_KEY, JSON.stringify(updatedSaved));
        Alert.alert('Note Removed', `"${note.title}" has been removed from your favorites`);
      } else {
        // Add to saved notes
        const updatedSaved = [...savedNotes, note.$id];
        setSavedNotes(updatedSaved);
        await AsyncStorage.setItem(SAVED_NOTES_KEY, JSON.stringify(updatedSaved));
        Alert.alert('Note Saved', `"${note.title}" has been saved to your favorites`);
      }
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save note. Please try again.');
    }
  };

  // Add this function to handle downloading notes
  const handleDownloadNote = async (note: Note) => {
    // Set downloading state for this note
    setIsDownloadingNote(prev => ({ ...prev, [note.$id]: true }));
    
    try {
      // Get the file URL
      const fileUrl = await storage.getFileView(BUCKET_ID, note.fileId);
      
      // Increment the downloads count
      try {
        await database.updateDocument(
          DATABASE_ID,
          NOTES_COLLECTION_ID,
          note.$id,
          { downloads: (note.downloads || 0) + 1 }
        );
        
        // Update the note in the local state to show the updated download count
        setNotes(prevNotes => 
          prevNotes.map(n => 
            n.$id === note.$id ? { ...n, downloads: (n.downloads || 0) + 1 } : n
          )
        );
        
        // Also update filtered notes if needed
        if (filteredNotes.some(n => n.$id === note.$id)) {
          setFilteredNotes(prevNotes => 
            prevNotes.map(n => 
              n.$id === note.$id ? { ...n, downloads: (n.downloads || 0) + 1 } : n
            )
          );
        }
      } catch (error) {
        console.error('Error updating downloads count:', error);
        // Continue even if updating downloads fails
      }
      
      // Save the note ID to downloaded notes in AsyncStorage
      try {
        // Get current downloaded note IDs
        const storedIds = await AsyncStorage.getItem(DOWNLOADED_NOTES_KEY);
        const noteIds: string[] = storedIds ? JSON.parse(storedIds) : [];
        
        // Add this note ID if it's not already in the list
        if (!noteIds.includes(note.$id)) {
          noteIds.push(note.$id);
          await AsyncStorage.setItem(DOWNLOADED_NOTES_KEY, JSON.stringify(noteIds));
        }
      } catch (error) {
        console.error('Error saving downloaded note ID:', error);
      }
      
      // Try to download the file to local storage
      try {
        const localPath = FileSystem.documentDirectory + note.fileName;
        const downloadResumable = FileSystem.createDownloadResumable(
          fileUrl.href,
          localPath,
          {},
          (downloadProgress) => {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            console.log(`Download progress: ${progress * 100}%`);
          }
        );
        
        // Start the download
        const downloadResult = await downloadResumable.downloadAsync();
        if (downloadResult && downloadResult.uri) {
          console.log('File downloaded to:', downloadResult.uri);
        }
      } catch (downloadError) {
        console.error('Error downloading file locally:', downloadError);
        // Continue even if local download fails
      }
      
      // Open the file URL for download
      await Linking.openURL(fileUrl.href);
      
      // Show confirmation
      Alert.alert('Download Started', `"${note.title}" is being downloaded and added to your Downloads page`);
    } catch (error) {
      console.error('Error downloading note:', error);
      Alert.alert('Error', 'Failed to download note. Please try again.');
    } finally {
      // Reset downloading state for this note after a short delay
      setTimeout(() => {
        setIsDownloadingNote(prev => ({ ...prev, [note.$id]: false }));
      }, 1000);
    }
  };

  // Add function to load saved notes
  const loadSavedNotes = async () => {
    try {
      const storedNotes = await AsyncStorage.getItem(SAVED_NOTES_KEY);
      if (storedNotes) {
        setSavedNotes(JSON.parse(storedNotes));
      }
    } catch (error) {
      console.error('Error loading saved notes:', error);
    }
  };

  // Add a function to fetch tests
  const fetchTests = async () => {
    setTestsLoading(true);
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        TESTS_COLLECTION_ID,
        [Query.equal('isActive', true), Query.equal('hasQuestions', true)]
      );
      
      const fetchedTests = response.documents as unknown as Test[];
      setTests(fetchedTests);
      
      // Load cover images for tests
      const coverUrlsMap: Record<string, string> = {};
      
      for (const test of fetchedTests) {
        if (test.coverId) {
          try {
            const fileUrl = await storage.getFileView(BUCKET_ID, test.coverId);
            coverUrlsMap[test.coverId] = fileUrl.href;
          } catch (error) {
            console.error(`Error loading cover for test ${test.$id}:`, error);
          }
        }
      }
      
      setTestCoverUrls(coverUrlsMap);
    } catch (error) {
      console.error('Error fetching tests:', error);
      Alert.alert('Error', 'Failed to load tests. Please try again.');
    } finally {
      setTestsLoading(false);
    }
  };

  // Fix the handler for opening mock tests
  const handleMockTestPress = (testId: string) => {
    router.push({
      pathname: "/(app)/take-test/[testId]",
      params: { testId }
    });
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
            onPress={() => {
              if ((id === '4' || id === '6' || id === '7') && selectedExamId) {
                // If we're filtering videos, notes, or books, first clear the filter
                resetVideoFilters();
              } else {
                // Otherwise, go back to previous screen
                router.back();
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TextCustom style={styles.headerTitle} fontSize={20}>
            {categoryTitle}
          </TextCustom>
          {(id === '4' || id === '7') && selectedExamId && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetVideoFilters}
            >
              <FontAwesome name="times" size={16} color="#fff" />
            </TouchableOpacity>
          )}
          {!selectedExamId && <View style={styles.placeholder} />}
        </LinearGradient>

        {id === '8' ? (
          // For Daily Quiz, don't wrap in ScrollView since we use FlatList
          <View style={[styles.scrollContent, styles.fullHeight]}>
            <View style={styles.quizContainer}>
              {isAdmin && (
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={handleAddDailyQuiz}
                >
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <TextCustom style={styles.addButtonText} fontSize={16}>Add Daily Quiz</TextCustom>
                </TouchableOpacity>
              )}
              
              {quizzesLoading ? (
                <ActivityIndicator size="large" color="#6B46C1" style={styles.loader} />
              ) : quizzes.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <FontAwesome name="question-circle" size={50} color="#ccc" />
                  <TextCustom style={styles.emptyText} fontSize={16}>No quizzes available yet</TextCustom>
                  {isAdmin && (
                    <TextCustom style={styles.subEmptyText} fontSize={14}>
                      Add your first quiz using the button above
                    </TextCustom>
                  )}
                </View>
              ) : (
                <FlatList
                  data={quizzes}
                  keyExtractor={(item) => item.$id}
                  contentContainerStyle={styles.quizzesList}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const { optionsList, correctIndex } = parseQuizOptions(item.options);
                    const isOptionSelected = selectedAnswers[item.$id] !== undefined;
                    const isCorrect = correctIndex === selectedAnswers[item.$id];
                    const isSelected = selectedAnswers[item.$id] === correctIndex;
                    
                    return (
                      <View style={styles.quizCard}>
                        <View style={[styles.quizDifficultyBadge, 
                          item.difficulty === 'Easy' && styles.easyBadge,
                          item.difficulty === 'Hard' && styles.hardBadge,
                          item.difficulty === 'Medium' && styles.mediumBadge,
                        ]}>
                          <TextCustom style={styles.quizDifficultyText} fontSize={12}>
                            {item.difficulty || 'Medium'}
                          </TextCustom>
                        </View>
                        
                        <TextCustom style={styles.quizQuestion} fontSize={18}>
                          {item.question}
                        </TextCustom>
                        
                        <View style={styles.quizOptions}>
                          {optionsList.map((option, index) => {
                            return (
                              <TouchableOpacity 
                                key={index}
                                style={[
                                  styles.quizOption,
                                  isOptionSelected && index === correctIndex && styles.correctOption,
                                  isOptionSelected && index === selectedAnswers[item.$id] && !isCorrect && styles.incorrectOption,
                                  isOptionSelected && index !== selectedAnswers[item.$id] && styles.unselectedOption
                                ]}
                                activeOpacity={0.7}
                                onPress={() => {
                                  // Only allow selection if not already selected
                                  if (selectedAnswers[item.$id] === undefined) {
                                    handleOptionSelect(item.$id, index, correctIndex);
                                  }
                                }}
                              >
                                <TextCustom 
                                  style={[
                                    styles.quizOptionText,
                                    isOptionSelected && index === correctIndex && styles.correctOptionText,
                                    isOptionSelected && index === selectedAnswers[item.$id] && !isCorrect && styles.incorrectOptionText
                                  ]} 
                                  fontSize={14}
                                >
                                  {option}
                                </TextCustom>
                                
                                {isOptionSelected && (
                                  <View style={styles.resultIconContainer}>
                                    {index === correctIndex ? (
                                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                                    ) : (
                                      index === selectedAnswers[item.$id] && <Ionicons name="close-circle" size={20} color="#E53935" />
                                    )}
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        
                        <View style={styles.quizFooter}>
                          <TextCustom style={styles.quizCreatedAt} fontSize={12}>
                            {new Date(item.createdAt).toLocaleDateString()}
                          </TextCustom>
                          {isAdmin && (
                            <View style={styles.quizActions}>
                              <TouchableOpacity 
                                style={styles.editQuizButton}
                                onPress={() => router.push({
                                  pathname: "/(app)/manage-quizzes/add",
                                  params: { quizId: item.$id }
                                })}
                              >
                                <Ionicons name="pencil-outline" size={16} color="#2196F3" />
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={styles.deleteQuizButton}
                                onPress={() => handleDeleteQuiz(item.$id)}
                              >
                                <Ionicons name="trash-outline" size={16} color="#E53935" />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </View>
          </View>
        ) : (
          // For other tabs, use regular ScrollView
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Show Exams Section for Mock Tests, Video Lectures, Notes */}
            {(id === '3' || id === '4' || id === '6') && (
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
                
                {examsLoading ? (
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
            )}

            {/* Add Video Lecture button for admins on the Video Lectures page */}
            {isAdmin && id === '4' && (
              <View style={styles.addButtonContainer}>
                <TouchableOpacity 
                  style={styles.addVideoButton}
                  onPress={handleAddVideoLecture}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#28a745', '#1e7e34']}
                    style={styles.addVideoButtonGradient}
                  >
                    <View style={styles.addVideoButtonContent}>
                      <FontAwesome name="plus" size={16} color="#fff" />
                      <TextCustom style={styles.addVideoButtonText} fontSize={14}>
                        Add Video Lecture
                      </TextCustom>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Add Tests button for admins on the Mock Tests page */}
            {isAdmin && id === '3' && (
              <View style={styles.addButtonContainer}>
                <TouchableOpacity 
                  style={styles.addVideoButton}
                  onPress={handleAddTests}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#28a745', '#1e7e34']}
                    style={styles.addVideoButtonGradient}
                  >
                    <View style={styles.addVideoButtonContent}>
                      <FontAwesome name="plus" size={16} color="#fff" />
                      <TextCustom style={styles.addVideoButtonText} fontSize={14}>
                        Add Tests
                      </TextCustom>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {id === '1' ? (
              <View style={styles.recentPapersSection}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="document-text" size={22} color="#6B46C1" />
                  <TextCustom style={styles.sectionTitle} fontSize={20}>
                    Recently Added Papers
                  </TextCustom>
                </View>
                
                {loading ? (
                  <ActivityIndicator size="large" color="#6B46C1" style={styles.loader} />
                ) : papers.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <FontAwesome name="file-o" size={50} color="#ccc" />
                    <TextCustom style={styles.emptyText} fontSize={16}>No papers available yet</TextCustom>
                  </View>
                ) : (
                  <View style={styles.papersContainer}>
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
                        <View style={styles.paperInfo}>
                          <TextCustom style={styles.paperTitle} fontSize={16}>
                            {paper.paperName}
                          </TextCustom>
                          <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <TextCustom style={styles.paperMeta} fontSize={14}>
                              {examNames[paper.examId] || paper.exam} • {paper.year}
                            </TextCustom>
                            {paper.isNew && (
                              <View style={styles.newBadge}>
                                <Text style={styles.newBadgeText}>NEW</Text>
                              </View>
                            )}
                          </View>
                          {paper.description ? (
                            <Text 
                              style={styles.paperDescription}
                              numberOfLines={1}
                            >
                              {paper.description}
                            </Text>
                          ) : (
                            <Text style={styles.paperDescription} numberOfLines={1}>
                              {examNames[paper.examId] || paper.exam} Question Papers {paper.year} | {paper.grade} | Paper
                            </Text>
                          )}
                        </View>
                        <View style={styles.actionButtons}>
                          <TouchableOpacity 
                            style={[
                              styles.actionButton, 
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
                              styles.actionButton, 
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
                )}
              </View>
            ) : id === '4' ? (
              <View style={styles.videoCardsContainer}>
                {videosLoading ? (
                  <ActivityIndicator size="large" color="#6B46C1" style={styles.loader} />
                ) : filteredVideos.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <FontAwesome name="video-camera" size={50} color="#ccc" />
                    <TextCustom style={styles.emptyText} fontSize={16}>
                      {selectedExamId ? 'No videos available for this exam yet' : 'No video lectures available yet'}
                    </TextCustom>
                  </View>
                ) : (
                  <View style={styles.videosGrid}>
                    {filteredVideos.map((video) => (
                      <TouchableOpacity 
                        key={video.$id} 
                        style={styles.videoCard}
                        onPress={() => handleVideoPress(video)}
                        activeOpacity={0.7}
                      >
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
                          <TouchableOpacity 
                            style={styles.playButton}
                            onPress={() => handleVideoPress(video)}
                          >
                            <FontAwesome name="play" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.videoInfo}>
                          <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
                          <View style={styles.videoMeta}>
                            <TextCustom style={styles.videoSubject}>{video.subject}</TextCustom>
                            <View style={styles.viewsContainer}>
                              <FontAwesome name="eye" size={12} color="#666" />
                              <TextCustom style={styles.viewsText}>{video.views}</TextCustom>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ) : id === '7' ? (
              <View style={styles.content}>
                {/* Add Exams Section similar to Video Lectures */}
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
                  
                  {examsLoading ? (
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
                      contentContainerStyle={styles.examsList}
                    >
                      {exams.map((exam) => (
                        <TouchableOpacity 
                          key={exam.$id} 
                          style={styles.examItemSmall}
                          onPress={() => handleExamPress(exam.$id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.examIconContainer}>
                            {iconUrls[exam.iconId || ''] ? (
                              <Image 
                                source={{ uri: iconUrls[exam.iconId || ''] }} 
                                style={styles.examIcon} 
                                resizeMode="contain"
                              />
                            ) : (
                              <FontAwesome name="graduation-cap" size={24} color="#fff" />
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

                {/* Add Books button - Moved to top */}
                  {isAdmin && (
                  <View style={styles.addButtonContainer}>
                    <TouchableOpacity 
                      style={styles.addBookButton}
                      onPress={handleAddBooks}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={['#6B46C1', '#4A23A9']}
                        style={styles.addBookButtonGradient}
                      >
                        <View style={styles.addBookButtonContent}>
                          <Ionicons name="add-circle" size={20} color="#fff" />
                          <TextCustom style={styles.addBookButtonText} fontSize={16}>
                            Add Books
                          </TextCustom>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Books Section */}
                <View style={styles.booksSection}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionTitleContainer}>
                      <Ionicons name="book" size={22} color="#6B46C1" />
                      <TextCustom style={styles.sectionTitle} fontSize={20}>
                        {selectedExamId ? `${exams.find(e => e.$id === selectedExamId)?.name || ''} Books` : 'All Books'}
                      </TextCustom>
                    </View>
                    
                    {selectedExamId && (
                      <TouchableOpacity 
                        style={styles.resetFilterButton}
                        onPress={() => setSelectedExamId(null)}
                        activeOpacity={0.7}
                      >
                        <TextCustom style={styles.resetFilterText} fontSize={14}>
                          Clear Filter
                        </TextCustom>
                        <Ionicons name="close-circle" size={16} color="#6B46C1" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {booksLoading ? (
                    <ActivityIndicator size="large" color="#6B46C1" style={styles.loader} />
                  ) : filteredBooks.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <FontAwesome name="book" size={50} color="#ccc" />
                      <TextCustom style={styles.emptyText} fontSize={16}>
                        {selectedExamId ? 'No books available for this exam' : 'No books available yet'}
                      </TextCustom>
                    </View>
                  ) : (
                    <FlatList
                      data={filteredBooks}
                      keyExtractor={(item) => item.$id}
                      numColumns={2}
                      contentContainerStyle={styles.booksGrid}
                      columnWrapperStyle={styles.bookRow}
                      scrollEnabled={false}
                      renderItem={({ item }) => (
                        <TouchableOpacity 
                          style={styles.bookCard}
                          onPress={() => handleBookPress(item)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.bookCoverContainer}>
                            {item.coverId && coverUrls[item.coverId] ? (
                              <Image 
                                source={{ uri: coverUrls[item.coverId] }} 
                                style={styles.bookCover} 
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.bookCoverPlaceholder}>
                                <FontAwesome name="book" size={28} color="#6B46C1" />
                              </View>
                            )}
                          </View>
                          <View style={styles.bookInfo}>
                            <TextCustom 
                              style={styles.bookTitle} 
                              fontSize={14}
                            >
                              {item.title.length > 30 ? item.title.substring(0, 30) + '...' : item.title}
                            </TextCustom>
                            <TextCustom 
                              style={styles.bookAuthor} 
                              fontSize={12}
                            >
                              {item.author.length > 20 ? item.author.substring(0, 20) + '...' : item.author}
                            </TextCustom>
                            <View style={styles.bookMeta}>
                              <View style={styles.bookMetaItem}>
                                <Ionicons name="eye" size={12} color="#666" />
                                <TextCustom style={styles.bookMetaText} fontSize={10}>
                                  {item.views || 0}
                                </TextCustom>
                              </View>
                              <View style={styles.bookMetaItem}>
                                <Ionicons name="download" size={12} color="#666" />
                                <TextCustom style={styles.bookMetaText} fontSize={10}>
                                  {item.downloads || 0}
                                </TextCustom>
                              </View>
                            </View>
                            <View style={styles.bookActions}>
                              <TouchableOpacity 
                                style={styles.bookActionButton}
                                onPress={() => handleSaveBook(item)}
                              >
                                <Ionicons 
                                  name={savedBooks.includes(item.$id) ? "bookmark" : "bookmark-outline"} 
                                  size={20} 
                                  color="#E53935" 
                                />
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={styles.bookActionButton}
                                onPress={() => handleDownloadBook(item)}
                                disabled={isDownloadingBook[item.$id]}
                              >
                                {isDownloadingBook[item.$id] ? (
                                  <ActivityIndicator size="small" color="#1976D2" />
                                ) : (
                                  <Ionicons name="download-outline" size={20} color="#1976D2" />
                                )}
                              </TouchableOpacity>
                            </View>
                          </View>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.content}>
                {id === '6' ? (
                  <View style={styles.notesContainer}>
                    {isAdmin && (
                      <TouchableOpacity 
                        style={styles.addButton}
                        onPress={handleAddNotes}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add-circle" size={20} color="#fff" />
                        <TextCustom style={styles.addButtonText} fontSize={16}>Add Notes</TextCustom>
                      </TouchableOpacity>
                    )}
                    
                    {notesLoading ? (
                      <ActivityIndicator size="large" color="#6B46C1" style={styles.loader} />
                    ) : filteredNotes.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <FontAwesome name="file-text-o" size={50} color="#ccc" />
                        <TextCustom style={styles.emptyText} fontSize={16}>
                          {selectedExamId ? 'No notes available for this exam' : 'No notes available yet'}
                        </TextCustom>
                      </View>
                    ) : (
                      <FlatList
                        data={filteredNotes}
                        keyExtractor={(item) => item.$id}
                        numColumns={2}
                        contentContainerStyle={styles.notesGrid}
                        columnWrapperStyle={styles.noteRow}
                        scrollEnabled={false}
                        renderItem={({ item }) => (
                          <TouchableOpacity 
                            style={styles.noteCard}
                            onPress={() => handleNotePress(item)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.noteCoverContainer}>
                              {item.coverId && noteCoverUrls[item.coverId] ? (
                                <Image 
                                  source={{ uri: noteCoverUrls[item.coverId] }} 
                                  style={styles.noteCover} 
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.noteCoverPlaceholder}>
                                  <FontAwesome name="file-text-o" size={28} color="#6B46C1" />
                                </View>
                              )}
                            </View>
                            <View style={styles.noteInfo}>
                              <TextCustom 
                                style={styles.noteTitle} 
                                fontSize={14}
                              >
                                {item.title.length > 30 ? item.title.substring(0, 30) + '...' : item.title}
                              </TextCustom>
                              <TextCustom 
                                style={styles.noteAuthor} 
                                fontSize={12}
                              >
                                {item.author.length > 20 ? item.author.substring(0, 20) + '...' : item.author}
                              </TextCustom>
                              <View style={styles.noteMeta}>
                                <View style={styles.noteMetaItem}>
                                  <Ionicons name="eye" size={12} color="#666" />
                                  <TextCustom style={styles.noteMetaText} fontSize={10}>
                                    {item.views || 0}
                                  </TextCustom>
                                </View>
                                <View style={styles.noteMetaItem}>
                                  <Ionicons name="download" size={12} color="#666" />
                                  <TextCustom style={styles.noteMetaText} fontSize={10}>
                                    {item.downloads || 0}
                                  </TextCustom>
                                </View>
                              </View>
                              <View style={styles.noteActions}>
                                <TouchableOpacity 
                                  style={styles.noteActionButton}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    handleSaveNote(item);
                                  }}
                                >
                                  <Ionicons 
                                    name={savedNotes.includes(item.$id) ? "bookmark" : "bookmark-outline"} 
                                    size={20} 
                                    color="#E53935" 
                                  />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                  style={styles.noteActionButton}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    handleDownloadNote(item);
                                  }}
                                  disabled={isDownloadingNote[item.$id]}
                                >
                                  {isDownloadingNote[item.$id] ? (
                                    <ActivityIndicator size="small" color="#1976D2" />
                                  ) : (
                                    <Ionicons name="download-outline" size={20} color="#1976D2" />
                                  )}
                                </TouchableOpacity>
                              </View>
                            </View>
                          </TouchableOpacity>
                        )}
                      />
                    )}
                  </View>
                ) : (
                  <View style={styles.infoCard}>
                    <TextCustom style={styles.title} fontSize={24}>
                      {categoryTitle}
                    </TextCustom>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        )}
        
        <BottomTabBar activeTab="contents" />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4A23A9',
  },
  headerTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    paddingHorizontal: 4,
  },
  placeholder: {
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  content: {
    padding: 15,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  description: {
    color: '#666',
    lineHeight: 22,
  },
  recentPapersSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  loader: {
    marginVertical: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 16,
  },
  emptyText: {
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  papersContainer: {
    marginTop: 16,
  },
  paperCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfTypeIcon: {
    backgroundColor: '#dc3545',
  },
  imageTypeIcon: {
    backgroundColor: '#4CAF50',
  },
  paperInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paperTitle: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  paperMeta: {
    color: '#666',
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  actionButton: {
    padding: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#28A745',
  },
  downloadButton: {
    backgroundColor: '#dc3545',
  },
  activeSaveButton: {
    backgroundColor: '#218838',
  },
  activeDownloadButton: {
    backgroundColor: '#c82333',
  },
  newBadge: {
    backgroundColor: '#6B46C1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  paperDescription: {
    color: '#888',
    fontSize: 12,
  },
  examsSection: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    justifyContent: 'space-between',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(107, 70, 193, 0.08)',
  },
  viewAllText: {
    fontWeight: '600',
    color: '#6B46C1',
    marginRight: 4,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  examLogo: {
    width: '100%',
    height: '100%',
  },
  fallbackLogoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 23,
  },
  examNameSmall: {
    fontWeight: '500',
    textAlign: 'center',
    fontSize: 12,
  },
  addButtonContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  addVideoButton: {
    width: '100%',
  },
  addVideoButtonGradient: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  addVideoButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addVideoButtonText: {
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  videoCardsContainer: {
    padding: 16,
    backgroundColor: 'transparent',
    marginHorizontal: 16,
  },
  videoLecturesContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  videosGrid: {
    marginTop: 8,
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
    height: 180,
    width: '100%',
    backgroundColor: '#f0f0f0',
    position: 'relative',
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
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -25,
    marginTop: -25,
  },
  videoInfo: {
    padding: 12,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  videoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoSubject: {
    fontSize: 14,
    color: '#666',
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewsText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  resetButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quizContainer: {
    flex: 1,
    padding: 15,
  },
  quizCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    position: 'relative',
  },
  quizQuestion: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  quizOptions: {
    marginBottom: 10,
  },
  quizOption: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  correctOption: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
  },
  incorrectOption: {
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    borderColor: '#E53935',
  },
  unselectedOption: {
    opacity: 0.7,
  },
  quizOptionText: {
    color: '#555',
  },
  correctOptionText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  incorrectOptionText: {
    color: '#E53935',
  },
  quizFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  quizCreatedAt: {
    color: '#999',
  },
  deleteQuizButton: {
    padding: 5,
  },
  quizDifficultyBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFB300',
  },
  easyBadge: {
    backgroundColor: '#4CAF50',
  },
  mediumBadge: {
    backgroundColor: '#FFB300',
  },
  hardBadge: {
    backgroundColor: '#E53935',
  },
  quizDifficultyText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  quizzesList: {
    paddingTop: 15,
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
  subEmptyText: {
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  quizActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editQuizButton: {
    padding: 5,
  },
  fullHeight: {
    flex: 1,
  },
  resultIconContainer: {
    position: 'absolute',
    right: 12,
  },
  centeredContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  largeButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '100%',
    maxWidth: 300,
  },
  examsList: {
    paddingTop: 15,
  },
  examItemSmall: {
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
  examIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  examIcon: {
    width: '100%',
    height: '100%',
  },
  booksSection: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
  },
  resetFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(107, 70, 193, 0.08)',
  },
  resetFilterText: {
    fontWeight: '600',
    color: '#6B46C1',
    marginRight: 4,
  },
  booksGrid: {
    paddingTop: 15,
  },
  bookRow: {
    justifyContent: 'space-between',
    marginHorizontal: 4,
  },
  bookCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
    width: '48%',
  },
  bookCoverContainer: {
    width: '100%',
    height: 120,
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
    backgroundColor: '#6B46C1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    padding: 12,
  },
  bookTitle: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  bookAuthor: {
    color: '#666',
    fontSize: 12,
  },
  bookMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookMetaText: {
    color: '#666',
    fontSize: 10,
    marginLeft: 4,
  },
  bookActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookActionButton: {
    padding: 5,
  },
  addBookButton: {
    width: '100%',
  },
  addBookButtonGradient: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  addBookButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBookButtonText: {
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  notesContainer: {
    padding: 16,
    backgroundColor: 'transparent',
    marginHorizontal: 16,
  },
  notesGrid: {
    paddingTop: 15,
  },
  noteRow: {
    justifyContent: 'space-between',
    marginHorizontal: 4,
  },
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
    width: '48%',
  },
  noteCoverContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteCover: {
    width: '100%',
    height: '100%',
  },
  noteCoverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6B46C1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteInfo: {
    padding: 12,
  },
  noteTitle: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  noteAuthor: {
    color: '#666',
    fontSize: 12,
  },
  noteMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteMetaText: {
    color: '#666',
    fontSize: 10,
    marginLeft: 4,
  },
  noteActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteActionButton: {
    padding: 5,
  },
  // Styles for test cards
  testsContainer: {
    padding: 16,
  },
  testsGrid: {
    marginTop: 16,
  },
  testCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    padding: 16,
  },
  testInfo: {
    flex: 1,
  },
  testTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  examBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  examBadgeText: {
    color: '#666',
  },
  testMeta: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
  },
  metaText: {
    color: '#666',
    marginLeft: 4,
  },
  testDate: {
    color: '#999',
    marginBottom: 8,
  },
}); 