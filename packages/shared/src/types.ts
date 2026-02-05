export type UserRole = 'farmer' | 'buyer' | 'transporter' | 'student' | 'investor';

export interface UserLocation {
  locationName: string;
  latitude: number;
  longitude: number;
}

export interface FarmerProfile {
  userId: string;
  fullName: string;
  crops: string[];
  reputationScore: number;
  salesHistory: Array<{ id: string; value: number; date: string }>;
}

export interface DashboardSnapshot {
  weather: { now: string; forecast: string[] };
  roads: { status: 'good' | 'moderate' | 'critical'; note: string };
  dailyTip: string;
  alerts: Array<{ id: string; title: string; severity: 'high' | 'medium' | 'low' }>;
}

export interface MarketplaceListing {
  id: string;
  ownerId: string;
  category: 'product' | 'input' | 'service';
  title: string;
  price: number;
  locationName: string;
  availability: string;
  imageUrl?: string;
}

export interface FeedItem {
  id: string;
  type: 'news' | 'success_story' | 'opportunity' | 'announcement';
  title: string;
  content: string;
  createdAt: string;
}
