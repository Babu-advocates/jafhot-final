-- First, drop the foreign key constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Add password column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Ensure the pgcrypto extension is enabled for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
INSERT INTO public.profiles (id, email, role, full_name, password_hash, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'biller@gmail.com',
  'biller',
  'Biller User',
  crypt('biller123', gen_salt('bf')),
  now(),
  now()
);

-- Insert kitchen manager user with hashed password
INSERT INTO public.profiles (id, email, role, full_name, password_hash, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'kitchen@gmail.com',
  'kitchen_manager',
  'Kitchen Manager',
  crypt('kitchen123', gen_salt('bf')),
  now(),
  now()
);

-- Update RLS policies to allow public access for login verification
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow password verification" ON public.profiles;

-- Create new policy for public read access (needed for login)
CREATE POLICY "Public read for login" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Drop the trigger that was trying to insert into profiles from auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function that was handling new users from auth
DROP FUNCTION IF EXISTS public.handle_new_user();