import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import TextCustom from '../components/TextCustom';
import BottomTabBar from '../components/BottomTabBar';

// Define types for FAQ item props
interface FAQItemProps {
  question: string;
  answer: string;
}

// FAQ Item component
const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.faqItem}>
      <TouchableOpacity
        style={styles.faqQuestion}
        onPress={() => setExpanded(!expanded)}
      >
        <TextCustom style={styles.faqQuestionText} fontSize={16}>
          {question}
        </TextCustom>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color="#6B46C1"
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.faqAnswer}>
          <TextCustom style={styles.faqAnswerText} fontSize={15}>
            {answer}
          </TextCustom>
        </View>
      )}
    </View>
  );
};

export default function HelpSupport() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // In a real app, this would send the support request to a server
    Alert.alert(
      'Support Request Sent',
      'Thank you for contacting us. We will get back to you soon.',
      [{ text: 'OK', onPress: () => {
        setName('');
        setEmail('');
        setMessage('');
      }}]
    );
  };

  const faqs = [
    {
      question: 'How do I download exam papers?',
      answer: 'Navigate to the Exam Papers section, select the exam you want, and click on the download icon next to the paper you wish to save. The paper will be available in your Downloads section.'
    },
    {
      question: 'Can I access content offline?',
      answer: 'Yes, any content you download will be available offline. Go to the Downloads section to access all your downloaded content.'
    },
    {
      question: 'How do I save items for later?',
      answer: 'Click on the bookmark icon on any content to save it. You can access all saved items in the Saved Items section.'
    },
    {
      question: 'How do I get notified about new job alerts?',
      answer: 'Enable notifications in the Settings menu and select the job categories you are interested in. You will receive notifications whenever new job opportunities matching your interests are posted.'
    },
    {
      question: 'How can I report an issue with the app?',
      answer: 'Use the contact form below to report any issues you encounter. Please provide as much detail as possible to help us resolve the problem quickly.'
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6B46C1', '#4A2C9B']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        {/* Support Options */}
        <View style={styles.section}>
          <TextCustom style={styles.sectionTitle} fontSize={18}>Support Options</TextCustom>
          
          <TouchableOpacity style={styles.supportOption}>
            <View style={styles.supportIconContainer}>
              <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
            </View>
            <View style={styles.supportTextContainer}>
              <TextCustom style={styles.supportOptionTitle} fontSize={16}>Chat Support</TextCustom>
              <TextCustom style={styles.supportOptionDescription} fontSize={14}>
                Chat with our support team (9 AM - 6 PM)
              </TextCustom>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#6B46C1" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.supportOption}>
            <View style={[styles.supportIconContainer, { backgroundColor: '#4caf50' }]}>
              <Ionicons name="call" size={24} color="#fff" />
            </View>
            <View style={styles.supportTextContainer}>
              <TextCustom style={styles.supportOptionTitle} fontSize={16}>Call Support</TextCustom>
              <TextCustom style={styles.supportOptionDescription} fontSize={14}>
                +91 9876543210 (10 AM - 5 PM)
              </TextCustom>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#6B46C1" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.supportOption}>
            <View style={[styles.supportIconContainer, { backgroundColor: '#f44336' }]}>
              <Ionicons name="mail" size={24} color="#fff" />
            </View>
            <View style={styles.supportTextContainer}>
              <TextCustom style={styles.supportOptionTitle} fontSize={16}>Email Support</TextCustom>
              <TextCustom style={styles.supportOptionDescription} fontSize={14}>
                support@pyqp.com
              </TextCustom>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#6B46C1" />
          </TouchableOpacity>
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <TextCustom style={styles.sectionTitle} fontSize={18}>Frequently Asked Questions</TextCustom>
          
          {faqs.map((faq, index) => (
            <FAQItem 
              key={index}
              question={faq.question}
              answer={faq.answer}
            />
          ))}
        </View>

        {/* Contact Form */}
        <View style={styles.section}>
          <TextCustom style={styles.sectionTitle} fontSize={18}>Contact Us</TextCustom>
          
          <View style={styles.formField}>
            <TextCustom style={styles.label} fontSize={14}>Name</TextCustom>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
            />
          </View>
          
          <View style={styles.formField}>
            <TextCustom style={styles.label} fontSize={14}>Email</TextCustom>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
            />
          </View>
          
          <View style={styles.formField}>
            <TextCustom style={styles.label} fontSize={14}>Message</TextCustom>
            <TextInput
              style={[styles.input, styles.messageInput]}
              value={message}
              onChangeText={setMessage}
              placeholder="Describe your issue or question"
              multiline
              numberOfLines={4}
            />
          </View>
          
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleSubmit}
          >
            <TextCustom style={styles.submitButtonText} fontSize={16}>Submit</TextCustom>
          </TouchableOpacity>
        </View>

        {/* Additional Resources */}
        <View style={styles.section}>
          <TextCustom style={styles.sectionTitle} fontSize={18}>Additional Resources</TextCustom>
          
          <TouchableOpacity style={styles.resourceItem}>
            <MaterialIcons name="video-library" size={20} color="#6B46C1" />
            <TextCustom style={styles.resourceText} fontSize={16}>Tutorial Videos</TextCustom>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.resourceItem}>
            <MaterialIcons name="help-outline" size={20} color="#6B46C1" />
            <TextCustom style={styles.resourceText} fontSize={16}>User Guide</TextCustom>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.resourceItem}>
            <MaterialIcons name="privacy-tip" size={20} color="#6B46C1" />
            <TextCustom style={styles.resourceText} fontSize={16}>Privacy Policy</TextCustom>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.resourceItem}>
            <MaterialIcons name="description" size={20} color="#6B46C1" />
            <TextCustom style={styles.resourceText} fontSize={16}>Terms of Service</TextCustom>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomTabBar activeTab="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 40,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingBottom: 80,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  supportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  supportIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6B46C1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  supportOptionTitle: {
    fontWeight: 'bold',
    color: '#333',
  },
  supportOptionDescription: {
    color: '#666',
    marginTop: 2,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 8,
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  faqQuestionText: {
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  faqAnswer: {
    paddingBottom: 16,
  },
  faqAnswerText: {
    color: '#555',
    lineHeight: 22,
  },
  formField: {
    marginBottom: 16,
  },
  label: {
    color: '#333',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  messageInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#6B46C1',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resourceText: {
    marginLeft: 12,
    color: '#444',
  },
}); 