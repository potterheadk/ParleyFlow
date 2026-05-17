-- Run this in Supabase SQL Editor
-- Project: Father-parley-deilvery
-- This is the ONLY table in Supabase (sync relay only)

CREATE TABLE IF NOT EXISTS operator_updates (
    update_id UUID PRIMARY KEY,
    bill_id INTEGER NOT NULL,
    operator_id INTEGER NOT NULL,
    route_id INTEGER,
    remark TEXT,
    note TEXT,
    updated_amount FLOAT,
    created_at TIMESTAMP DEFAULT NOW(),
    merged BOOLEAN DEFAULT FALSE,
    merged_at TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE operator_updates ENABLE ROW LEVEL SECURITY;

-- Allow full access via service role key (backend only)
CREATE POLICY "service_role_full_access" ON operator_updates
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Index for fast admin pulls
CREATE INDEX idx_operator_updates_merged ON operator_updates(merged);
CREATE INDEX idx_operator_updates_operator ON operator_updates(operator_id);
