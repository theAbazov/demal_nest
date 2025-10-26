-- Создание типов ENUM
CREATE TYPE "Role" AS ENUM ('CLIENT', 'PARTNER', 'ADMIN');
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "TourStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');
CREATE TYPE "OtpChannel" AS ENUM ('SMS', 'WHATSAPP', 'TELEGRAM');

-- Таблица users
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    role "Role" NOT NULL DEFAULT 'CLIENT',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_new_user BOOLEAN NOT NULL DEFAULT true,
    image_url VARCHAR(500)
);

-- Таблица partner_profiles
CREATE TABLE partner_profiles (
    profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    description TEXT,
    documents_url VARCHAR(500),
    verification_status "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    verification_comment TEXT,
    card_number VARCHAR(20),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Таблица tours
CREATE TABLE tours (
    tour_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    main_image_url VARCHAR(500) NOT NULL,
    location VARCHAR(255) NOT NULL,
    tour_type VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    time VARCHAR(8) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'KGS',
    available_spots INTEGER NOT NULL,
    description TEXT,
    program JSONB,
    meeting_point JSONB,
    whats_included TEXT[],
    whats_not_included TEXT[],
    what_to_bring TEXT,
    image_gallery_urls TEXT[],
    organizer_id UUID NOT NULL REFERENCES users(user_id),
    status "TourStatus" NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Таблица bookings
CREATE TABLE bookings (
    booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tour_id UUID NOT NULL REFERENCES tours(tour_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    seats_count INTEGER NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status "BookingStatus" NOT NULL DEFAULT 'PENDING',
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Таблица reviews
CREATE TABLE reviews (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tour_id UUID NOT NULL REFERENCES tours(tour_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL,
    text TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(tour_id, user_id)
);

-- Таблица otp_sessions
CREATE TABLE otp_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    channel "OtpChannel" NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_tours_organizer ON tours(organizer_id);
CREATE INDEX idx_tours_status ON tours(status);
CREATE INDEX idx_tours_date ON tours(date);
CREATE INDEX idx_bookings_tour ON bookings(tour_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_reviews_tour ON reviews(tour_id);
CREATE INDEX idx_otp_sessions_phone ON otp_sessions(phone_number);
CREATE INDEX idx_otp_sessions_expires ON otp_sessions(expires_at);
