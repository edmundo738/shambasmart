import React from "react";
import { View, StyleSheet, FlatList, Alert } from "react-native";
import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";

const products = [
  {
    id: "1",
    title: "Milho Amarelo Premium",
    location: "Cacula, Huambo",
    price: "12.000",
    unit: "saco",
    seller: "João Manuel",
    quantity: "50 sacos disponíveis",
    badge: "URGENTE"
  },
  {
    id: "2",
    title: "Feijão Catarino",
    location: "Caála, Huambo",
    price: "15.500",
    unit: "saco",
    seller: "Cooperativa Nova Vida",
    quantity: "80 sacos disponíveis",
    badge: "DIRETO"
  },
  {
    id: "3",
    title: "Trator Massey Ferguson 290",
    location: "Benguela",
    price: "2.200.000",
    unit: "unidade",
    seller: "AgroMáquinas",
    quantity: "Ano 2019, revisado",
    badge: "PROMOÇÃO"
  }
];

export default function MarketplaceScreen() {
  const handleContact = (seller) => {
    Alert.alert("Contactar", `Chat iniciado com ${seller}`);
  };

  return (
    <View style={styles.container}>
      <Navbar title="Marketplace" />
      <FlatList
        contentContainerStyle={styles.list}
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard item={item} onContact={handleContact} />
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
