import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';

export default function AdminScreen({ navigation }) {
    const { logout } = useContext(AuthContext);

    const handleLogout = async () => {
        await logout();
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => { navigation.replace('Home') }}>
                    <MaterialIcons name="arrow-back" size={24} color="#1b1c1c" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Admin Dashboard</Text>
            </View>

            <View style={styles.container}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => navigation.navigate('CreateProduct')}
                >
                    <MaterialIcons name="add" size={24} color="#fff" />
                    <Text style={styles.buttonText}>Create New Product</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fcf9f8'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 64,
        borderBottomWidth: 1,
        borderBottomColor: '#e4e2e1',
        backgroundColor: '#fcf9f8',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#343c0a',
    },
    container: {
        flex: 1,
        padding: 24,
    },
    button: {
        flexDirection: 'row',
        backgroundColor: '#343c0a',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#343c0a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600'
    }
});
