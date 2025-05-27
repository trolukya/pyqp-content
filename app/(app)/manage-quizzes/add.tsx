import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import TextCustom from '../../components/TextCustom';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { database } from '../../../lib/appwriteConfig';
import { ID } from 'react-native-appwrite';
import AdminTabBar from '../../components/AdminTabBar';
import { useAuth } from '../../../context/AuthContext';

// Appwrite config constants
const DATABASE_ID = '67f3615a0027484c95d5';
const QUIZZES_COLLECTION_ID = '6826e04b002731aaf7f4'; // Daily Quizzes collection ID

interface Option {
  text: string;
  isCorrect: boolean;
}

const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'];

export default function AddQuiz() {
  const { isAdmin, session } = useAuth();
  const params = useLocalSearchParams<{ quizId?: string }>();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<Option[]>([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false }
  ]);
  const [difficulty, setDifficulty] = useState('Medium');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Load quiz data if in edit mode
  useEffect(() => {
    if (params.quizId) {
      setIsEditMode(true);
      fetchQuizData(params.quizId);
    }
  }, [params.quizId]);

  // Fetch quiz data for editing
  const fetchQuizData = async (quizId: string) => {
    setLoading(true);
    try {
      const response = await database.getDocument(
        DATABASE_ID,
        QUIZZES_COLLECTION_ID,
        quizId
      );
      
      // Set question and difficulty
      setQuestion(response.question);
      setDifficulty(response.difficulty || 'Medium');
      
      // Parse options string
      try {
        const [optionsText, correctIndexStr] = response.options.split(':');
        const optionsList = optionsText.split('|');
        const correctIndex = parseInt(correctIndexStr, 10);
        
        // Map to options array
        const mappedOptions = optionsList.map((text: string, index: number) => ({
          text,
          isCorrect: index === correctIndex
        }));
        
        setOptions(mappedOptions);
      } catch (e) {
        console.error('Error parsing options:', e);
      }
    } catch (error) {
      console.error('Error fetching quiz data:', error);
      Alert.alert('Error', 'Failed to load quiz data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update option text
  const handleOptionChange = (text: string, index: number) => {
    const newOptions = [...options];
    newOptions[index].text = text;
    setOptions(newOptions);
  };

  // Set which option is correct
  const handleCorrectOptionChange = (index: number) => {
    const newOptions = options.map((option, i) => ({
      ...option,
      isCorrect: i === index
    }));
    setOptions(newOptions);
  };

  // Format options to simple array of strings with correctIndex
  const formatOptionsForStorage = () => {
    const optionTexts = options.map(option => option.text.trim());
    const correctIndex = options.findIndex(option => option.isCorrect);
    // Store correctIndex as part of the options string, format: "option1|option2|option3|option4:correctIndex"
    const optionsWithCorrectIndex = `${optionTexts.join('|')}:${correctIndex}`;
    return optionsWithCorrectIndex;
  };

  // Submit the quiz
  const handleSubmit = async () => {
    // Validate inputs
    if (!question.trim()) {
      Alert.alert('Error', 'Please enter a question');
      return;
    }

    // Check if all options have text
    const emptyOptions = options.filter(option => !option.text.trim());
    if (emptyOptions.length > 0) {
      Alert.alert('Error', 'Please fill in all options');
      return;
    }

    // Check if there's a correct option
    if (!options.some(option => option.isCorrect)) {
      Alert.alert('Error', 'Please select a correct option');
      return;
    }

    setSubmitting(true);

    try {
      // Format options for storage
      const formattedOptions = formatOptionsForStorage();

      // Common quiz data
      const quizData = {
        question,
        options: formattedOptions,
        isActive: true,
        difficulty: difficulty,
        category: 'General',
        score: 10
      };

      let response;
      
      if (isEditMode && params.quizId) {
        // Update existing quiz
        response = await database.updateDocument(
          DATABASE_ID,
          QUIZZES_COLLECTION_ID,
          params.quizId,
          quizData
        );
      } else {
        // Create new quiz
        response = await database.createDocument(
          DATABASE_ID,
          QUIZZES_COLLECTION_ID,
          ID.unique(),
          {
            ...quizData,
            createdAt: new Date().toISOString(),
            userId: session.$id
          }
        );
      }

      if (response.$id) {
        Alert.alert(
          'Success',
          isEditMode ? 'Quiz updated successfully' : 'Quiz added successfully',
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error saving quiz:', error);
      Alert.alert('Error', 'Failed to save quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6B46C1" />
          <TextCustom style={styles.loadingText} fontSize={16}>Loading quiz data...</TextCustom>
        </View>
      ) : (
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
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
              {isEditMode ? 'Edit Daily Quiz' : 'Add Daily Quiz'}
            </TextCustom>
            <View style={styles.headerRight} />
          </LinearGradient>

          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formContainer}>
              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={16}>Question</TextCustom>
                <TextInput
                  style={styles.textInput}
                  value={question}
                  onChangeText={setQuestion}
                  placeholder="Enter your question here"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.optionsContainer}>
                <TextCustom style={styles.sectionTitle} fontSize={18}>Options</TextCustom>
                <TextCustom style={styles.helperText} fontSize={14}>
                  Tap radio button to set the correct answer
                </TextCustom>

                {options.map((option, index) => (
                  <View key={index} style={styles.optionRow}>
                    <TouchableOpacity
                      style={[
                        styles.radioButton,
                        option.isCorrect && styles.radioButtonSelected
                      ]}
                      onPress={() => handleCorrectOptionChange(index)}
                    >
                      {option.isCorrect && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.textInput, styles.optionInput]}
                      value={option.text}
                      onChangeText={(text) => handleOptionChange(text, index)}
                      placeholder={`Option ${index + 1}`}
                      placeholderTextColor="#999"
                    />
                  </View>
                ))}
              </View>

              <View style={styles.formGroup}>
                <TextCustom style={styles.label} fontSize={16}>Difficulty</TextCustom>
                <View style={styles.difficultyContainer}>
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.difficultyOption,
                        difficulty === option && styles.difficultyOptionSelected,
                        option === 'Easy' && styles.easyOption,
                        option === 'Medium' && styles.mediumOption,
                        option === 'Hard' && styles.hardOption,
                      ]}
                      onPress={() => setDifficulty(option)}
                    >
                      <TextCustom 
                        style={[
                          styles.difficultyText,
                          difficulty === option && styles.difficultyTextSelected
                        ]}
                        fontSize={14}
                      >
                        {option}
                      </TextCustom>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons 
                      name={isEditMode ? "save-outline" : "add-circle-outline"} 
                      size={20} 
                      color="#fff" 
                      style={styles.buttonIcon} 
                    />
                    <TextCustom style={styles.submitButtonText} fontSize={16}>
                      {isEditMode ? 'Update Quiz' : 'Save Quiz'}
                    </TextCustom>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          <AdminTabBar activeTab="contents" />
        </KeyboardAvoidingView>
      )}
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
  headerRight: {
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 46,
    color: '#333',
  },
  optionsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  helperText: {
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6B46C1',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#6B46C1',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6B46C1',
  },
  optionInput: {
    flex: 1,
  },
  difficultyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  difficultyOptionSelected: {
    borderColor: '#6B46C1',
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
  },
  difficultyText: {
    color: '#666',
    fontWeight: '500',
  },
  difficultyTextSelected: {
    color: '#6B46C1',
    fontWeight: 'bold',
  },
  easyOption: {
    borderColor: '#4CAF50',
  },
  mediumOption: {
    borderColor: '#FFB300',
  },
  hardOption: {
    borderColor: '#E53935',
  },
  submitButton: {
    backgroundColor: '#6B46C1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    color: '#6B46C1',
  },
}); 