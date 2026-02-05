import { ScrollView, Text, View } from 'react-native';
import { HomeDashboardScreen } from './src/screens/HomeDashboardScreen';
import { MarketplaceScreen } from './src/screens/MarketplaceScreen';
import { LogisticsScreen } from './src/screens/LogisticsScreen';
import { FarmerProfileScreen } from './src/screens/FarmerProfileScreen';
import { FeedScreen } from './src/screens/FeedScreen';

export default function App() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f4f8f5' }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 26, fontWeight: '700', color: '#214f2a' }}>CHAMBA / ShambaSmart</Text>
      <Text>Onde o campo encontra oportunidades</Text>
      <HomeDashboardScreen />
      <MarketplaceScreen />
      <LogisticsScreen />
      <FarmerProfileScreen />
      <FeedScreen />
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}
