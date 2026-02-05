import { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';

export function Card({ children, title }: PropsWithChildren<{ title: string }>) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 8 }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>{title}</Text>
      {children}
    </View>
  );
}
