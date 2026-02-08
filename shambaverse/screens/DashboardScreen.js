import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Navbar from "../components/Navbar";

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Navbar title="Dashboard" />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resumo da Produção</Text>
        <View style={styles.card}>
          <Text style={styles.metric}>320 sacos</Text>
          <Text style={styles.label}>Colheita total (2024)</Text>
        </View>
        <View style={styles.cardRow}>
          <View style={styles.cardSmall}>
            <Text style={styles.metricSmall}>65.000 Kz</Text>
            <Text style={styles.label}>Receita da semana</Text>
          </View>
          <View style={styles.cardSmall}>
            <Text style={styles.metricSmall}>18.500 Kz</Text>
            <Text style={styles.label}>Custos operacionais</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Planeamento</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Próxima plantação</Text>
          <Text style={styles.planText}>Feijão Catarino • 12 de Abril</Text>
          <Text style={styles.planText}>Área prevista: 4 hectares</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1117"
  },
  section: {
    padding: 16
  },
  sectionTitle: {
    color: "#e6edf3",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12
  },
  card: {
    backgroundColor: "#161b22",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#21262d",
    marginBottom: 12
  },
  cardRow: {
    flexDirection: "row",
    gap: 12
  },
  cardSmall: {
    flex: 1,
    backgroundColor: "#161b22",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#21262d"
  },
  metric: {
    color: "#3fb950",
    fontSize: 22,
    fontWeight: "700"
  },
  metricSmall: {
    color: "#3fb950",
    fontSize: 16,
    fontWeight: "700"
  },
  label: {
    color: "#7d8590",
    marginTop: 4
  },
  planText: {
    color: "#e6edf3",
    marginTop: 6
  }
});
