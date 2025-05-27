import { Client, Account, Databases } from 'react-native-appwrite';

const client = new Client()
    .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID);

const account = new Account(client);
const database = new Databases(client);

const config = {
    db: process.env.EXPO_PUBLIC_APPWRITE_DB_ID,
    col: {
        tasks: process.env.EXPO_PUBLIC_APPWRITE_COL_TASKS_ID
    }
};

export { client, account, database, config }; 