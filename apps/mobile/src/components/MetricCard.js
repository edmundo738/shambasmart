import { View, Text, StyleSheet } from 'react-native';

export default function MetricCard({ label, value }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10
  },
  label: { fontSize: 12, color: '#666' },
  value: { fontSize: 16, fontWeight: '700' }
});
