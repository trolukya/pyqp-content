import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import TextCustom from '../components/TextCustom';
import BottomTabBar from '../components/BottomTabBar';

export default function AboutUs() {
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
        <Text style={styles.headerTitle}>About Us</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Image
            source={require('../../assets/images/pyqp-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <TextCustom style={styles.appName} fontSize={24}>PYQP</TextCustom>
          <TextCustom style={styles.version} fontSize={14}>Version 1.0.0</TextCustom>
        </View>

        <View style={styles.section}>
          <TextCustom style={styles.sectionTitle} fontSize={18}>Our Mission</TextCustom>
          <TextCustom style={styles.paragraph} fontSize={16}>
            PYQP (Previous Year Question Papers) is dedicated to providing students with easy access to high-quality educational resources. Our mission is to help students excel in their exams by offering comprehensive study materials, including previous year question papers, notes, video lectures, and more.
          </TextCustom>
        </View>

        <View style={styles.section}>
          <TextCustom style={styles.sectionTitle} fontSize={18}>What We Offer</TextCustom>
          <View style={styles.featureItem}>
            <Ionicons name="document-text" size={20} color="#6B46C1" />
            <TextCustom style={styles.featureText} fontSize={16}>Previous year question papers for various exams</TextCustom>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="videocam" size={20} color="#6B46C1" />
            <TextCustom style={styles.featureText} fontSize={16}>Video lectures by expert teachers</TextCustom>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="book" size={20} color="#6B46C1" />
            <TextCustom style={styles.featureText} fontSize={16}>Comprehensive study notes and e-books</TextCustom>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="briefcase" size={20} color="#6B46C1" />
            <TextCustom style={styles.featureText} fontSize={16}>Job alerts and career guidance</TextCustom>
          </View>
        </View>

        <View style={styles.section}>
          <TextCustom style={styles.sectionTitle} fontSize={18}>Our Team</TextCustom>
          <TextCustom style={styles.paragraph} fontSize={16}>
            We are a dedicated team of educators, developers, and content creators committed to making quality education accessible to all students. Our experts curate and verify all content to ensure accuracy and relevance.
          </TextCustom>
        </View>

        <View style={styles.section}>
          <TextCustom style={styles.sectionTitle} fontSize={18}>Contact Us</TextCustom>
          <View style={styles.contactItem}>
            <Ionicons name="mail" size={20} color="#6B46C1" />
            <TextCustom style={styles.contactText} fontSize={16}>support@pyqp.com</TextCustom>
          </View>
          <View style={styles.contactItem}>
            <Ionicons name="call" size={20} color="#6B46C1" />
            <TextCustom style={styles.contactText} fontSize={16}>+91 9876543210</TextCustom>
          </View>
          <View style={styles.contactItem}>
            <Ionicons name="globe" size={20} color="#6B46C1" />
            <TextCustom style={styles.contactText} fontSize={16}>www.pyqp.com</TextCustom>
          </View>
        </View>

        <View style={styles.footer}>
          <TextCustom style={styles.copyright} fontSize={14}>
            © 2024 PYQP. All rights reserved.
          </TextCustom>
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
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginBottom: 16,
  },
  appName: {
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  version: {
    textAlign: 'center',
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  paragraph: {
    color: '#444',
    lineHeight: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    color: '#444',
    marginLeft: 12,
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    color: '#444',
    marginLeft: 12,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  copyright: {
    color: '#666',
    textAlign: 'center',
  },
}); 