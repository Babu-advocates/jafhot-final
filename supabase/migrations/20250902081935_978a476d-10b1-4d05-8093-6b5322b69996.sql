-- Fix the security warning by setting search_path for the verify_user_password function
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
    AND p.password_hash = crypt(user_password, p.password_hash);
END;
$$;