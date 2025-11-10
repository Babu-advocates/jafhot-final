-- Ensure pgcrypto is installed in the public schema
DROP EXTENSION IF EXISTS pgcrypto CASCADE;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Update the password verification function to use pgcrypto from public schema
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
SET search_path = public
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
    AND p.password_hash = public.crypt(user_password, p.password_hash);
END;
$$;

-- Re-insert the users with properly hashed passwords using the public schema
DELETE FROM public.profiles WHERE email IN ('biller@gmail.com', 'kitchen@gmail.com');

INSERT INTO public.profiles (id, email, role, full_name, password_hash, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'biller@gmail.com',
  'biller',
  'Biller User',
  public.crypt('biller123', public.gen_salt('bf')),
  now(),
  now()
);

INSERT INTO public.profiles (id, email, role, full_name, password_hash, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'kitchen@gmail.com',
  'kitchen_manager',
  'Kitchen Manager',
  public.crypt('kitchen123', public.gen_salt('bf')),
  now(),
  now()
);