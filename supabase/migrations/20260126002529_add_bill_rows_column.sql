-- Add bill_rows column to store bill items for editing
ALTER TABLE public.bills 
ADD COLUMN IF NOT EXISTS bill_rows JSONB DEFAULT '[]'::jsonb;
