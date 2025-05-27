import { account } from './appwriteConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Admin credentials - MUST match the ones in AuthContext.js
const ADMIN_EMAIL = "adminboss@gmail.com";
const ADMIN_PASSWORD = "Adminboss@123";
const ADMIN_NAME = "System Administrator";

// Cache key
const ADMIN_SETUP_CACHE_KEY = 'adminSetupCompleted';
const ADMIN_SETUP_TIMESTAMP_KEY = 'adminSetupTimestamp';
const ADMIN_SETUP_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Wait for the specified milliseconds
 */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if admin setup was completed recently
 */
const isAdminSetupCacheValid = async () => {
  try {
    const setupCompleted = await AsyncStorage.getItem(ADMIN_SETUP_CACHE_KEY);
    if (setupCompleted !== 'true') return false;
    
    const setupTimestamp = await AsyncStorage.getItem(ADMIN_SETUP_TIMESTAMP_KEY);
    if (!setupTimestamp) return false;
    
    const timestamp = parseInt(setupTimestamp, 10);
    const now = Date.now();
    
    // If setup was completed less than the cache duration ago, consider it valid
    return (now - timestamp) < ADMIN_SETUP_CACHE_DURATION;
  } catch (error) {
    console.error("Error checking admin setup cache:", error);
    return false;
  }
};

/**
 * Set the admin setup as completed
 */
const markAdminSetupComplete = async () => {
  try {
    await AsyncStorage.setItem(ADMIN_SETUP_CACHE_KEY, 'true');
    await AsyncStorage.setItem(ADMIN_SETUP_TIMESTAMP_KEY, Date.now().toString());
    console.log("Admin setup marked as completed");
  } catch (error) {
    console.error("Error marking admin setup as completed:", error);
  }
};

// Helper function to determine if we should skip admin setup due to rate limiting
const shouldSkipAdminSetup = async () => {
  try {
    // Check if we're in a rate limited state
    const isRateLimited = await AsyncStorage.getItem('adminSetupRateLimited');
    if (isRateLimited === 'true') {
      const rateLimitExpiry = await AsyncStorage.getItem('adminSetupRateLimitExpiry');
      if (rateLimitExpiry) {
        const expiryTime = parseInt(rateLimitExpiry, 10);
        const now = Date.now();
        if (now < expiryTime) {
          console.log(`Admin setup rate limited, skipping until ${new Date(expiryTime)}`);
          return true;
        } else {
          // Rate limit period expired, clear the flag
          await AsyncStorage.removeItem('adminSetupRateLimited');
          await AsyncStorage.removeItem('adminSetupRateLimitExpiry');
        }
      }
    }
    return false;
  } catch (error) {
    console.error("Error checking rate limit status:", error);
    return false;
  }
};

// Helper function to mark that we're rate limited
const markRateLimited = async () => {
  try {
    // Set a 1 hour rate limit period
    const expiryTime = Date.now() + (60 * 60 * 1000); // 1 hour from now
    await AsyncStorage.setItem('adminSetupRateLimited', 'true');
    await AsyncStorage.setItem('adminSetupRateLimitExpiry', expiryTime.toString());
    console.log(`Admin setup rate limited until ${new Date(expiryTime)}`);
  } catch (error) {
    console.error("Error setting rate limit status:", error);
  }
};

/**
 * Attempts to create an admin account if it doesn't already exist
 * This should be called once when the app initializes
 */
export const setupAdminAccount = async () => {
  try {
    // First check if we're rate limited
    if (await shouldSkipAdminSetup()) {
      console.log("Skipping admin setup due to rate limiting");
      return true;
    }
    
    // First check the cache
    if (await isAdminSetupCacheValid()) {
      console.log("Admin setup already completed recently, skipping");
      return true;
    }

    // First check if we can get the current account
    // This avoids unnecessary login attempts that can trigger rate limits
    try {
      const currentUser = await account.get();
      if (currentUser && currentUser.email === ADMIN_EMAIL) {
        console.log("Already logged in as admin");
        await markAdminSetupComplete();
        return true;
      }
    } catch (getError) {
      // Not logged in or error getting user, this is expected
      console.log("Not currently logged in, continuing with admin check");
    }
    
    // Add a delay before attempting account creation to prevent rate limiting
    await delay(2000);
    
    try {
      // Try to create the admin account
      const newAdmin = await account.create('unique()', ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME);
      console.log("Admin account created successfully", newAdmin);
      await markAdminSetupComplete();
      return true;
    } catch (createError) {
      // If the error is because the user already exists, that's fine
      if (createError.message && createError.message.includes("already exists")) {
        console.log("Admin account already exists");
        await markAdminSetupComplete();
        return true;
      }
      
      // If rate limiting error, mark as rate limited to avoid further attempts
      if (createError.message && createError.message.includes("Rate limit")) {
        console.log("Rate limit hit, marking admin setup as rate limited");
        await markRateLimited();
        await markAdminSetupComplete(); // Also mark setup as complete
        return true;
      }
      
      console.error("Error creating admin account:", createError);
      return false;
    }
  } catch (error) {
    console.error("Error in setupAdminAccount:", error);
    return false;
  }
}; 