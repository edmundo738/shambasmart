import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "./screens/HomeScreen";
import MarketplaceScreen from "./screens/MarketplaceScreen";
import TransportScreen from "./screens/TransportScreen";
import AlertsScreen from "./screens/AlertsScreen";
import DashboardScreen from "./screens/DashboardScreen";
import ChatScreen from "./screens/ChatScreen";
import ProfileScreen from "./screens/ProfileScreen";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: "#0d1117", borderTopColor: "#21262d" },
        tabBarActiveTintColor: "#3fb950",
        tabBarInactiveTintColor: "#7d8590",
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: "home",
            Marketplace: "cart",
            Transport: "bus",
            Alerts: "notifications",
            Dashboard: "stats-chart"
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
      <Tab.Screen name="Transport" component={TransportScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#0d1117" },
          headerTintColor: "#e6edf3"
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Signup" component={SignupScreen} options={{ title: "Criar conta" }} />
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ title: "Mensagens" }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Perfil" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
