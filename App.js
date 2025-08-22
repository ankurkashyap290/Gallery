import {createStackNavigator} from '@react-navigation/stack';
import GalleryScreen from './components/Tabs';
import DetailScreen from './components/DetailScreen';
import {NavigationContainer} from '@react-navigation/native';
const Stack = createStackNavigator();

export default function MyStack() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          gestureEnabled: false, // disables swipe back gesture
        }}>
        <Stack.Screen
          name="Gallery"
          component={GalleryScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Detail"
          component={DetailScreen}
          options={{headerShown: false}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
