-- SQL for Supabase Schema

-- Volunteers Table
CREATE TABLE IF NOT EXISTS volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  photo_url TEXT,
  roles JSONB DEFAULT '[]',
  days JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  stats JSONB DEFAULT '{"puntualidad": 0, "orden": 0, "responsabilidad": 0, "extraPoints": 0, "total": 0}',
  restricted_dates JSONB DEFAULT '[]'
);

-- Schedule Table
CREATE TABLE IF NOT EXISTS schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week INTEGER,
  day TEXT,
  role TEXT,
  volunteer_id UUID REFERENCES volunteers(id) ON DELETE SET NULL,
  evaluated BOOLEAN DEFAULT false,
  month INTEGER,
  year INTEGER,
  date TEXT,
  event_name TEXT,
  scores JSONB
);

-- Special Events Table
CREATE TABLE IF NOT EXISTS special_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  roles JSONB DEFAULT '[]'
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

-- Insert default PIN if not exists
INSERT INTO settings (id, data) 
VALUES ('auth', '{"pin": "1234"}')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (adjust as needed for security)
CREATE POLICY "Allow public read on volunteers" ON volunteers FOR SELECT USING (true);
CREATE POLICY "Allow public read on schedule" ON schedule FOR SELECT USING (true);
CREATE POLICY "Allow public read on special_events" ON special_events FOR SELECT USING (true);
CREATE POLICY "Allow public read on settings" ON settings FOR SELECT USING (true);

-- Create policies for authenticated write access (adjust as needed)
-- Note: In a real app, you'd use Supabase Auth to restrict this.
-- For this simple PIN-based admin, we'll allow all for now or restrict by service role.
CREATE POLICY "Allow all on volunteers" ON volunteers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on schedule" ON schedule FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on special_events" ON special_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on settings" ON settings FOR ALL USING (true) WITH CHECK (true);
