import React from "react";
import { View, StyleSheet, FlatList } from "react-native";
import Navbar from "../components/Navbar";
import AlertCard from "../components/AlertCard";

const alerts = [
  {
    id: "1",
    title: "ALERTA DE PRAGA",
    text: "Lagarta militar detectada em fazendas da região de Cacula. Inspeção imediata recomendada.",
    location: "Cacula, Huambo",
    time: "Há 2 horas"
  },
  {
    id: "2",
    title: "ALERTA CLIMÁTICO",
    text: "Chuvas intensas previstas nas próximas 48h. Planeie colheitas e transporte.",
    location: "Huambo",
    time: "Hoje"
  },
  {
    id: "3",
    title: "DICA DE PLANTIO",
    text: "Período ideal para feijão nas zonas altas do Planalto Central até 15 de Abril.",
    location: "Planalto Central",
    time: "Esta semana"
  }
];

export default function AlertsScreen() {
  return (
    <View style={styles.container}>
      <Navbar title="Alertas" />
      <FlatList
        contentContainerStyle={styles.list}
        data={alerts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AlertCard item={item} />}
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
