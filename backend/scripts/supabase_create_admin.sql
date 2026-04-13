-- ══════════════════════════════════════════════════════════════
-- Concertix: Create Admin User in Supabase Auth
-- ══════════════════════════════════════════════════════════════
-- Run this in Supabase Dashboard → SQL Editor
--
-- Step 1: Create admin user (if not exists)
-- Step 2: Set admin role in app_metadata
-- Step 3: Disable email confirmation for this user
-- ══════════════════════════════════════════════════════════════

-- First, check if admin already exists
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@concertix.com';
  
  IF admin_id IS NOT NULL THEN
    -- User exists, update role to admin
    UPDATE auth.users 
    SET 
      raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb,
      raw_user_meta_data = raw_user_meta_data || '{"full_name": "Admin Concertix", "role": "admin"}'::jsonb,
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
    WHERE id = admin_id;
    
    RAISE NOTICE 'Admin user updated: %', admin_id;
  ELSE
    -- Create new admin user
    -- Password: Admin@123 (bcrypt hash)
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@concertix.com',
      crypt('Admin@123', gen_salt('bf')),
      NOW(),
      '{"provider": "email", "providers": ["email"], "role": "admin"}'::jsonb,
      '{"full_name": "Admin Concertix", "role": "admin"}'::jsonb,
      NOW(),
      NOW(),
      '',
      ''
    );
    
    -- Also create identity record
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    SELECT 
      gen_random_uuid(),
      id,
      jsonb_build_object('sub', id::text, 'email', email),
      'email',
      id::text,
      NOW(),
      NOW(),
      NOW()
    FROM auth.users 
    WHERE email = 'admin@concertix.com';
    
    RAISE NOTICE 'Admin user created successfully!';
  END IF;
END $$;

-- Verify the admin user
SELECT 
  id, 
  email, 
  raw_app_meta_data->>'role' as role,
  raw_user_meta_data->>'full_name' as full_name,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'admin@concertix.com';
