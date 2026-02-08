import React from "react";
import { View, StyleSheet, FlatList, Alert } from "react-native";
import Navbar from "../components/Navbar";
import TransportCard from "../components/TransportCard";

const transports = [
  {
    id: "1",
    title: "Camião Frigorífico",
    provider: "Carlos Transportes",
    route: "Huambo → Luanda",
    eta: "12h",
    price: "45.000"
  },
  {
    id: "2",
    title: "Pickup Rural",
    provider: "Miguel S.",
    route: "Caála → Huambo",
    eta: "2h",
    price: "8.500"
  },
  {
    id: "3",
    title: "Van de Distribuição",
    provider: "Ana P.",
    route: "Huambo → Benguela",
    eta: "9h",
    price: "25.000"
  }
];

export default function TransportScreen() {
  const handleBook = (service) => {
    Alert.alert("Reserva confirmada", `${service} reservado com sucesso.`);
  };

  return (
    <View style={styles.container}>
      <Navbar title="Transporte" />
      <FlatList
        contentContainerStyle={styles.list}
        data={transports}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransportCard item={item} onBook={handleBook} />
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
  }
});
