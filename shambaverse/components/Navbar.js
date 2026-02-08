import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Navbar({ title }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Agro em Tempo Real • Angola</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#21262d",
    backgroundColor: "#0d1117"
  },
  title: {
    color: "#e6edf3",
    fontSize: 20,
    fontWeight: "700"
  },
  subtitle: {
    color: "#7d8590",
    fontSize: 12,
    marginTop: 4
  }
});
