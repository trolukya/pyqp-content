import {
    View,
    TextInput,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Image,
} from "react-native";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Redirect, router } from "expo-router";
import TextCustom from "./components/TextCustom";
import AsyncStorage from '@react-native-async-storage/async-storage';

const REGISTRATION_THROTTLE_KEY = 'lastRegistrationAttempt';
const THROTTLE_DURATION = 30 * 1000; // 30 seconds

const Register = () => {
    const { session, createAccount } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isThrottled, setIsThrottled] = useState(false);
    const [retryTimer, setRetryTimer] = useState(0);

    // Check if registration is throttled
    useEffect(() => {
        checkThrottleStatus();
    }, []);

    // Timer for throttling
    useEffect(() => {
        let interval;
        if (isThrottled && retryTimer > 0) {
            interval = setInterval(() => {
                setRetryTimer(prev => {
                    if (prev <= 1) {
                        setIsThrottled(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isThrottled, retryTimer]);

    const checkThrottleStatus = async () => {
        try {
            const lastAttempt = await AsyncStorage.getItem(REGISTRATION_THROTTLE_KEY);
            if (lastAttempt) {
                const timestamp = parseInt(lastAttempt, 10);
                const now = Date.now();
                const timeElapsed = now - timestamp;
                
                if (timeElapsed < THROTTLE_DURATION) {
                    const remainingTime = Math.ceil((THROTTLE_DURATION - timeElapsed) / 1000);
                    setIsThrottled(true);
                    setRetryTimer(remainingTime);
                    setErrorMessage(`Too many registration attempts. Please try again in ${remainingTime} seconds.`);
                }
            }
        } catch (error) {
            console.error("Error checking throttle status:", error);
        }
    };

    const setThrottle = async () => {
        try {
            await AsyncStorage.setItem(REGISTRATION_THROTTLE_KEY, Date.now().toString());
            setIsThrottled(true);
            setRetryTimer(30);
        } catch (error) {
            console.error("Error setting throttle:", error);
        }
    };

    const handleSubmit = async () => {
        if (isRegistering || isThrottled) return;
        
        // Validate inputs
        if (!email || !password || !name) {
            setErrorMessage("All fields are required");
            return;
        }
        
        if (password.length < 8) {
            setErrorMessage("Password must be at least 8 characters");
            return;
        }
        
        // Clear previous errors
        setErrorMessage("");
        setIsRegistering(true);
        
        try {
            await createAccount({ email, password, name });
            
            // Show success message instead of immediate navigation
            Alert.alert(
                "Registration Successful",
                "Your account has been created successfully. Please sign in with your credentials.",
                [
                    { 
                        text: "Go to Sign In", 
                        onPress: () => {
                            // First clear any existing session data to ensure we're not automatically logged in
                            // then navigate to signin page
                            setTimeout(() => {
                                router.replace("/signin");
                            }, 100);
                        } 
                    }
                ]
            );
        } catch (error) {
            console.error("Registration error:", error);
            
            // Handle specific error types
            if (error.message && error.message.includes("Rate limit")) {
                setThrottle();
                setErrorMessage(`Too many registration attempts. Please try again in 30 seconds.`);
            } else if (error.message && error.message.includes("already exists")) {
                setErrorMessage("An account with this email already exists");
            } else {
                setErrorMessage("Registration failed: " + (error.message || "Unknown error"));
            }
        } finally {
            setIsRegistering(false);
        }
    };

    if (session) return <Redirect href="/" />;
    
    return (
        <View style={styles.container}>
            <View>
                <View style={styles.logoContainer}>
                    <Image 
                        source={require('../assets/images/pyqp-logo.png')} 
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <TextCustom style={styles.tagline} fontSize={18}>
                        Previous Year Question Papers
                    </TextCustom>
                </View>

                {errorMessage ? (
                    <View style={styles.errorContainer}>
                        <TextCustom style={styles.errorText} fontSize={14}>
                            {errorMessage}
                        </TextCustom>
                    </View>
                ) : null}

                <TextCustom style={styles.label} fontSize={16}>Name:</TextCustom>
                <TextInput
                    placeholder="Enter your name..."
                    style={styles.input}
                    value={name}
                    onChangeText={(text) => setName(text)}
                    editable={!isThrottled}
                />

                <TextCustom style={styles.label} fontSize={16}>Email:</TextCustom>
                <TextInput
                    placeholder="Enter your email..."
                    style={styles.input}
                    value={email}
                    onChangeText={(text) => setEmail(text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isThrottled}
                />

                <TextCustom style={styles.label} fontSize={16}>Password:</TextCustom>
                <TextInput
                    style={styles.input}
                    placeholder="Password (minimum 8 characters)"
                    value={password}
                    onChangeText={(text) => setPassword(text)}
                    secureTextEntry
                    editable={!isThrottled}
                />

                <TouchableOpacity 
                    style={[
                        styles.button, 
                        (isRegistering || isThrottled) && styles.buttonDisabled
                    ]} 
                    onPress={handleSubmit}
                    disabled={isRegistering || isThrottled}
                >
                    <Text style={styles.buttonText}>
                        {isRegistering ? "Registering..." : 
                         isThrottled ? `Retry in ${retryTimer}s` : "Register"}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.linkButton} 
                    onPress={() => router.push("/signin")}
                >
                    <Text style={styles.linkText}>Already have an account? Sign in</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
    },
    logoContainer: {
        alignItems: "center",
        marginBottom: 40,
    },
    logo: {
        width: 180,
        height: 180,
        marginBottom: 10,
    },
    tagline: {
        color: "#666",
        marginTop: 5,
    },
    errorContainer: {
        backgroundColor: "#FFEBEE",
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: "#D32F2F",
    },
    errorText: {
        color: "#D32F2F",
    },
    label: {
        marginBottom: 5,
        color: "#333",
        fontWeight: "500",
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        marginTop: 5,
        marginBottom: 15,
        borderColor: "#ddd",
        backgroundColor: "#fff",
    },
    button: {
        backgroundColor: "#6B46C1",
        padding: 14,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 10,
    },
    buttonDisabled: {
        backgroundColor: "#9F7AEA",
        opacity: 0.7,
    },
    buttonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    linkButton: {
        marginTop: 20,
        alignItems: "center",
    },
    linkText: {
        color: "#6B46C1",
        fontSize: 16,
    },
});

export default Register; 