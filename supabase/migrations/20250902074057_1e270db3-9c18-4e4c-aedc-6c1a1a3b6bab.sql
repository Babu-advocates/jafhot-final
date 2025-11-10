
-- First, let's ensure the user_role enum exists and matches your data
CREATE TYPE user_role AS ENUM ('biller', 'kitchen_manager');

-- Update the profiles table to handle any missing columns that might cause the auth error
-- The error suggests there might be issues with nullable columns in the auth schema interaction
ALTER TABLE public.profiles 
ALTER COLUMN email SET NOT NULL,
ALTER COLUMN role SET NOT NULL;

-- Ensure the profiles table has proper constraints
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_pkey PRIMARY KEY (id) ON CONFLICT DO NOTHING;

-- Add a foreign key constraint to link profiles to auth.users
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create or replace the trigger function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'biller')::user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  );
  RETURN NEW;
END;
$function$;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add RLS policy to allow users to read their own profile during auth
CREATE POLICY "Enable read access for own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Add RLS policy to allow profile insertion during signup
CREATE POLICY "Enable insert for authenticated users" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
