import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, ActivityIndicator, FlatList } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import TextCustom from '../../components/TextCustom';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { database, config } from '../../../lib/appwriteConfig';
import { Models, Query } from 'react-native-appwrite';
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

interface Submission extends Models.Document {
  testId: string;
  userId: string;
  userName: string;
  submittedAt: string;
  totalMarks: number;
  scoreObtained: number;
  timeSpent: number;
  answers: string; // JSON string of answers
}

interface Answer {
  questionId: string;
  selectedOption: string | null;
}

export default function TestResultsScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams();
  const submissionId = params.submissionId as string;
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  
  useEffect(() => {
    fetchSubmission();
  }, [submissionId]);
  
  // Fetch submission details
  const fetchSubmission = async () => {
    try {
      const submissionData = await database.getDocument(
        DATABASE_ID,
        SUBMISSIONS_COLLECTION_ID,
        submissionId
      );
      
      setSubmission(submissionData as Submission);
      
      // Parse answers JSON
      if (submissionData.answers) {
        setAnswers(JSON.parse(submissionData.answers) as Answer[]);
      }
      
      // Fetch test details and questions
      await fetchTest(submissionData.testId);
      await fetchQuestions(submissionData.testId);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching submission:', error);
      Alert.alert('Error', 'Failed to load test results.');
      router.back();
    }
  };
  
  // Fetch test details
  const fetchTest = async (testId: string) => {
    try {
      const testData = await database.getDocument(
        DATABASE_ID,
        TESTS_COLLECTION_ID,
        testId
      );
      
      setTest(testData as Test);
    } catch (error) {
      console.error('Error fetching test:', error);
    }
  };
  
  // Fetch questions
  const fetchQuestions = async (testId: string) => {
    try {
      const response = await database.listDocuments(
        DATABASE_ID,
        QUESTIONS_COLLECTION_ID,
        [
          Query.equal('testId', testId)
        ]
      );
      
      setQuestions(response.documents as Question[]);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };
  
  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} min ${secs} sec`;
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Calculate percentage
  const getPercentage = () => {
    if (!submission) return 0;
    return Math.round((submission.scoreObtained / submission.totalMarks) * 100);
  };
  
  // Get result status
  const getResultStatus = () => {
    const percentage = getPercentage();
    if (percentage >= 80) return 'Excellent';
    if (percentage >= 60) return 'Good';
    if (percentage >= 40) return 'Pass';
    return 'Needs Improvement';
  };
  
  // Get status color
  const getStatusColor = () => {
    const percentage = getPercentage();
    if (percentage >= 80) return '#38A169';
    if (percentage >= 60) return '#3182CE';
    if (percentage >= 40) return '#DD6B20';
    return '#E53E3E';
  };
  
  // Render question result
  const renderQuestionResult = ({ item, index }: { item: Question, index: number }) => {
    const answer = answers.find(a => a.questionId === item.$id);
    const isCorrect = answer?.selectedOption === item.correctOption;
    
    return (
      <View style={styles.questionItem}>
        <View style={styles.questionHeader}>
          <TextCustom style={styles.questionNumber} fontSize={14}>
            Question {index + 1}
          </TextCustom>
          <View style={[
            styles.resultBadge,
            isCorrect ? styles.correctBadge : styles.incorrectBadge
          ]}>
            <TextCustom style={styles.resultBadgeText} fontSize={12}>
              {isCorrect ? 'Correct' : 'Incorrect'}
            </TextCustom>
          </View>
        </View>
        
        <TextCustom style={styles.questionText} fontSize={16}>
          {item.questionText}
        </TextCustom>
        
        <View style={styles.optionsContainer}>
          {['A', 'B', 'C', 'D'].map(option => {
            const optionValue = item[`option${option}` as keyof Question] as string;
            const isSelected = answer?.selectedOption === option;
            const isCorrectOption = item.correctOption === option;
            
            return (
              <View
                key={`option-${option}`}
                style={[
                  styles.optionItem,
                  isSelected && styles.selectedOption,
                  isCorrectOption && styles.correctOption
                ]}
              >
                <View style={[
                  styles.optionBullet,
                  isSelected && styles.selectedBullet,
                  isCorrectOption && styles.correctBullet
                ]}>
                  <TextCustom 
                    style={[
                      styles.optionBulletText,
                      (isSelected || isCorrectOption) && styles.activeBulletText
                    ]} 
                    fontSize={14}
                  >
                    {option}
                  </TextCustom>
                </View>
                <TextCustom style={styles.optionText} fontSize={14}>
                  {optionValue}
                </TextCustom>
                {isCorrectOption && (
                  <FontAwesome name="check" size={14} color="#38A169" style={styles.correctIcon} />
                )}
              </View>
            );
          })}
        </View>
        
        <View style={styles.questionFooter}>
          <TextCustom style={styles.questionMarks} fontSize={14}>
            {item.marks} mark{item.marks > 1 ? 's' : ''}
          </TextCustom>
          <TextCustom style={styles.explanationText} fontSize={14}>
            {isCorrect 
              ? `+${item.marks} mark${item.marks > 1 ? 's' : ''}`
              : '0 marks'}
          </TextCustom>
        </View>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#6B46C1', '#4A23A9']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/(app)")}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <TextCustom style={styles.headerTitle} fontSize={20}>
          Test Results
        </TextCustom>
        <View style={styles.headerPlaceholder} />
      </LinearGradient>
      
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6B46C1" />
            <TextCustom style={styles.loadingText} fontSize={16}>
              Loading your results...
            </TextCustom>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.resultSummary}>
              <TextCustom style={styles.testTitle} fontSize={20}>
                {test?.title}
              </TextCustom>
              
              <View style={styles.scoreContainer}>
                <View style={styles.scoreCircle}>
                  <TextCustom style={styles.scorePercentage} fontSize={24}>
                    {getPercentage()}%
                  </TextCustom>
                </View>
                
                <View style={styles.scoreDetails}>
                  <TextCustom style={styles.scoreText} fontSize={16}>
                    Score: {submission?.scoreObtained}/{submission?.totalMarks}
                  </TextCustom>
                  
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                    <TextCustom style={styles.statusText} fontSize={14}>
                      {getResultStatus()}
                    </TextCustom>
                  </View>
                </View>
              </View>
              
              <View style={styles.resultMeta}>
                <View style={styles.metaItem}>
                  <FontAwesome name="calendar" size={16} color="#666" />
                  <TextCustom style={styles.metaText} fontSize={14}>
                    {formatDate(submission?.submittedAt || '')}
                  </TextCustom>
                </View>
                
                <View style={styles.metaItem}>
                  <FontAwesome name="clock-o" size={16} color="#666" />
                  <TextCustom style={styles.metaText} fontSize={14}>
                    Time: {formatTime(submission?.timeSpent || 0)}
                  </TextCustom>
                </View>
              </View>
            </View>
            
            <View style={styles.questionsHeader}>
              <TextCustom style={styles.questionsTitle} fontSize={18}>
                Question Analysis
              </TextCustom>
            </View>
            
            {questions.map((question, index) => renderQuestionResult({ item: question, index }))}
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push("/(app)")}
              >
                <TextCustom style={styles.primaryButtonText} fontSize={16}>
                  Back to Mock Tests
                </TextCustom>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 32,
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
  resultSummary: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  testTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6B46C1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scorePercentage: {
    color: 'white',
    fontWeight: 'bold',
  },
  scoreDetails: {
    flex: 1,
    marginLeft: 16,
  },
  scoreText: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
  },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: '#666',
    marginLeft: 6,
  },
  questionsHeader: {
    marginBottom: 16,
  },
  questionsTitle: {
    fontWeight: 'bold',
  },
  questionItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionNumber: {
    fontWeight: 'bold',
    color: '#6B46C1',
  },
  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  correctBadge: {
    backgroundColor: 'rgba(56, 161, 105, 0.1)',
  },
  incorrectBadge: {
    backgroundColor: 'rgba(229, 62, 62, 0.1)',
  },
  resultBadgeText: {
    fontWeight: 'bold',
  },
  questionText: {
    marginBottom: 12,
  },
  optionsContainer: {
    marginBottom: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedOption: {
    backgroundColor: 'rgba(229, 62, 62, 0.05)',
    borderWidth: 1,
    borderColor: '#E53E3E',
  },
  correctOption: {
    backgroundColor: 'rgba(56, 161, 105, 0.05)',
    borderWidth: 1,
    borderColor: '#38A169',
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
  selectedBullet: {
    backgroundColor: '#E53E3E',
  },
  correctBullet: {
    backgroundColor: '#38A169',
  },
  optionBulletText: {
    fontWeight: 'bold',
    color: '#666',
  },
  activeBulletText: {
    color: 'white',
  },
  optionText: {
    flex: 1,
  },
  correctIcon: {
    marginLeft: 8,
  },
  questionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  questionMarks: {
    color: '#666',
  },
  explanationText: {
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginVertical: 24,
  },
  primaryButton: {
    backgroundColor: '#6B46C1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
}); 