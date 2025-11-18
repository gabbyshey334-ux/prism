-- Fix uploads table permissions for RLS
-- Grant access to anon and authenticated roles
GRANT ALL ON uploads TO anon;
GRANT ALL ON uploads TO authenticated;

-- Create RLS policies for uploads table
CREATE POLICY "Allow anonymous read access" ON uploads FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated full access" ON uploads FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow users to insert their own uploads" ON uploads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to update their own uploads" ON uploads FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Allow users to delete their own uploads" ON uploads FOR DELETE TO authenticated USING (auth.uid() = user_id);