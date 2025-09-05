// import {createStackNavigator} from '@react-navigation/stack';
// import GalleryScreen from './components/Tabs';
// import DetailScreen from './components/DetailScreen';
// import {NavigationContainer} from '@react-navigation/native';
// const Stack = createStackNavigator();

// export default function MyStack() {
//   return (
//     <NavigationContainer>
//       <Stack.Navigator
//         screenOptions={{
//           gestureEnabled: false, // disables swipe back gesture
//         }}>
//         <Stack.Screen
//           name="Gallery"
//           component={GalleryScreen}
//           options={{headerShown: false}}
//         />
//         <Stack.Screen
//           name="Detail"
//           component={DetailScreen}
//           options={{headerShown: false}}
//         />
//       </Stack.Navigator>
//     </NavigationContainer>
//   );
// }

import {createStackNavigator} from '@react-navigation/stack';
import GalleryScreen from './components/Tabs';
import DetailScreen from './components/DetailScreen';
import PrivacyPolicyScreen from './components/PrivacyPolicyScreen';
import AboutDeveloperScreen from './components/AboutDeveloperScreen';
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
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicyScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="AboutDeveloper"
          component={AboutDeveloperScreen}
          options={{headerShown: false}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
