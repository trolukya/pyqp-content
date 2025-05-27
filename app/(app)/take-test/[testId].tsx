import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, ActivityIndicator, FlatList } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import TextCustom from '../../components/TextCustom';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { database, config } from '../../../lib/appwriteConfig';
import { ID, Models, Query } from 'react-native-appwrite';
import { useAuth } from '../../../context/AuthContext';

// Appwrite config constants
const DATABASE_ID = config.databaseId;
const TESTS_COLLECTION_ID = config.collections.tests;
const QUESTIONS_COLLECTION_ID = config.collections.questions;
const SUBMISSIONS_COLLECTION_ID = config.collections.submissions;

// Define interfaces
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

interface Question extends Models.Document {
  testId: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  marks: number;
}

interface Answer {
  questionId: string;
  selectedOption: string | null;
}

export default function TakeTestScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams();
  const testId = params.testId as string;
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime] = useState(new Date());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!session) {
      Alert.alert('Login Required', 'You must be logged in to take a test.');
      router.replace("/signin");
      return;
    }
    
    fetchTest();
    
    // Clear any existing timer on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [testId]);
  
  // Fetch test details
  const fetchTest = async () => {
    try {
      const response = await database.getDocument(
        DATABASE_ID,
        TESTS_COLLECTION_ID,
        testId
      );
      
      setTest(response as Test);
      setTimeLeft(response.duration * 60); // Convert minutes to seconds
      
      // Start the timer
      startTimer();
      
      // Fetch questions after getting test
      fetchQuestions();
      
      // Increment view count
      incrementViews(response.$id, response.views);
    } catch (error) {
      console.error('Error fetching test:', error);
      Alert.alert('Error', 'Failed to load test details.');
      router.back();
    }
  };
  
  // Fetch questions for the test
  const fetchQuestions = async () => {
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        QUESTIONS_COLLECTION_ID,
        [
          Query.equal('testId', testId)
        ]
      );
      
      const fetchedQuestions = response.documents as Question[];
      setQuestions(fetchedQuestions);
      
      // Initialize answers array
      const initialAnswers: Answer[] = fetchedQuestions.map(question => ({
        questionId: question.$id,
        selectedOption: null
      }));
      
      setAnswers(initialAnswers);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching questions:', error);
      Alert.alert('Error', 'Failed to load test questions.');
      router.back();
    }
  };
  
  // Increment view count
  const incrementViews = async (id: string, currentViews: number) => {
    try {
      await database.updateDocument(
        DATABASE_ID,
        TESTS_COLLECTION_ID,
        id,
        {
          views: currentViews + 1
        }
      );
    } catch (error) {
      console.error('Error updating view count:', error);
    }
  };
  
  // Start timer
  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up - auto submit
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          submitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle answer selection
  const handleSelectAnswer = (option: string) => {
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex].selectedOption = option;
    setAnswers(updatedAnswers);
  };
  
  // Navigate to next question
  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  // Navigate to previous question
  const goToPrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  // Navigate to specific question
  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };
  
  // Submit test
  const submitTest = async () => {
    // Confirm submission only if timer hasn't expired
    if (timeLeft > 0) {
      Alert.alert(
        'Submit Test',
        'Are you sure you want to submit your test? You cannot make changes after submission.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Submit',
            onPress: processSubmission
          }
        ]
      );
    } else {
      // Auto-submit when timer expires
      processSubmission();
    }
  };
  
  // Process test submission
  const processSubmission = async () => {
    if (submitting) return;
    
    setSubmitting(true);
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    try {
      // Calculate score
      let scoreObtained = 0;
      let totalMarks = 0;
      
      questions.forEach((question, index) => {
        totalMarks += question.marks;
        
        if (answers[index].selectedOption === question.correctOption) {
          scoreObtained += question.marks;
        }
      });
      
      // Calculate time spent in seconds
      const endTime = new Date();
      const timeSpent = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      // Prepare submission data
      const submissionData = {
        testId,
        userId: session.$id,
        userName: session.name,
        submittedAt: new Date().toISOString(),
        totalMarks,
        scoreObtained,
        timeSpent,
        answers: JSON.stringify(answers)
      };
      
      // Save submission
      const response = await database.createDocument(
        DATABASE_ID,
        SUBMISSIONS_COLLECTION_ID,
        ID.unique(),
        submissionData
      );
      
      // Navigate to results page
      router.replace({
        pathname: "/(app)/test-results/[submissionId]",
        params: { submissionId: response.$id }
      } as any);
    } catch (error) {
      console.error('Error submitting test:', error);
      Alert.alert('Error', 'Failed to submit test. Please try again.');
      setSubmitting(false);
    }
  };
  
  // Render current question
  const renderCurrentQuestion = () => {
    if (questions.length === 0) return null;
    
    const question = questions[currentQuestionIndex];
    const answer = answers[currentQuestionIndex];
    
    return (
      <View style={styles.questionContainer}>
        <View style={styles.questionHeader}>
          <TextCustom style={styles.questionNumber} fontSize={14}>
            Question {currentQuestionIndex + 1} of {questions.length}
          </TextCustom>
          <TextCustom style={styles.questionMarks} fontSize={14}>
            {question.marks} marks
          </TextCustom>
        </View>
        
        <TextCustom style={styles.questionText} fontSize={16}>
          {question.questionText}
        </TextCustom>
        
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.optionItem,
              answer.selectedOption === 'A' && styles.selectedOption
            ]}
            onPress={() => handleSelectAnswer('A')}
          >
            <View style={styles.optionBullet}>
              <TextCustom style={styles.optionBulletText} fontSize={14}>A</TextCustom>
            </View>
            <TextCustom style={styles.optionText} fontSize={14}>{question.optionA}</TextCustom>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.optionItem,
              answer.selectedOption === 'B' && styles.selectedOption
            ]}
            onPress={() => handleSelectAnswer('B')}
          >
            <View style={styles.optionBullet}>
              <TextCustom style={styles.optionBulletText} fontSize={14}>B</TextCustom>
            </View>
            <TextCustom style={styles.optionText} fontSize={14}>{question.optionB}</TextCustom>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.optionItem,
              answer.selectedOption === 'C' && styles.selectedOption
            ]}
            onPress={() => handleSelectAnswer('C')}
          >
            <View style={styles.optionBullet}>
              <TextCustom style={styles.optionBulletText} fontSize={14}>C</TextCustom>
            </View>
            <TextCustom style={styles.optionText} fontSize={14}>{question.optionC}</TextCustom>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.optionItem,
              answer.selectedOption === 'D' && styles.selectedOption
            ]}
            onPress={() => handleSelectAnswer('D')}
          >
            <View style={styles.optionBullet}>
              <TextCustom style={styles.optionBulletText} fontSize={14}>D</TextCustom>
            </View>
            <TextCustom style={styles.optionText} fontSize={14}>{question.optionD}</TextCustom>
          </TouchableOpacity>
        </View>
        
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={[styles.navButton, currentQuestionIndex === 0 && styles.disabledButton]}
            onPress={goToPrevQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <Ionicons name="chevron-back" size={18} color={currentQuestionIndex === 0 ? '#ccc' : '#6B46C1'} />
            <TextCustom 
              style={[styles.navButtonText, currentQuestionIndex === 0 && styles.disabledButtonText]} 
              fontSize={14}
            >
              Previous
            </TextCustom>
          </TouchableOpacity>
          
          {currentQuestionIndex < questions.length - 1 ? (
            <TouchableOpacity
              style={styles.navButton}
              onPress={goToNextQuestion}
            >
              <TextCustom style={styles.navButtonText} fontSize={14}>
                Next
              </TextCustom>
              <Ionicons name="chevron-forward" size={18} color="#6B46C1" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.submitButton}
              onPress={submitTest}
            >
              <TextCustom style={styles.submitButtonText} fontSize={14}>
                Submit Test
              </TextCustom>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };
  
  // Render question navigation
  const renderQuestionNav = () => (
    <View style={styles.questionNavContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {questions.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.questionNavItem,
              currentQuestionIndex === index && styles.activeNavItem,
              answers[index]?.selectedOption && styles.answeredNavItem
            ]}
            onPress={() => goToQuestion(index)}
          >
            <TextCustom
              style={[
                styles.questionNavText,
                currentQuestionIndex === index && styles.activeNavText
              ]}
              fontSize={14}
            >
              {index + 1}
            </TextCustom>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#6B46C1', '#4A23A9']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => {
              Alert.alert(
                'Exit Test',
                'Are you sure you want to exit? Your progress will be lost.',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel'
                  },
                  {
                    text: 'Exit',
                    onPress: () => router.back()
                  }
                ]
              );
            }}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.timerContainer}>
            <FontAwesome name="clock-o" size={18} color="white" />
            <TextCustom style={styles.timerText} fontSize={16}>
              {formatTime(timeLeft)}
            </TextCustom>
          </View>
        </View>
        
        {!loading && test && (
          <TextCustom style={styles.testTitle} fontSize={18}>
            {test.title}
          </TextCustom>
        )}
      </LinearGradient>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6B46C1" />
            <TextCustom style={styles.loadingText} fontSize={16}>
              Loading test...
            </TextCustom>
          </View>
        ) : (
          <>
            {renderQuestionNav()}
            {renderCurrentQuestion()}
          </>
        )}
      </View>
      
      {submitting && (
        <View style={styles.submittingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <TextCustom style={styles.submittingText} fontSize={18}>
            Submitting your test...
          </TextCustom>
        </View>
      )}
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeButton: {
    padding: 4,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timerText: {
    color: 'white',
    marginLeft: 6,
    fontWeight: 'bold',
  },
  testTitle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
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
  questionNavContainer: {
    marginBottom: 16,
  },
  questionNavItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  activeNavItem: {
    backgroundColor: '#6B46C1',
  },
  answeredNavItem: {
    backgroundColor: '#9F7AEA',
  },
  questionNavText: {
    color: '#666',
  },
  activeNavText: {
    color: 'white',
    fontWeight: 'bold',
  },
  questionContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flex: 1,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  questionNumber: {
    fontWeight: 'bold',
    color: '#6B46C1',
  },
  questionMarks: {
    fontWeight: 'bold',
    color: '#666',
  },
  questionText: {
    marginBottom: 16,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionItem: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    borderWidth: 1,
    borderColor: '#6B46C1',
  },
  optionBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionBulletText: {
    fontWeight: 'bold',
    color: '#666',
  },
  optionText: {
    flex: 1,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  navButtonText: {
    color: '#6B46C1',
    fontWeight: 'bold',
  },
  disabledButtonText: {
    color: '#ccc',
  },
  submitButton: {
    backgroundColor: '#6B46C1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  submittingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  submittingText: {
    color: 'white',
    marginTop: 16,
  },
}); 