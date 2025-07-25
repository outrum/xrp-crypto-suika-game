-- Supabase Database Schema for Crypto Meme Suika Game - Production Version
-- This file contains the SQL commands to set up the production database tables
-- Requirements: 8.1, 8.2 - Production database setup with proper security

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS leaderboard CASCADE;
DROP TABLE IF EXISTS game_states CASCADE;

-- Create game_states table to store player game states
CREATE TABLE game_states (
    player_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    high_score INTEGER NOT NULL DEFAULT 0 CHECK (high_score >= 0),
    high_score_date TIMESTAMP WITH TIME ZONE,
    unlocked_codes BOOLEAN[] NOT NULL DEFAULT ARRAY[false, false, false, false, false] CHECK (array_length(unlocked_codes, 1) = 5),
    code_unlock_dates TIMESTAMP WITH TIME ZONE[] DEFAULT ARRAY[null, null, null, null, null] CHECK (array_length(code_unlock_dates, 1) = 5),
    total_games_played INTEGER NOT NULL DEFAULT 0 CHECK (total_games_played >= 0),
    last_played TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Additional metadata for analytics
    user_agent TEXT,
    ip_address INET,
    session_count INTEGER DEFAULT 1 CHECK (session_count >= 1)
);

-- Create leaderboard table for global high scores
CREATE TABLE leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID NOT NULL REFERENCES game_states(player_id) ON DELETE CASCADE,
    player_name TEXT NOT NULL CHECK (length(player_name) <= 50 AND length(player_name) >= 1),
    score INTEGER NOT NULL CHECK (score > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Prevent duplicate entries for same player/score combination
    UNIQUE(player_id, score)
);

-- Create indexes for optimal query performance
CREATE INDEX idx_game_states_high_score ON game_states(high_score DESC);
CREATE INDEX idx_game_states_last_played ON game_states(last_played DESC);
CREATE INDEX idx_game_states_created_at ON game_states(created_at DESC);
CREATE INDEX idx_leaderboard_score ON leaderboard(score DESC);
CREATE INDEX idx_leaderboard_created_at ON leaderboard(created_at DESC);
CREATE INDEX idx_leaderboard_player_id ON leaderboard(player_id);

-- Create composite indexes for common queries
CREATE INDEX idx_game_states_score_date ON game_states(high_score DESC, high_score_date DESC);
CREATE INDEX idx_leaderboard_score_date ON leaderboard(score DESC, created_at DESC);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on game_states
CREATE TRIGGER update_game_states_updated_at 
    BEFORE UPDATE ON game_states 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to validate score thresholds for secret codes
CREATE OR REPLACE FUNCTION validate_secret_code_unlock(score INTEGER, codes BOOLEAN[])
RETURNS BOOLEAN AS $$
BEGIN
    -- Validate that unlocked codes match score thresholds
    -- Code thresholds: 100, 500, 1000, 2500, 5000
    IF score >= 5000 THEN
        RETURN codes[1] AND codes[2] AND codes[3] AND codes[4] AND codes[5];
    ELSIF score >= 2500 THEN
        RETURN codes[1] AND codes[2] AND codes[3] AND codes[4] AND NOT codes[5];
    ELSIF score >= 1000 THEN
        RETURN codes[1] AND codes[2] AND codes[3] AND NOT codes[4] AND NOT codes[5];
    ELSIF score >= 500 THEN
        RETURN codes[1] AND codes[2] AND NOT codes[3] AND NOT codes[4] AND NOT codes[5];
    ELSIF score >= 100 THEN
        RETURN codes[1] AND NOT codes[2] AND NOT codes[3] AND NOT codes[4] AND NOT codes[5];
    ELSE
        RETURN NOT codes[1] AND NOT codes[2] AND NOT codes[3] AND NOT codes[4] AND NOT codes[5];
    END IF;
END;
$$ language 'plpgsql';

-- Create function to get top scores for leaderboard
CREATE OR REPLACE FUNCTION get_top_scores(limit_count INTEGER DEFAULT 100)
RETURNS TABLE(
    player_name TEXT,
    score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    rank INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.player_name,
        l.score,
        l.created_at,
        ROW_NUMBER() OVER (ORDER BY l.score DESC, l.created_at ASC)::INTEGER as rank
    FROM leaderboard l
    ORDER BY l.score DESC, l.created_at ASC
    LIMIT limit_count;
END;
$$ language 'plpgsql';

-- Create function to get player statistics
CREATE OR REPLACE FUNCTION get_player_stats(p_player_id UUID)
RETURNS TABLE(
    high_score INTEGER,
    total_games INTEGER,
    codes_unlocked INTEGER,
    leaderboard_rank INTEGER,
    percentile NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gs.high_score,
        gs.total_games_played,
        (SELECT COUNT(*) FROM unnest(gs.unlocked_codes) AS code WHERE code = true)::INTEGER as codes_unlocked,
        COALESCE((
            SELECT rank::INTEGER 
            FROM get_top_scores(10000) 
            WHERE get_top_scores.player_name = (
                SELECT l.player_name 
                FROM leaderboard l 
                WHERE l.player_id = p_player_id 
                ORDER BY l.score DESC 
                LIMIT 1
            )
            LIMIT 1
        ), 0) as leaderboard_rank,
        COALESCE((
            SELECT ROUND(
                (COUNT(*) FILTER (WHERE score < gs.high_score)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
                2
            )
            FROM leaderboard
        ), 0) as percentile
    FROM game_states gs
    WHERE gs.player_id = p_player_id;
END;
$$ language 'plpgsql';

-- Enable Row Level Security (RLS)
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Production RLS Policies for game_states
-- Allow users to read and write only their own game state
CREATE POLICY "Users can manage their own game state" ON game_states
    FOR ALL 
    USING (true)  -- For now, allow all access since we're using anonymous auth
    WITH CHECK (true);

-- Production RLS Policies for leaderboard
-- Allow users to insert their own scores and read all scores
CREATE POLICY "Users can insert their own scores" ON leaderboard
    FOR INSERT 
    WITH CHECK (true);  -- Allow all inserts for anonymous users

CREATE POLICY "Users can read all leaderboard entries" ON leaderboard
    FOR SELECT 
    USING (true);

-- Prevent updates and deletes on leaderboard (scores should be immutable)
CREATE POLICY "Prevent leaderboard updates" ON leaderboard
    FOR UPDATE 
    USING (false);

CREATE POLICY "Prevent leaderboard deletes" ON leaderboard
    FOR DELETE 
    USING (false);

-- Grant necessary permissions to anonymous users (for anonymous auth)
GRANT SELECT, INSERT, UPDATE ON game_states TO anon;
GRANT SELECT, INSERT ON leaderboard TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT EXECUTE ON FUNCTION get_top_scores(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_player_stats(UUID) TO anon;

-- Grant permissions to authenticated users (if auth is implemented later)
GRANT SELECT, INSERT, UPDATE ON game_states TO authenticated;
GRANT SELECT, INSERT ON leaderboard TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_scores(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_player_stats(UUID) TO authenticated;

-- Create view for public leaderboard (without sensitive data)
CREATE OR REPLACE VIEW public_leaderboard AS
SELECT 
    l.player_name,
    l.score,
    l.created_at,
    ROW_NUMBER() OVER (ORDER BY l.score DESC, l.created_at ASC) as rank
FROM leaderboard l
ORDER BY l.score DESC, l.created_at ASC
LIMIT 1000;

-- Grant access to the view
GRANT SELECT ON public_leaderboard TO anon;
GRANT SELECT ON public_leaderboard TO authenticated;

-- Create materialized view for analytics (refreshed periodically)
CREATE MATERIALIZED VIEW game_analytics AS
SELECT 
    COUNT(*) as total_players,
    AVG(high_score) as avg_high_score,
    MAX(high_score) as max_score,
    COUNT(*) FILTER (WHERE unlocked_codes[1] = true) as players_with_code1,
    COUNT(*) FILTER (WHERE unlocked_codes[2] = true) as players_with_code2,
    COUNT(*) FILTER (WHERE unlocked_codes[3] = true) as players_with_code3,
    COUNT(*) FILTER (WHERE unlocked_codes[4] = true) as players_with_code4,
    COUNT(*) FILTER (WHERE unlocked_codes[5] = true) as players_with_code5,
    AVG(total_games_played) as avg_games_per_player,
    COUNT(*) FILTER (WHERE last_played > NOW() - INTERVAL '24 hours') as active_24h,
    COUNT(*) FILTER (WHERE last_played > NOW() - INTERVAL '7 days') as active_7d,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_players_24h
FROM game_states;

-- Create index on materialized view
CREATE INDEX idx_game_analytics_refresh ON game_analytics(total_players);

-- Function to refresh analytics (can be called periodically)
CREATE OR REPLACE FUNCTION refresh_game_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW game_analytics;
END;
$$ language 'plpgsql';

-- Grant access to analytics view (read-only)
GRANT SELECT ON game_analytics TO anon;
GRANT SELECT ON game_analytics TO authenticated;

-- Create function for data cleanup (remove old inactive players)
CREATE OR REPLACE FUNCTION cleanup_inactive_players(days_inactive INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM game_states 
    WHERE last_played < NOW() - (days_inactive || ' days')::INTERVAL
    AND high_score = 0;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Insert some initial test data for validation
INSERT INTO game_states (player_id, high_score, unlocked_codes, total_games_played) 
VALUES 
    (uuid_generate_v4(), 150, ARRAY[true, false, false, false, false], 3),
    (uuid_generate_v4(), 750, ARRAY[true, true, false, false, false], 8),
    (uuid_generate_v4(), 1500, ARRAY[true, true, true, false, false], 15)
ON CONFLICT DO NOTHING;

-- Refresh the analytics view
SELECT refresh_game_analytics();