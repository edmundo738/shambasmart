-- CHAMBA / ShambaSmart - PostgreSQL schema (MVP)

CREATE TABLE users (
  id UUID PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  role VARCHAR(30) NOT NULL, -- farmer, buyer, transporter, student, investor
  phone VARCHAR(30),
  location_name VARCHAR(120),
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  reputation_score NUMERIC(4,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE farmer_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  farm_size_hectares NUMERIC(10,2),
  crops TEXT[],
  bio TEXT,
  verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE listings (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES users(id),
  category VARCHAR(30) NOT NULL, -- product, input, service
  title VARCHAR(140) NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL,
  unit VARCHAR(30),
  quantity NUMERIC(12,2),
  location_name VARCHAR(120),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE transport_requests (
  id UUID PRIMARY KEY,
  farmer_id UUID REFERENCES users(id),
  transporter_id UUID REFERENCES users(id),
  listing_id UUID REFERENCES listings(id),
  pickup_location VARCHAR(120),
  dropoff_location VARCHAR(120),
  suggested_price NUMERIC(12,2),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE feed_posts (
  id UUID PRIMARY KEY,
  author_id UUID REFERENCES users(id),
  type VARCHAR(30) NOT NULL, -- success_story, news, announcement
  title VARCHAR(140) NOT NULL,
  content TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE courses (
  id UUID PRIMARY KEY,
  title VARCHAR(140) NOT NULL,
  level VARCHAR(20) NOT NULL,
  duration_minutes INT NOT NULL,
  description TEXT,
  badge VARCHAR(60)
);

CREATE TABLE user_course_progress (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  progress_percent INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  category VARCHAR(30) NOT NULL,
  title VARCHAR(140) NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP DEFAULT NOW()
);
