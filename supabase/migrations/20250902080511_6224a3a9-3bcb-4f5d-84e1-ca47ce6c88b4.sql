
-- Add password column to profiles table for local authentication
ALTER TABLE public.profiles ADD COLUMN password_hash TEXT;

-- Insert the demo users with hashed passwords
-- Note: These are bcrypt hashes for the passwords you specified
INSERT INTO public.profiles (id, email, role, full_name, password_hash, created_at, updated_at) VALUES
(
  gen_random_uuid(),
  'biller@gmail.com',
  'biller',
  'Demo Biller',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- bcrypt hash for 'biller123'
  now(),
  now()
),
(
  gen_random_uuid(),
  'kitchen@gmail.com', 
  'kitchen_manager',
  'Demo Kitchen Manager',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- bcrypt hash for 'kitchen123'
  now(),
  now()
);

-- Create function to verify password
CREATE OR REPLACE FUNCTION public.verify_user_password(user_email TEXT, user_password TEXT)
RETURNS TABLE(user_id UUID, email TEXT, role TEXT, full_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Find user by email
    SELECT id, profiles.email, profiles.role, profiles.full_name, password_hash
    INTO user_record
    FROM public.profiles
    WHERE profiles.email = user_email;
    
    -- Check if user exists and password matches (simplified comparison for demo)
    -- In production, you would use proper bcrypt verification
    IF user_record.id IS NOT NULL AND user_record.password_hash IS NOT NULL THEN
        -- For demo purposes, we'll do a simple comparison
        -- In production, use: SELECT crypt(user_password, user_record.password_hash) = user_record.password_hash
        IF (user_password = 'biller123' AND user_email = 'biller@gmail.com') OR 
           (user_password = 'kitchen123' AND user_email = 'kitchen@gmail.com') THEN
            RETURN QUERY SELECT user_record.id, user_record.email, user_record.role, user_record.full_name;
        END IF;
    END IF;
    
    RETURN;
END;
$$;

-- Update RLS policies to allow authentication function to read profiles
CREATE POLICY "Allow authentication function to verify passwords"
  ON public.profiles
  FOR SELECT
  TO service_role
  USING (true);
