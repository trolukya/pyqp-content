import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import TextCustom from './TextCustom';

interface ContentItemProps {
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  isLocal?: boolean;
  onPress: () => void;
  onRemove: () => void;
  type: 'paper' | 'book';
}

const ContentItem: React.FC<ContentItemProps> = ({
  title,
  subtitle,
  description,
  imageUrl,
  isLocal = false,
  onPress,
  onRemove,
  type
}) => {
  return (
    <View style={styles.card}>
      <TouchableOpacity 
        style={styles.mainContent}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {type === 'paper' ? (
          <View style={styles.paperIcon}>
            <FontAwesome name="file-text-o" size={24} color="#6B46C1" />
          </View>
        ) : (
          <View style={styles.bookCover}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.defaultCover}>
                <FontAwesome name="book" size={24} color="#6B46C1" />
              </View>
            )}
          </View>
        )}
        
        <View style={styles.textContent}>
          <TextCustom style={styles.title} fontSize={16}>
            {title}
          </TextCustom>
          
          {subtitle && (
            <TextCustom style={styles.subtitle} fontSize={14}>
              {subtitle}
            </TextCustom>
          )}
          
          {description && (
            <TextCustom style={styles.description} fontSize={12} numberOfLines={1}>
              {description}
            </TextCustom>
          )}
          
          <View style={styles.statusBadge}>
            <FontAwesome 
              name={isLocal ? "check-circle" : "cloud"} 
              size={12} 
              color={isLocal ? "#4CAF50" : "#2196F3"} 
              style={styles.statusIcon} 
            />
            <TextCustom style={styles.statusText} fontSize={10}>
              {isLocal ? "Available offline" : "Cloud only"}
            </TextCustom>
          </View>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={onRemove}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <FontAwesome name="trash" size={18} color="#FF5252" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
    width: '90%',
    alignSelf: 'center',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paperIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bookCover: {
    width: 50,
    height: 70,
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  defaultCover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
    marginBottom: 2,
  },
  description: {
    color: '#888',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    color: '#666',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default ContentItem; 