-- Add password column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create or replace the password verification function
CREATE OR REPLACE FUNCTION public.verify_user_password(
  user_email TEXT,
  user_password TEXT
)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  role TEXT,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.email,
    p.role,
    p.full_name
  FROM public.profiles p
  WHERE p.email = user_email 
    AND p.password_hash = crypt(user_password, p.password_hash);
END;
$$;

-- Delete existing users with these emails to avoid conflicts
DELETE FROM public.profiles WHERE email IN ('biller@gmail.com', 'kitchen@gmail.com');

-- Insert biller user with hashed password
INSERT INTO public.profiles (id, email, role, full_name, password_hash)
VALUES (
  gen_random_uuid(),
  'biller@gmail.com',
  'biller',
  'Biller User',
  crypt('biller123', gen_salt('bf'))
);

-- Insert kitchen manager user with hashed password
INSERT INTO public.profiles (id, email, role, full_name, password_hash)
VALUES (
  gen_random_uuid(),
  'kitchen@gmail.com',
  'kitchen_manager',
  'Kitchen Manager',
  crypt('kitchen123', gen_salt('bf'))
);

-- Update RLS policies to allow public access for login verification
DROP POLICY IF EXISTS "Allow password verification" ON public.profiles;
CREATE POLICY "Allow password verification" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Ensure the pgcrypto extension is enabled for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;