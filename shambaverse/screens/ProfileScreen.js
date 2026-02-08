import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>João Manuel</Text>
        <Text style={styles.handle}>@joaoprodutor • Huambo</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Especialidade</Text>
        <Text style={styles.value}>Milho, Mandioca, Feijão</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Meta 2024</Text>
        <Text style={styles.value}>Expandir para 6 hectares</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Contacto</Text>
        <Text style={styles.value}>+244 923 456 789</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1117",
    padding: 16
  },
  header: {
    marginBottom: 16
  },
  name: {
    color: "#e6edf3",
    fontSize: 22,
    fontWeight: "700"
  },
  handle: {
    color: "#7d8590",
    marginTop: 4
  },
  card: {
    backgroundColor: "#161b22",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#21262d",
    marginBottom: 12
  },
  label: {
    color: "#7d8590",
    marginBottom: 6
  },
  value: {
    color: "#e6edf3",
    fontWeight: "600"
  }
});
