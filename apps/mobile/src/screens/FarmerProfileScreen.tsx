import { Text } from 'react-native';
import { Card } from '../components/Card';

export function FarmerProfileScreen() {
  return (
    <Card title="Perfil do camponês">
      <Text>Mateus Chipindo</Text>
      <Text>Culturas: milho, mandioca, tomate</Text>
      <Text>Reputação: 4.8/5</Text>
    </Card>
  );
}
