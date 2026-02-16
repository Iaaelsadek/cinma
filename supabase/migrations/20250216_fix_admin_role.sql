-- Force update role to admin for the user
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'iaaelsadek@gmail.com'
);
