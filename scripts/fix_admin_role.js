import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('Starting admin promotion script...');

  // 1. Find the user by email
  const email = 'cairo.tv@gmail.com';
  console.log(`Looking for user with email: ${email}`);

  // Note: auth.admin.listUsers() is the way to list users with service role
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }

  const user = users.find(u => u.email === email);

  if (!user) {
    console.error(`User ${email} not found in auth.users!`);
    console.log('Available users:', users.map(u => u.email));
    return;
  }

  console.log(`Found user: ${user.id}`);
  console.log('Current user metadata:', user.user_metadata);
  console.log('Current app metadata:', user.app_metadata);

  // 2. Check current profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Error fetching profile:', profileError);
    // If profile doesn't exist, we might need to create it
    if (profileError.code === 'PGRST116') {
        console.log('Profile not found. Creating one...');
        const { error: insertError } = await supabase.from('profiles').insert({
            id: user.id,
            username: email.split('@')[0],
            role: 'admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        if (insertError) {
            console.error('Error creating profile:', insertError);
        } else {
            console.log('Profile created with admin role!');
        }
        return;
    }
    return;
  }

  console.log('Current profile:', profile);

  // 3. Update role to admin in profiles table
  if (profile.role !== 'admin') {
    console.log('Updating role to admin in profiles table...');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        role: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
    } else {
      console.log('Successfully updated user role to admin in profiles table!');
    }
  } else {
    console.log('User is already an admin in profiles table.');
  }
  
  // 4. Update app_metadata as well (important for future-proofing)
  console.log('Updating app_metadata to role: admin...');
  
  // Get current app_metadata and merge with new role
  const currentAppMetadata = user.app_metadata || {};
  const updatedAppMetadata = {
    ...currentAppMetadata,
    role: 'admin',
    updated_at: new Date().toISOString()
  };
  
  const { error: metaError } = await supabase.auth.admin.updateUserById(
    user.id,
    { app_metadata: updatedAppMetadata }
  );
  
  if (metaError) {
    console.error('Error updating app_metadata:', metaError);
  } else {
    console.log('Successfully updated app_metadata!');
  }
  
  // 5. Also update user_metadata if needed
  console.log('Updating user_metadata...');
  const currentUserMetadata = user.user_metadata || {};
  const updatedUserMetadata = {
    ...currentUserMetadata,
    role: 'admin',
    updated_at: new Date().toISOString()
  };
  
  const { error: userMetaError } = await supabase.auth.admin.updateUserById(
    user.id,
    { user_metadata: updatedUserMetadata }
  );
  
  if (userMetaError) {
    console.error('Error updating user_metadata:', userMetaError);
  } else {
    console.log('Successfully updated user_metadata!');
  }
  
  // Verify final state
  console.log('Verifying final state...');
  const { data: updatedProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
    
  console.log('Final profile state:', updatedProfile);
  
  // Re-fetch user to verify metadata updates
  const { data: { users: updatedUsers }, error: verifyError } = await supabase.auth.admin.listUsers();
  if (!verifyError) {
    const updatedUser = updatedUsers.find(u => u.id === user.id);
    if (updatedUser) {
      console.log('Updated app_metadata:', updatedUser.app_metadata);
      console.log('Updated user_metadata:', updatedUser.user_metadata);
      
      // Final verification
      const isAdminInProfiles = updatedProfile?.role === 'admin';
      const isAdminInAppMetadata = updatedUser.app_metadata?.role === 'admin';
      const isAdminInUserMetadata = updatedUser.user_metadata?.role === 'admin';
      
      console.log('\n=== VERIFICATION RESULTS ===');
      console.log(`✅ Admin in profiles table: ${isAdminInProfiles}`);
      console.log(`✅ Admin in app_metadata: ${isAdminInAppMetadata}`);
      console.log(`✅ Admin in user_metadata: ${isAdminInUserMetadata}`);
      console.log(`🎯 Overall admin status: ${isAdminInProfiles && isAdminInAppMetadata && isAdminInUserMetadata ? 'SUCCESS' : 'PARTIAL'}`);
      
      if (isAdminInProfiles && isAdminInAppMetadata && isAdminInUserMetadata) {
        console.log('\n🎉 User successfully promoted to admin across all systems!');
      } else {
        console.log('\n⚠️  Admin promotion incomplete. Check the logs above.');
      }
    }
  }
  
  console.log('\n=== ADMIN PROMOTION COMPLETE ===');
}

main().catch(console.error);
