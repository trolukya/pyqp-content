import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, FlatList } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import TextCustom from '../../components/TextCustom';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { database, config } from '../../../lib/appwriteConfig';
import { ID, Models, Query } from 'react-native-appwrite';
import AdminTabBar from '../../components/AdminTabBar';
import { useAuth } from '../../../context/AuthContext';

// Appwrite config constants
const DATABASE_ID = config.databaseId;
const TESTS_COLLECTION_ID = config.collections.tests;
const QUESTIONS_COLLECTION_ID = config.collections.questions;

// Define the Test interface
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

// Define the Question interface
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

export default function TestQuestionsScreen() {
  const { isAdmin } = useAuth();
  const params = useLocalSearchParams<{ testId: string }>();
  const testId = params.testId;

  // State for test info
  const [test, setTest] = useState<Test | null>(null);
  const [testLoading, setTestLoading] = useState(true);

  // State for questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  // State for question form
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentQuestionId, setCurrentQuestionId] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctOption, setCorrectOption] = useState('A');
  const [questionMarks, setQuestionMarks] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'You do not have permission to access this page.');
      router.replace('/(app)');
      return;
    }
    
    if (testId) {
      fetchTest();
      fetchQuestions();
    } else {
      Alert.alert('Error', 'No test ID provided');
      router.back();
    }
  }, [testId]);

  const fetchTest = async () => {
    setTestLoading(true);
    try {
      const response = await database.getDocument(
        DATABASE_ID,
        TESTS_COLLECTION_ID,
        testId
      );
      
      setTest(response as Test);
    } catch (error) {
      console.error('Error fetching test:', error);
      Alert.alert('Error', 'Failed to load test information');
    } finally {
      setTestLoading(false);
    }
  };

  const fetchQuestions = async () => {
    setQuestionsLoading(true);
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
      Alert.alert('Error', 'Failed to load questions.');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleAddQuestion = () => {
    // Reset form and show modal
    setIsEditMode(false);
    setCurrentQuestionId('');
    setQuestionText('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setCorrectOption('A');
    setQuestionMarks('1');
    setIsModalVisible(true);
  };

  const handleEditQuestion = (question: Question) => {
    // Set form values and show modal
    setIsEditMode(true);
    setCurrentQuestionId(question.$id);
    setQuestionText(question.questionText);
    setOptionA(question.optionA);
    setOptionB(question.optionB);
    setOptionC(question.optionC);
    setOptionD(question.optionD);
    setCorrectOption(question.correctOption);
    setQuestionMarks(question.marks.toString());
    setIsModalVisible(true);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this question?',
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
                QUESTIONS_COLLECTION_ID,
                questionId
              );
              
              // Update local questions list
              setQuestions(prev => prev.filter(q => q.$id !== questionId));
              
              // Update test question count
              if (test) {
                const updatedQuestionsCount = Math.max(0, (test.questions || 1) - 1);
                await database.updateDocument(
                  DATABASE_ID,
                  TESTS_COLLECTION_ID,
                  testId,
                  { questions: updatedQuestionsCount }
                );
                
                // Update local test state
                setTest(prev => prev ? {...prev, questions: updatedQuestionsCount} : null);
              }
              
              Alert.alert('Success', 'Question deleted successfully');
            } catch (error) {
              console.error('Error deleting question:', error);
              Alert.alert('Error', 'Failed to delete question');
            }
          }
        }
      ]
    );
  };

  const validateQuestionForm = () => {
    if (!questionText.trim()) {
      Alert.alert('Error', 'Please enter a question');
      return false;
    }
    
    if (!optionA.trim() || !optionB.trim()) {
      Alert.alert('Error', 'Please enter at least options A and B');
      return false;
    }
    
    const marks = parseInt(questionMarks, 10);
    if (isNaN(marks) || marks <= 0) {
      Alert.alert('Error', 'Please enter valid marks');
      return false;
    }
    
    return true;
  };

  const handleSubmitQuestion = async () => {
    if (!validateQuestionForm()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      const questionData = {
        testId,
        questionText,
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption,
        marks: parseInt(questionMarks, 10)
      };
      
      let response: Question;
      
      if (isEditMode && currentQuestionId) {
        // Update existing question
        response = await database.updateDocument(
          DATABASE_ID,
          QUESTIONS_COLLECTION_ID,
          currentQuestionId,
          questionData
        ) as Question;
        
        // Update questions list
        setQuestions(prev => 
          prev.map(q => q.$id === currentQuestionId ? {...q, ...questionData} : q)
        );
      } else {
        // Create new question
        response = await database.createDocument(
          DATABASE_ID,
          QUESTIONS_COLLECTION_ID,
          ID.unique(),
          questionData
        ) as Question;
        
        // Add to questions list
        setQuestions(prev => [...prev, response]);
        
        // Update test question count and hasQuestions flag
        if (test) {
          const updatedQuestionsCount = (test.questions || 0) + 1;
          await database.updateDocument(
            DATABASE_ID,
            TESTS_COLLECTION_ID,
            testId,
            { 
              questions: updatedQuestionsCount,
              hasQuestions: true  // Set hasQuestions to true when at least one question is added
            }
          );
          
          // Update local test state
          setTest(prev => prev ? {...prev, questions: updatedQuestionsCount, hasQuestions: true} : null);
        }
      }
      
      // Close modal and show success message
      setIsModalVisible(false);
      Alert.alert(
        'Success', 
        isEditMode ? 'Question updated successfully' : 'Question added successfully'
      );
    } catch (error) {
      console.error('Error saving question:', error);
      Alert.alert('Error', 'Failed to save question');
    } finally {
      setSubmitting(false);
    }
  };

  // Function to handle finishing the test setup
  const handleFinishTest = () => {
    if (questions.length === 0) {
      Alert.alert('Error', 'Please add at least one question before finishing');
      return;
    }
    
    Alert.alert(
      'Finish Test Setup',
      'Are you sure you want to finish setting up this test? You can always come back to add or edit questions later.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Finish',
          onPress: () => {
            // Navigate back to the mock tests screen
            router.push('/(app)/mock-tests/' as any);
          }
        }
      ]
    );
  };

  const renderQuestionItem = ({ item }: { item: Question }) => (
    <View style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <TextCustom style={styles.questionNumber} fontSize={14}>
          Question • {item.marks} mark{item.marks > 1 ? 's' : ''}
        </TextCustom>
        <View style={styles.questionActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleEditQuestion(item)}
          >
            <FontAwesome name="pencil" size={16} color="#6B46C1" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDeleteQuestion(item.$id)}
          >
            <FontAwesome name="trash" size={16} color="#E53935" />
          </TouchableOpacity>
        </View>
      </View>
      
      <TextCustom style={styles.questionText} fontSize={16}>
        {item.questionText}
      </TextCustom>
      
      <View style={styles.optionsList}>
        <View style={[
          styles.optionItem, 
          item.correctOption === 'A' && styles.correctOption
        ]}>
          <TextCustom 
            style={[
              styles.optionLabel, 
              item.correctOption === 'A' && styles.correctOptionText
            ]} 
            fontSize={14}
          >
            A.
          </TextCustom>
          <TextCustom 
            style={[
              styles.optionText, 
              item.correctOption === 'A' && styles.correctOptionText
            ]} 
            fontSize={14}
          >
            {item.optionA}
          </TextCustom>
        </View>
        
        <View style={[
          styles.optionItem, 
          item.correctOption === 'B' && styles.correctOption
        ]}>
          <TextCustom 
            style={[
              styles.optionLabel, 
              item.correctOption === 'B' && styles.correctOptionText
            ]} 
            fontSize={14}
          >
            B.
          </TextCustom>
          <TextCustom 
            style={[
              styles.optionText, 
              item.correctOption === 'B' && styles.correctOptionText
            ]} 
            fontSize={14}
          >
            {item.optionB}
          </TextCustom>
        </View>
        
        {item.optionC && (
          <View style={[
            styles.optionItem, 
            item.correctOption === 'C' && styles.correctOption
          ]}>
            <TextCustom 
              style={[
                styles.optionLabel, 
                item.correctOption === 'C' && styles.correctOptionText
              ]} 
              fontSize={14}
            >
              C.
            </TextCustom>
            <TextCustom 
              style={[
                styles.optionText, 
                item.correctOption === 'C' && styles.correctOptionText
              ]} 
              fontSize={14}
            >
              {item.optionC}
            </TextCustom>
          </View>
        )}
        
        {item.optionD && (
          <View style={[
            styles.optionItem, 
            item.correctOption === 'D' && styles.correctOption
          ]}>
            <TextCustom 
              style={[
                styles.optionLabel, 
                item.correctOption === 'D' && styles.correctOptionText
              ]} 
              fontSize={14}
            >
              D.
            </TextCustom>
            <TextCustom 
              style={[
                styles.optionText, 
                item.correctOption === 'D' && styles.correctOptionText
              ]} 
              fontSize={14}
            >
              {item.optionD}
            </TextCustom>
          </View>
        )}
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
            {test ? test.title : 'Test Questions'}
          </TextCustom>
          <View style={styles.headerRight} />
        </LinearGradient>

        <View style={styles.content}>
          {(testLoading || questionsLoading) ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6B46C1" />
              <TextCustom style={styles.loadingText} fontSize={16}>
                Loading questions...
              </TextCustom>
            </View>
          ) : (
            <>
              <View style={styles.testInfoCard}>
                <TextCustom style={styles.testTitle} fontSize={18}>
                  {test?.title}
                </TextCustom>
                <View style={styles.testMetaContainer}>
                  <View style={styles.testMetaItem}>
                    <FontAwesome name="clock-o" size={14} color="#666" />
                    <TextCustom style={styles.testMetaText} fontSize={14}>
                      {test?.duration} min
                    </TextCustom>
                  </View>
                  <View style={styles.testMetaItem}>
                    <FontAwesome name="list" size={14} color="#666" />
                    <TextCustom style={styles.testMetaText} fontSize={14}>
                      {questions.length}/{test?.questions} Questions
                    </TextCustom>
                  </View>
                  <View style={styles.testMetaItem}>
                    <FontAwesome name="trophy" size={14} color="#666" />
                    <TextCustom style={styles.testMetaText} fontSize={14}>
                      {test?.marks} Marks
                    </TextCustom>
                  </View>
                </View>
              </View>

              <View style={styles.actionsContainer}>
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={handleAddQuestion}
                >
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <TextCustom style={styles.addButtonText} fontSize={16}>
                    Add Question
                  </TextCustom>
                </TouchableOpacity>
              </View>

              {questions.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <FontAwesome name="question-circle" size={50} color="#ccc" />
                  <TextCustom style={styles.emptyText} fontSize={16}>
                    No questions added yet
                  </TextCustom>
                  <TextCustom style={styles.emptySubText} fontSize={14}>
                    Add questions using the button above
                  </TextCustom>
                </View>
              ) : (
                <>
                  <FlatList
                    data={questions}
                    renderItem={renderQuestionItem}
                    keyExtractor={item => item.$id}
                    contentContainerStyle={styles.questionsList}
                    showsVerticalScrollIndicator={false}
                  />
                  
                  <View style={styles.finishButtonContainer}>
                    <TouchableOpacity
                      style={styles.finishButton}
                      onPress={handleFinishTest}
                    >
                      <FontAwesome name="check-circle" size={20} color="#fff" />
                      <TextCustom style={styles.finishButtonText} fontSize={16}>
                        Finish Test Setup
                      </TextCustom>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </>
          )}
        </View>

        <Modal
          visible={isModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TextCustom style={styles.modalTitle} fontSize={18}>
                  {isEditMode ? 'Edit Question' : 'Add Question'}
                </TextCustom>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.formGroup}>
                  <TextCustom style={styles.label} fontSize={16}>Question</TextCustom>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={questionText}
                    onChangeText={setQuestionText}
                    placeholder="Enter your question here"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.formGroup}>
                  <TextCustom style={styles.label} fontSize={16}>Option A</TextCustom>
                  <TextInput
                    style={styles.textInput}
                    value={optionA}
                    onChangeText={setOptionA}
                    placeholder="Enter option A"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.formGroup}>
                  <TextCustom style={styles.label} fontSize={16}>Option B</TextCustom>
                  <TextInput
                    style={styles.textInput}
                    value={optionB}
                    onChangeText={setOptionB}
                    placeholder="Enter option B"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.formGroup}>
                  <TextCustom style={styles.label} fontSize={16}>Option C (Optional)</TextCustom>
                  <TextInput
                    style={styles.textInput}
                    value={optionC}
                    onChangeText={setOptionC}
                    placeholder="Enter option C"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.formGroup}>
                  <TextCustom style={styles.label} fontSize={16}>Option D (Optional)</TextCustom>
                  <TextInput
                    style={styles.textInput}
                    value={optionD}
                    onChangeText={setOptionD}
                    placeholder="Enter option D"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.formGroup}>
                  <TextCustom style={styles.label} fontSize={16}>Correct Option</TextCustom>
                  <View style={styles.optionsRow}>
                    {['A', 'B', 'C', 'D'].map(option => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.optionButton,
                          correctOption === option && styles.selectedOptionButton,
                          (option === 'C' && !optionC) && styles.disabledOption,
                          (option === 'D' && !optionD) && styles.disabledOption
                        ]}
                        onPress={() => {
                          if ((option === 'C' && !optionC) || (option === 'D' && !optionD)) {
                            return;
                          }
                          setCorrectOption(option);
                        }}
                        disabled={(option === 'C' && !optionC) || (option === 'D' && !optionD)}
                      >
                        <TextCustom 
                          style={[
                            styles.optionButtonText,
                            correctOption === option && styles.selectedOptionButtonText
                          ]} 
                          fontSize={16}
                        >
                          {option}
                        </TextCustom>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <TextCustom style={styles.label} fontSize={16}>Marks</TextCustom>
                  <TextInput
                    style={styles.textInput}
                    value={questionMarks}
                    onChangeText={setQuestionMarks}
                    placeholder="1"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmitQuestion}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <TextCustom style={styles.submitButtonText} fontSize={16}>
                      {isEditMode ? 'Update Question' : 'Add Question'}
                    </TextCustom>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <AdminTabBar activeTab="contents" />
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
  testInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  testTitle: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  testMetaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  testMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  testMetaText: {
    color: '#666',
    marginLeft: 6,
  },
  actionsContainer: {
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#6B46C1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  questionsList: {
    paddingBottom: 20,
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
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
  questionActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 6,
    marginLeft: 8,
  },
  questionText: {
    marginBottom: 16,
    color: '#333',
  },
  optionsList: {
    marginTop: 8,
  },
  optionItem: {
    flexDirection: 'row',
    padding: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#ddd',
  },
  correctOption: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderLeftColor: '#4CAF50',
  },
  optionLabel: {
    width: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  optionText: {
    flex: 1,
    color: '#333',
  },
  correctOptionText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
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
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    minHeight: '80%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
    color: '#333',
  },
  textInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionButton: {
    width: 64,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedOptionButton: {
    backgroundColor: '#6B46C1',
    borderColor: '#6B46C1',
  },
  disabledOption: {
    opacity: 0.4,
  },
  optionButtonText: {
    fontWeight: 'bold',
    color: '#333',
  },
  selectedOptionButtonText: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#6B46C1',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  finishButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
  },
  finishButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
  },
  finishButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
});
