import {
    View,
    TextInput,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Alert,
} from "react-native";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Redirect, router } from "expo-router";
import TextCustom from "./components/TextCustom";

const signin = () => {
    const { session, signin } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async () => {
        if (isLoggingIn) return;
        
        setIsLoggingIn(true);
        setErrorMessage("");
        
        try {
            await signin({ email, password });
        } catch (error) {
            console.error("Login error:", error);
            
            // Handle specific error types
            if (error.message && error.message.includes("Rate limit")) {
                setErrorMessage("Too many login attempts. Please wait a few minutes and try again.");
            } else if (error.message && error.message.includes("Invalid credentials")) {
                setErrorMessage("Invalid email or password. Please try again.");
            } else {
                setErrorMessage("An error occurred during login. Please try again.");
            }
        } finally {
            setIsLoggingIn(false);
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

                <TextCustom style={styles.label} fontSize={16}>Email:</TextCustom>
                <TextInput
                    placeholder="Enter your email..."
                    style={styles.input}
                    value={email}
                    onChangeText={(text) => setEmail(text)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <TextCustom style={styles.label} fontSize={16}>Password:</TextCustom>
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={password}
                    onChangeText={(text) => setPassword(text)}
                    secureTextEntry
                />

                <TouchableOpacity 
                    style={[styles.button, isLoggingIn && styles.buttonDisabled]} 
                    onPress={handleSubmit}
                    disabled={isLoggingIn}
                >
                    <Text style={styles.buttonText}>
                        {isLoggingIn ? "Logging in..." : "Login"}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.linkButton} 
                    onPress={() => router.push("/register")}
                >
                    <Text style={styles.linkText}>Don't have an account? Register</Text>
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

export default signin;
