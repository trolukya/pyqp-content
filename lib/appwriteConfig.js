import { Client, Account } from "react-native-appwrite";
import { Platform } from "react-native";
import { Databases, Storage } from "react-native-appwrite";
import Constants from 'expo-constants';

// Get environment variables from Constants
const {
    EXPO_PUBLIC_APPWRITE_ENDPOINT,
    EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    EXPO_PUBLIC_APPWRITE_DB_ID,
    EXPO_PUBLIC_APPWRITE_BUNDLE_ID,
    EXPO_PUBLIC_APPWRITE_PACKAGE_NAME
} = Constants.expoConfig?.extra || {};

// Hardcoded fallback values in case environment variables are not available
const ENDPOINT = EXPO_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const PROJECT_ID = EXPO_PUBLIC_APPWRITE_PROJECT_ID || "67ef7e970021e329b35a";
const DATABASE_ID = EXPO_PUBLIC_APPWRITE_DB_ID || "67f3615a0027484c95d5";
const BUNDLE_ID = EXPO_PUBLIC_APPWRITE_BUNDLE_ID || "com.pyqp.app";
const PACKAGE_NAME = EXPO_PUBLIC_APPWRITE_PACKAGE_NAME || "com.pyqp.app";

console.log("Appwrite Config:", { ENDPOINT, PROJECT_ID, DATABASE_ID });

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

switch (Platform.OS) {
    case "ios":
        client.setPlatform(BUNDLE_ID);
        break;
    case "android":
        client.setPlatform(PACKAGE_NAME);
        break;
}

// Initialize account
const account = new Account(client);

// Initialize database
const database = new Databases(client);

// Initialize storage
const storage = new Storage(client);

// Config
const config = {
    databaseId: DATABASE_ID,
    collections: {
        exams: "67f630fb0019582e45ac",
        tests: "682ed66d00064eb66ea8",
        questions: "682ee56200285818412d",
        submissions: "682ee5fd0000013ae445",
    },
    storage: {
        examImages: "exam-images",
    }
};

export { client, account, database, storage, config };
