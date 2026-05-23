import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';

import Login from './navigation/screens/login';
import Signup from './navigation/screens/signup';
import Home from './navigation/screens/home';
import AdminDashboard from './navigation/screens/admin-dashboard';
import CreateProduct from './navigation/screens/create-product';
import { AuthProvider, AuthContext } from './context/AuthContext';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { currentUser, userData, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3E5122" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {currentUser ? (
          userData?.role === 'admin' ? (
            <>
              <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
              <Stack.Screen name="CreateProduct" component={CreateProduct} />
              <Stack.Screen name="Home" component={Home} />
            </>
          ) : (
            <>
              <Stack.Screen name="Home" component={Home} />
            </>
          )
        ) : (
          <>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Signup" component={Signup} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}