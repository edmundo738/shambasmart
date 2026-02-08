import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function AlertCard({ item }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.text}>{item.text}</Text>
      <View style={styles.meta}>
        <Text style={styles.metaText}>📍 {item.location}</Text>
        <Text style={styles.metaText}>{item.time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(218, 54, 51, 0.08)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#da3633"
  },
  title: {
    color: "#da3633",
    fontWeight: "700",
    marginBottom: 8
  },
  text: {
    color: "#e6edf3",
    fontSize: 14
  },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10
  },
  metaText: {
    color: "#7d8590",
    fontSize: 12
  }
});
