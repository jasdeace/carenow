-- Add is_deleted column to medications for soft delete functionality
ALTER TABLE medications ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

-- Create an index to optimize queries filtering out deleted medications
CREATE INDEX idx_medications_is_deleted ON medications(is_deleted);
