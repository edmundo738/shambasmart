export const dashboardSnapshot = {
  weather: { now: '28°C, parcialmente nublado', forecast: ['29°C', '30°C', '27°C'] },
  roads: { status: 'moderate', note: 'Estrada principal com trânsito leve próximo ao mercado central.' },
  dailyTip: 'Regue culturas ao final da tarde para reduzir evaporação.',
  alerts: [
    { id: 'a1', title: 'Risco de chuva forte em 24h', severity: 'high' },
    { id: 'a2', title: 'Preço do milho subiu 8%', severity: 'medium' }
  ]
};

export const marketplaceListings = [
  {
    id: 'm1', ownerId: 'u1', category: 'product', title: 'Milho fresco (50kg)', price: 18000,
    locationName: 'Huambo', availability: 'Hoje', imageUrl: 'https://images.unsplash.com/photo-1601593768799-76f5f6f67f8f'
  },
  {
    id: 'm2', ownerId: 'u2', category: 'service', title: 'Transporte de carga leve', price: 8500,
    locationName: 'Benguela', availability: 'Esta semana'
  }
];

export const feed = [
  {
    id: 'f1',
    type: 'success_story',
    title: 'Jovens produtores reduziram perdas em 30%',
    content: 'Com logística coordenada no CHAMBA, colheitas chegaram no tempo ideal ao comprador.',
    createdAt: new Date().toISOString()
  }
];

export const farmerProfile = {
  userId: 'u1',
  fullName: 'Mateus Chipindo',
  crops: ['Milho', 'Tomate', 'Mandioca'],
  reputationScore: 4.8,
  salesHistory: [
    { id: 's1', value: 18000, date: '2026-01-02' },
    { id: 's2', value: 21000, date: '2026-01-15' }
  ]
};
