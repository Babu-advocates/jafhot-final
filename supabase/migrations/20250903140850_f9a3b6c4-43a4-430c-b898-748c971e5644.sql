-- Drop the existing check constraint
ALTER TABLE public.bills DROP CONSTRAINT bills_status_check;

-- Add new check constraint that includes 'active' status for kitchen orders
ALTER TABLE public.bills ADD CONSTRAINT bills_status_check 
CHECK (status = ANY (ARRAY['draft'::text, 'completed'::text, 'active'::text]));