-- SQL Migration to create the stores table
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    logo_url TEXT,
    address TEXT,
    phone TEXT,
    receipt_footer TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(owner_id)
);

-- Enable RLS
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can see their own store" ON stores
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can update their own store" ON stores
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own store" ON stores
    FOR INSERT WITH CHECK (auth.uid() = owner_id);
