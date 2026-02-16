-- Create the user if not exists
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'iaaelsadek@gmail.com',
  crypt('Eslam@26634095', gen_salt('bf')),
  now(),
  null,
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'iaaelsadek@gmail.com'
);

-- Ensure admin role in profiles
INSERT INTO public.profiles (id, username, role)
SELECT 
  id, 
  split_part(email, '@', 1), 
  'admin'
FROM auth.users 
WHERE email = 'iaaelsadek@gmail.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin';
