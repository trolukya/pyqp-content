import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import TextCustom from '../../components/TextCustom';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { database } from '../../../lib/appwriteConfig';
import { Models, Query } from 'react-native-appwrite';
import { useAuth } from '../../../context/AuthContext';

// Appwrite config constants
const DATABASE_ID = '67f3615a0027484c95d5';
const TESTS_COLLECTION_ID = '682d9ac0001b401b3121';
const SUBMISSIONS_COLLECTION_ID = '682d9ac0001b401b3123';

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

interface QuestionAnswer {
  questionId: string;
  questionText: string;
  correctOption: string;
  selectedOption: string | null;
  isCorrect: boolean;
  marks: number;
}

export default function TestResultsScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ testId: string, userId?: string }>();
  const testId = params.testId;
  const userId = params.userId || session.$id;
  
  // State variables
  const [test, setTest] = useState<Test | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [answers, setAnswers] = useState<QuestionAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (testId && userId) {
      fetchTestAndSubmission();
    } else {
      Alert.alert('Error', 'Missing test or user information');
      router.back();
    }
  }, [testId, userId]);
  
  // Format time spent
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };
  
  // Fetch test and submission data
  const fetchTestAndSubmission = async () => {
    setLoading(true);
    try {
      // Fetch test data
      const testResponse = await database.getDocument(
        DATABASE_ID,
        TESTS_COLLECTION_ID,
        testId
      );
      
      setTest(testResponse as Test);
      
      // Fetch submission data
      const submissionsResponse = await database.listDocuments(
        DATABASE_ID,
        SUBMISSIONS_COLLECTION_ID,
        [
          Query.equal('testId', testId),
          Query.equal('userId', userId)
        ]
      );
      
      if (submissionsResponse.documents.length > 0) {
        const latestSubmission = submissionsResponse.documents[0] as Submission;
        setSubmission(latestSubmission);
        
        // Parse answers JSON
        if (latestSubmission.answers) {
          setAnswers(JSON.parse(latestSubmission.answers));
        }
      } else {
        Alert.alert('No Submissions', 'No test submissions found for this user.');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load test results');
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate percentage score
  const calculatePercentage = () => {
    if (!submission || !test) return 0;
    return Math.round((submission.scoreObtained / submission.totalMarks) * 100);
  };
  
  // Get color based on percentage
  const getScoreColor = () => {
    const percentage = calculatePercentage();
    if (percentage >= 80) return '#4CAF50'; // Green
    if (percentage >= 60) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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
        <TextCustom style={styles.headerTitle} fontSize={18}>
          Test Results
        </TextCustom>
        <View style={styles.headerRight} />
      </LinearGradient>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6B46C1" />
            <TextCustom style={styles.loadingText} fontSize={16}>
              Loading results...
            </TextCustom>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.resultCard}>
              <TextCustom style={styles.testTitle} fontSize={20}>
                {test?.title}
              </TextCustom>
              
              <View style={styles.scoreContainer}>
                <View style={[styles.scoreCircle, { borderColor: getScoreColor() }]}>
                  <TextCustom style={[styles.scoreText, { color: getScoreColor() }]} fontSize={32}>
                    {calculatePercentage()}%
                  </TextCustom>
                </View>
                
                <TextCustom style={styles.scoreDetails} fontSize={18}>
                  {submission?.scoreObtained}/{submission?.totalMarks} marks
                </TextCustom>
              </View>
              
              <View style={styles.metaContainer}>
                <View style={styles.metaItem}>
                  <FontAwesome name="calendar" size={16} color="#666" />
                  <TextCustom style={styles.metaText} fontSize={14}>
                    {new Date(submission?.submittedAt || '').toLocaleDateString()}
                  </TextCustom>
                </View>
                
                <View style={styles.metaItem}>
                  <FontAwesome name="clock-o" size={16} color="#666" />
                  <TextCustom style={styles.metaText} fontSize={14}>
                    Time spent: {formatTime(submission?.timeSpent || 0)}
                  </TextCustom>
                </View>
              </View>
            </View>
            
            <TextCustom style={styles.sectionTitle} fontSize={18}>
              Questions and Answers
            </TextCustom>
            
            {answers.map((answer, index) => (
              <View key={`answer-${index}`} style={styles.answerCard}>
                <View style={styles.questionHeader}>
                  <TextCustom style={styles.questionNumber} fontSize={14}>
                    Question {index + 1}
                  </TextCustom>
                  <TextCustom 
                    style={[
                      styles.answerStatus, 
                      { color: answer.isCorrect ? '#4CAF50' : '#F44336' }
                    ]} 
                    fontSize={14}
                  >
                    {answer.isCorrect ? 'Correct' : 'Incorrect'} • {answer.marks} mark{answer.marks > 1 ? 's' : ''}
                  </TextCustom>
                </View>
                
                <TextCustom style={styles.questionText} fontSize={16}>
                  {answer.questionText}
                </TextCustom>
                
                <View style={styles.answerContainer}>
                  <View style={styles.answerRow}>
                    <TextCustom style={styles.answerLabel} fontSize={14}>
                      Your answer:
                    </TextCustom>
                    <View 
                      style={[
                        styles.optionBadge,
                        answer.isCorrect ? styles.correctBadge : styles.incorrectBadge
                      ]}
                    >
                      <TextCustom 
                        style={[
                          styles.optionBadgeText,
                          answer.isCorrect ? styles.correctBadgeText : styles.incorrectBadgeText
                        ]} 
                        fontSize={14}
                      >
                        {answer.selectedOption || 'Not answered'}
                      </TextCustom>
                    </View>
                  </View>
                  
                  {!answer.isCorrect && (
                    <View style={styles.answerRow}>
                      <TextCustom style={styles.answerLabel} fontSize={14}>
                        Correct answer:
                      </TextCustom>
                      <View style={[styles.optionBadge, styles.correctBadge]}>
                        <TextCustom style={[styles.optionBadgeText, styles.correctBadgeText]} fontSize={14}>
                          {answer.correctOption}
                        </TextCustom>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            ))}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerRight: {
    width: 40,
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
  resultCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 2,
  },
  testTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  scoreText: {
    fontWeight: 'bold',
  },
  scoreDetails: {
    fontWeight: 'bold',
    color: '#333',
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 8,
    color: '#666',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  answerCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 1,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  questionNumber: {
    fontWeight: 'bold',
    color: '#6B46C1',
  },
  answerStatus: {
    fontWeight: 'bold',
  },
  questionText: {
    marginBottom: 16,
    color: '#333',
  },
  answerContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  answerLabel: {
    color: '#666',
    fontWeight: '500',
  },
  optionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  correctBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  incorrectBadge: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  optionBadgeText: {
    fontWeight: 'bold',
  },
  correctBadgeText: {
    color: '#4CAF50',
  },
  incorrectBadgeText: {
    color: '#F44336',
  },
}); 