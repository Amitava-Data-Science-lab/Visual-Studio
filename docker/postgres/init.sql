-- Visual Studio Builder Database Initialization
-- This script runs when the PostgreSQL container is first created

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Performance indexes (will be created after tables via SQLAlchemy)
-- These are documented here for reference

-- Index on wizard_definitions for lookups
-- CREATE INDEX idx_wizard_definitions_key_status ON wizard_definitions (wizard_key, status);

-- Index on page_definitions for lookups
-- CREATE INDEX idx_page_definitions_key_status ON page_definitions (page_key, status);

-- Index on wizard_sessions for wizard lookups
-- CREATE INDEX idx_sessions_wizard ON wizard_sessions (wizard_key, wizard_version);

-- Index on wizard_sessions for partner/order lookups
-- CREATE INDEX idx_sessions_partner_order ON wizard_sessions (partner_id, merchant_order_id);

-- Index on audit_events for entity lookups
-- CREATE INDEX idx_audit_events_entity ON audit_events (entity_type, entity_id);

-- Index on audit_events for time-based queries
-- CREATE INDEX idx_audit_events_created_at ON audit_events (created_at DESC);
