import { View, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from "react-native";
import { useAuth } from "../../context/AuthContext";
import TextCustom from "../components/TextCustom";
import { router } from "expo-router";
import BottomTabBar from "../components/BottomTabBar";

export default function UserDashboard() {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView>
          <View style={styles.header}>
            <TextCustom style={styles.headerText} fontSize={24}>Dashboard</TextCustom>
          </View>

          <View style={styles.welcomeCard}>
            <TextCustom style={styles.welcomeText} fontSize={28}>
              Welcome back, {user?.name || 'User'}!
            </TextCustom>
            <TextCustom style={styles.subText} fontSize={16}>
              We're glad to see you again
            </TextCustom>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <TextCustom style={styles.cardTitle} fontSize={20}>
                Your Tasks
              </TextCustom>
              <TextCustom style={styles.cardDesc} fontSize={16}>
                Manage your personal tasks and stay organized
              </TextCustom>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push("/")}
              >
                <TextCustom style={styles.actionButtonText} fontSize={14}>View Tasks</TextCustom>
              </TouchableOpacity>
            </View>

            <View style={styles.infoCard}>
              <TextCustom style={styles.cardTitle} fontSize={20}>
                Your Activity
              </TextCustom>
              <TextCustom style={styles.cardDesc} fontSize={16}>
                Tasks completed this week: 5
              </TextCustom>
              <TextCustom style={styles.cardDesc} fontSize={16}>
                Tasks pending: 3
              </TextCustom>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push("/")}
              >
                <TextCustom style={styles.actionButtonText} fontSize={14}>See Activity</TextCustom>
              </TouchableOpacity>
            </View>

            <View style={styles.infoCard}>
              <TextCustom style={styles.cardTitle} fontSize={20}>
                Quick Actions
              </TextCustom>
              <View style={styles.quickActions}>
                <TouchableOpacity style={styles.quickActionButton}>
                  <TextCustom style={styles.quickActionText} fontSize={14}>Add Task</TextCustom>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionButton}>
                  <TextCustom style={styles.quickActionText} fontSize={14}>Set Reminder</TextCustom>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionButton}>
                  <TextCustom style={styles.quickActionText} fontSize={14}>Share List</TextCustom>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        <BottomTabBar activeTab="home" />
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
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    margin: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  welcomeText: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subText: {
    color: '#666',
  },
  infoSection: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardDesc: {
    color: '#666',
    marginBottom: 5,
  },
  actionButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 15,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    justifyContent: 'space-between',
  },
  quickActionButton: {
    backgroundColor: '#E9F0FF',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 6,
    marginTop: 10,
    width: '31%',
    alignItems: 'center',
  },
  quickActionText: {
    color: '#007BFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 