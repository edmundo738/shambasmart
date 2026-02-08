import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function TransportCard({ item, onBook }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.provider}</Text>
      <View style={styles.row}>
        <Text style={styles.detail}>🛣️ {item.route}</Text>
        <Text style={styles.detail}>⏱️ {item.eta}</Text>
      </View>
      <Text style={styles.price}>{item.price} Kz / viagem</Text>
      <TouchableOpacity style={styles.button} onPress={() => onBook(item.title)}>
        <Text style={styles.buttonText}>Reservar Transporte</Text>
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
  title: {
    color: "#e6edf3",
    fontSize: 16,
    fontWeight: "700"
  },
  subtitle: {
    color: "#7d8590",
    marginTop: 4
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8
  },
  detail: {
    color: "#7d8590",
    fontSize: 12
  },
  price: {
    color: "#3fb950",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8
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
