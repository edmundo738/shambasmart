import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MetricCard from './components/MetricCard';

export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.title}>CHAMBA / ShambaSmart</Text>
          <Text style={styles.subtitle}>Onde o campo encontra oportunidades</Text>
        </View>

        <MetricCard label="Clima hoje" value="28°C - Ensolarado" />
        <MetricCard label="Alerta" value="Chuva forte quinta-feira" />
        <MetricCard label="Marketplace" value="2 produtos disponíveis próximos" />
        <MetricCard label="Logística" value="1 transportador disponível" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#4caf50' },
  container: { padding: 16, backgroundColor: '#f4f8f4' },
  hero: {
    backgroundColor: '#6a1b9a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14
  },
  title: { color: '#fff', fontWeight: '700', fontSize: 20, marginBottom: 4 },
  subtitle: { color: '#fff' }
});
