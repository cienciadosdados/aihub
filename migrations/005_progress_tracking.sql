-- Add progress tracking to knowledge_sources table
ALTER TABLE knowledge_sources ADD COLUMN progress_percentage INTEGER DEFAULT 0;
ALTER TABLE knowledge_sources ADD COLUMN progress_message TEXT DEFAULT '';
ALTER TABLE knowledge_sources ADD COLUMN processing_stage TEXT DEFAULT 'pending';

-- Update existing records
UPDATE knowledge_sources SET progress_percentage = 0, progress_message = '', processing_stage = 'pending' WHERE progress_percentage IS NULL;