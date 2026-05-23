import React, { useContext } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';

export default function HomeScreen({ navigation }) {
  const { userData, logout } = useContext(AuthContext);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <FontAwesome5 name="leaf" size={40} color="#3E5122" />
          <Text style={styles.title}>BUN BUN</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.nameText}>{userData?.fullName || 'User'}!</Text>

          <View style={styles.infoRow}>
            <Feather name="mail" size={20} color="#656A63" />
            <Text style={styles.infoText}>{userData?.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Feather name="shield" size={20} color="#656A63" />
            <Text style={styles.infoText}>Role: {userData?.role || 'user'}</Text>
          </View>
        </View>

        {userData?.role === 'admin' && (
          <TouchableOpacity style={styles.adminButton} onPress={() => navigation.navigate('AdminDashboard')}>
            <Feather name="settings" size={20} color="#fff" style={styles.logoutIcon} />
            <Text style={styles.logoutButtonText}>Admin Dashboard</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#fff" style={styles.logoutIcon} />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#3E5122',
    marginTop: 12,
    letterSpacing: 2,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 16,
    color: '#656A63',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#131511',
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 15,
    color: '#3B3D39',
    marginLeft: 12,
  },
  adminButton: {
    backgroundColor: '#3E5122',
    flexDirection: 'row',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutIcon: {
    marginRight: 8,
  },
});
