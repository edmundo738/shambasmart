export const dashboard = {
  location: 'Huambo, Angola',
  weather: {
    today: '28°C - Ensolarado',
    forecast: ['Amanhã: 26°C - Possível chuva', '3 dias: 24°C - Parcialmente nublado']
  },
  roads: 'EN260 com trânsito moderado',
  tip: 'Faça irrigação no fim do dia para reduzir evaporação.',
  alerts: ['Risco de praga no milho', 'Chuva forte prevista para quinta-feira']
};

export const feed = [
  { id: 'f1', type: 'historia', title: 'Cooperativa local dobrou vendas com logística partilhada' },
  { id: 'f2', type: 'noticia', title: 'Preço médio do tomate subiu 8% esta semana' }
];

export const marketplace = [
  { id: 'm1', category: 'produto', name: 'Milho (100kg)', price: 32000, location: 'Caála' },
  { id: 'm2', category: 'insumo', name: 'Sementes de feijão', price: 4500, location: 'Bailundo' },
  { id: 'm3', category: 'servico', name: 'Preparação de terra (1ha)', price: 18000, location: 'Huambo' }
];

export const logistics = [
  { id: 'l1', vehicle: 'Camião 6T', route: 'Huambo → Benguela', priceSuggestion: 25000, rating: 4.8 },
  { id: 'l2', vehicle: 'Motorizada carga', route: 'Caála → Huambo', priceSuggestion: 7000, rating: 4.5 }
];

export const courses = [
  { id: 'c1', title: 'Introdução ao solo saudável', minutes: 12, badge: 'Aprendiz Verde' },
  { id: 'c2', title: 'Noções de gestão de pequena produção', minutes: 15, badge: 'Gestor Rural' }
];
