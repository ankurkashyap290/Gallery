// Navigation.js
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Tabs from '../components/Tabs';
import GalleryDetail from '../components/GalleryScreen';

const Stack = createNativeStackNavigator();

const Navigation = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          headerMode: 'none', // For older versions
        }}>
        <Stack.Screen
          name="GalleryList"
          component={Tabs}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="GalleryDetail"
          component={GalleryDetail}
          options={{headerShown: false}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
