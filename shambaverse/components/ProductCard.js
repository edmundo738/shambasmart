import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function ProductCard({ item, onContact }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.badge}>{item.badge}</Text>
      </View>
      <Text style={styles.location}>📍 {item.location}</Text>
      <Text style={styles.price}>{item.price} Kz • {item.unit}</Text>
      <Text style={styles.meta}>{item.quantity}</Text>
      <TouchableOpacity style={styles.button} onPress={() => onContact(item.seller)}>
        <Text style={styles.buttonText}>Contactar {item.seller}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#161b22",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#21262d"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    color: "#e6edf3",
    fontSize: 16,
    fontWeight: "700"
  },
  badge: {
    backgroundColor: "#da3633",
    color: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 11,
    fontWeight: "700"
  },
  location: {
    color: "#7d8590",
    marginTop: 6
  },
  price: {
    color: "#3fb950",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8
  },
  meta: {
    color: "#7d8590",
    marginTop: 6
  },
  button: {
    backgroundColor: "#238636",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600"
  }
});
