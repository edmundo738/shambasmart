import { Text } from 'react-native';
import { Card } from '../components/Card';

export function HomeDashboardScreen() {
  return (
    <Card title="Dashboard agrícola">
      <Text>📍 Huambo</Text>
      <Text>🌧️ Chuva leve nas próximas 24h</Text>
      <Text>⚠️ Alerta de pragas para tomate</Text>
    </Card>
  );
}
