-- Enable realtime for bills and bill_items tables to support live updates in kitchen dashboard
ALTER TABLE public.bills REPLICA IDENTITY FULL;
ALTER TABLE public.bill_items REPLICA IDENTITY FULL;

-- Add bills table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.bills;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bill_items;