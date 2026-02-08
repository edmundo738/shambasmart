import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";

const messages = [
  { id: "1", name: "Carlos Transportes", last: "Camião disponível amanhã às 6h." },
  { id: "2", name: "Maria Farm", last: "Consigo entregar 30 sacos em Luanda." },
  { id: "3", name: "AgroMáquinas", last: "Trator revisado, garantia de 6 meses." }
];

export default function ChatScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.list}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.preview}>{item.last}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1117"
  },
  list: {
    padding: 16
  },
  card: {
    backgroundColor: "#161b22",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#21262d",
    marginBottom: 12
  },
  name: {
    color: "#e6edf3",
    fontWeight: "700"
  },
  preview: {
    color: "#7d8590",
    marginTop: 6
  }
});
