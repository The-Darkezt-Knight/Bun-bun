import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import Login from '././navigation/screens/login';
import Signup from '././navigation/screens/signup';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        
        <Stack.Screen
          name="Signup"
          component={Signup}
        />

        <Stack.Screen
          name="Login"
          component={Login}
        />
        
      </Stack.Navigator>
    </NavigationContainer>
  );
}