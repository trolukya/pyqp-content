import React, { useState } from 'react';
import { View, StyleSheet, TextInput, FlatList, Text, SafeAreaView } from 'react-native';
import BottomTabBar from '../components/BottomTabBar';
import TextCustom from '../components/TextCustom';

interface SearchItem {
  id: string;
  title: string;
  description: string;
}

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);

  // Sample data for demonstration
  const sampleData: SearchItem[] = [
    { id: '1', title: 'Complete project proposal', description: 'Finish the project proposal by Friday' },
    { id: '2', title: 'Meeting with client', description: 'Discuss project requirements and timeline' },
    { id: '3', title: 'Research new technologies', description: 'Look into React Native updates and new libraries' },
    { id: '4', title: 'Update documentation', description: 'Update the API documentation with new endpoints' },
    { id: '5', title: 'Fix login bugs', description: 'Address the issues with login functionality' },
  ];

  // Search function
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setResults([]);
      return;
    }

    const filtered = sampleData.filter(
      item => 
        item.title.toLowerCase().includes(text.toLowerCase()) || 
        item.description.toLowerCase().includes(text.toLowerCase())
    );
    setResults(filtered);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TextCustom style={styles.headerText} fontSize={24}>Search Tasks</TextCustom>
        </View>
        
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for tasks..."
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
        </View>

        {searchQuery.trim() !== '' && (
          <View style={styles.resultsContainer}>
            <TextCustom style={styles.resultsText} fontSize={16}>
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </TextCustom>
            
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.resultItem}>
                  <TextCustom style={styles.resultTitle} fontSize={18}>{item.title}</TextCustom>
                  <TextCustom style={styles.resultDescription} fontSize={14}>{item.description}</TextCustom>
                </View>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyResultContainer}>
                  <TextCustom style={styles.emptyResultText} fontSize={16}>
                    No results found for "{searchQuery}"
                  </TextCustom>
                </View>
              )}
            />
          </View>
        )}

        <BottomTabBar activeTab="search" />
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 15,
  },
  searchInput: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultsContainer: {
    padding: 15,
    flex: 1,
  },
  resultsText: {
    marginBottom: 10,
    color: '#666',
  },
  resultItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  resultTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  resultDescription: {
    color: '#666',
  },
  emptyResultContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyResultText: {
    color: '#666',
    textAlign: 'center',
  },
}); 