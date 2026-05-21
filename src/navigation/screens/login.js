import { Feather, FontAwesome5 } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Image,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <ImageBackground
      source={{
        uri: 'https://plus.unsplash.com/premium_photo-1664640733898-d5c3f71f44e1?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8YnJlYWR8ZW58MHx8MHx8fDA%3D?q=80&w=1000&auto=format&fit=crop', // Placeholder vegetable background
      }}
      style={styles.backgroundImage}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* --- MAIN CARD --- */}
            <View style={styles.cardContainer}>
              
              {/* Header Section */}
              <View style={styles.headerContainer}>
                <View style={styles.iconWrapper}>
                  <FontAwesome5 name="leaf" size={32} color="#3E5122" />
                </View>
                <Text style={styles.title}>Rest API'ers</Text>
                <Text style={styles.subtitle}>Welcome Back tol!</Text>
                <Text style={styles.subtitle}>nandyan palaka bakit hindi ka nag kokak</Text>
              </View>

              {/* Form Fields */}
              <View style={styles.formContainer}>
                
                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="mail" size={20} color="#3E3E3E" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="you@example.com"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="lock" size={20} color="#3E3E3E" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                    />
                  </View>
                </View>

                {/* Forgot Password */}
                <TouchableOpacity style={styles.forgotPasswordButton}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

              </View>

              {/* Login Button */}
              <TouchableOpacity style={styles.loginButton}>
                <Text style={styles.loginButtonText}>Login</Text>
                <Feather name="arrow-right" size={20} color="#fff" style={styles.submitIcon} />
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Button */}
              <TouchableOpacity style={styles.googleButton}>
                <Image 
                  source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg' }} 
                  style={styles.googleIcon} 
                />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>

              {/* Footer Register Link */}
              <View style={styles.footer}>
                <Text
                style={styles.footerText}
                onPress={() => navigation?.navigate('Signup')}
                >
                  New to the market?{' '}
                  </Text>
              </View>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconWrapper: {
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#3E5122', // Dark olive green
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 50,
    backgroundColor: '#fff',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    height: '100%',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#3E5122',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#4A5D23',
    flexDirection: 'row',
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitIcon: {
    marginLeft: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: '#fff',
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#4B5563',
  },
  linkText: {
    color: '#3E5122',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});