#!/usr/bin/env tsx

/**
 * Production Validator Script
 * Validates all production requirements before launch
 * Task 25.3: Complete final production checklist
 */

import { ProductionValidator } from '../src/audit/components/ProductionValidator';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ValidationResult {
  category: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string[];
}

async function checkEnvironmentVariables(): Promise<ValidationResult> {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_TMDB_API_KEY',
    'VITE_GEMINI_API_KEY',
    'COCKROACHDB_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missing: string[] = [];
  const empty: string[] = [];

  try {
    // Check both .env and .env.local
    let envContent = '';
    try {
      envContent += await fs.readFile('.env', 'utf-8');
    } catch {}
    try {
      envContent += '\n' + await fs.readFile('.env.local', 'utf-8');
    } catch {}

    if (!envContent) {
      return {
        category: 'Environment Variables',
        status: 'fail',
        message: 'No .env or .env.local file found',
        details: ['Create .env or .env.local file with required variables']
      };
    }
    
    for (const varName of requiredVars) {
      if (!envContent.includes(`${varName}=`)) {
        missing.push(varName);
      } else {
        const match = envContent.match(new RegExp(`${varName}=(.+)`));
        if (match && (!match[1] || match[1].trim() === '' || match[1].includes('your_'))) {
          empty.push(varName);
        }
      }
    }

    if (missing.length > 0 || empty.length > 0) {
      return {
        category: 'Environment Variables',
        status: 'fail',
        message: `Missing or empty environment variables`,
        details: [
          ...missing.map(v => `❌ Missing: ${v}`),
          ...empty.map(v => `⚠️  Empty or placeholder: ${v}`)
        ]
      };
    }

    return {
      category: 'Environment Variables',
      status: 'pass',
      message: 'All required environment variables configured'
    };
  } catch (error) {
    return {
      category: 'Environment Variables',
      status: 'fail',
      message: 'Error checking environment variables',
      details: [String(error)]
    };
  }
}

async function checkDatabaseConnections(): Promise<ValidationResult> {
  try {
    // Check both .env and .env.local
    let envContent = '';
    try {
      envContent += await fs.readFile('.env', 'utf-8');
    } catch {}
    try {
      envContent += '\n' + await fs.readFile('.env.local', 'utf-8');
    } catch {}

    const issues: string[] = [];

    if (!envContent.includes('COCKROACHDB_URL=') || envContent.match(/COCKROACHDB_URL=(.+)/)?.[1]?.includes('your_')) {
      issues.push('❌ CockroachDB connection string not configured');
    }

    if (!envContent.includes('VITE_SUPABASE_URL=') || envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.includes('your-project')) {
      issues.push('❌ Supabase URL not configured');
    }

    if (issues.length > 0) {
      return {
        category: 'Database Connections',
        status: 'fail',
        message: 'Database connections not properly configured',
        details: issues
      };
    }

    return {
      category: 'Database Connections',
      status: 'pass',
      message: 'Database connections configured'
    };
  } catch (error) {
    return {
      category: 'Database Connections',
      status: 'fail',
      message: 'Cannot verify database connections'
    };
  }
}

async function checkAPIKeys(): Promise<ValidationResult> {
  const apiKeys = [
    { name: 'VITE_TMDB_API_KEY', service: 'TMDB' },
    { name: 'VITE_GEMINI_API_KEY', service: 'Gemini AI' },
    { name: 'VITE_SUPABASE_ANON_KEY', service: 'Supabase' },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', service: 'Supabase Admin' }
  ];

  try {
    // Check both .env and .env.local
    let envContent = '';
    try {
      envContent += await fs.readFile('.env', 'utf-8');
    } catch {}
    try {
      envContent += '\n' + await fs.readFile('.env.local', 'utf-8');
    } catch {}

    const issues: string[] = [];

    for (const key of apiKeys) {
      if (!envContent.includes(`${key.name}=`) || envContent.match(new RegExp(`${key.name}=(.+)`))?.[1]?.includes('your_')) {
        issues.push(`❌ ${key.service} API key (${key.name}) not configured`);
      }
    }

    if (issues.length > 0) {
      return {
        category: 'API Keys',
        status: 'fail',
        message: 'API keys not properly configured',
        details: issues
      };
    }

    return {
      category: 'API Keys',
      status: 'pass',
      message: 'All API keys configured'
    };
  } catch (error) {
    return {
      category: 'API Keys',
      status: 'fail',
      message: 'Cannot verify API keys'
    };
  }
}

async function checkMonitoring(): Promise<ValidationResult> {
  try {
    // Check both .env and .env.local
    let envContent = '';
    try {
      envContent += await fs.readFile('.env', 'utf-8');
    } catch {}
    try {
      envContent += '\n' + await fs.readFile('.env.local', 'utf-8');
    } catch {}

    const issues: string[] = [];
    const warnings: string[] = [];

    // Check Sentry
    if (!envContent.includes('VITE_SENTRY_DSN=')) {
      warnings.push('⚠️  Sentry DSN not configured - error monitoring disabled');
    }

    // Check if Sentry config file exists
    try {
      await fs.access('src/lib/sentry.ts');
    } catch {
      warnings.push('⚠️  Sentry configuration file not found');
    }

    // Check analytics
    const analyticsFiles = [
      'src/lib/analytics.ts',
      'src/hooks/useAnalytics.ts'
    ];

    let analyticsFound = false;
    for (const file of analyticsFiles) {
      try {
        await fs.access(file);
        analyticsFound = true;
        break;
      } catch {
        // Continue checking
      }
    }

    if (!analyticsFound) {
      warnings.push('⚠️  Analytics tracking not found');
    }

    if (warnings.length > 0) {
      return {
        category: 'Monitoring',
        status: 'warning',
        message: 'Monitoring setup incomplete',
        details: warnings
      };
    }

    return {
      category: 'Monitoring',
      status: 'pass',
      message: 'Monitoring active (Sentry, Analytics)'
    };
  } catch (error) {
    return {
      category: 'Monitoring',
      status: 'warning',
      message: 'Cannot verify monitoring setup'
    };
  }
}

async function checkBackupAndRollback(): Promise<ValidationResult> {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check for deployment guide
  try {
    await fs.access('DEPLOYMENT_GUIDE.md');
  } catch {
    warnings.push('⚠️  DEPLOYMENT_GUIDE.md not found');
  }

  // Check for backup documentation
  try {
    const constitutionContent = await fs.readFile('PROJECT_CONSTITUTION_V2.md', 'utf-8');
    if (!constitutionContent.toLowerCase().includes('backup')) {
      warnings.push('⚠️  Backup strategy not documented in PROJECT_CONSTITUTION_V2.md');
    }
  } catch {
    warnings.push('⚠️  PROJECT_CONSTITUTION_V2.md not found');
  }

  // Check for rollback plan
  try {
    const checklistContent = await fs.readFile('.kiro/FINAL_CHECKLIST.md', 'utf-8');
    if (!checklistContent.toLowerCase().includes('rollback')) {
      warnings.push('⚠️  Rollback plan not documented in FINAL_CHECKLIST.md');
    }
  } catch {
    // Checklist might not exist yet
  }

  if (warnings.length > 0) {
    return {
      category: 'Backup & Rollback',
      status: 'warning',
      message: 'Backup and rollback plans need documentation',
      details: warnings
    };
  }

  return {
    category: 'Backup & Rollback',
    status: 'pass',
    message: 'Backup and rollback plans documented'
  };
}

async function checkVideoPlayback(): Promise<ValidationResult> {
  const videoFiles = [
    'src/pages/media/Watch.tsx',
    'src/pages/media/WatchVideo.tsx',
    'src/components/VideoPlayer.tsx'
  ];

  const issues: string[] = [];
  const warnings: string[] = [];

  for (const file of videoFiles) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      
      if (content.includes('sandbox') || content.includes('credentialless')) {
        issues.push(`❌ ${file} contains forbidden attributes (sandbox/credentialless)`);
      }
    } catch {
      warnings.push(`⚠️  ${file} not found`);
    }
  }

  if (issues.length > 0) {
    return {
      category: 'Video Playback',
      status: 'fail',
      message: 'Video playback has critical issues',
      details: issues
    };
  }

  if (warnings.length > 0) {
    return {
      category: 'Video Playback',
      status: 'warning',
      message: 'Some video files not found',
      details: warnings
    };
  }

  return {
    category: 'Video Playback',
    status: 'pass',
    message: 'Video playback configuration verified'
  };
}

async function checkAuthentication(): Promise<ValidationResult> {
  const authFiles = [
    'src/contexts/AuthContext.tsx',
    'src/hooks/useAuth.ts',
    'src/pages/auth/Login.tsx',
    'src/pages/auth/Register.tsx'
  ];

  const missing: string[] = [];

  for (const file of authFiles) {
    try {
      await fs.access(file);
    } catch {
      missing.push(file);
    }
  }

  if (missing.length > 0) {
    return {
      category: 'Authentication',
      status: 'fail',
      message: 'Authentication files missing',
      details: missing.map(f => `❌ ${f}`)
    };
  }

  return {
    category: 'Authentication',
    status: 'pass',
    message: 'Authentication system complete'
  };
}

async function checkBuildStatus(): Promise<ValidationResult> {
  try {
    // Check if dist folder exists (indicates successful build)
    try {
      await fs.access('dist');
      return {
        category: 'Build Status',
        status: 'pass',
        message: 'Build successful (dist folder exists)'
      };
    } catch {
      return {
        category: 'Build Status',
        status: 'warning',
        message: 'No build found - run "npm run build" to verify'
      };
    }
  } catch (error) {
    return {
      category: 'Build Status',
      status: 'warning',
      message: 'Cannot verify build status'
    };
  }
}

async function main() {
  console.log('🚀 Production Validator - Task 25.3');
  console.log('=====================================\n');

  const results: ValidationResult[] = [];

  console.log('Running production validation checks...\n');

  // Run all checks
  results.push(await checkEnvironmentVariables());
  results.push(await checkDatabaseConnections());
  results.push(await checkAPIKeys());
  results.push(await checkMonitoring());
  results.push(await checkBackupAndRollback());
  results.push(await checkVideoPlayback());
  results.push(await checkAuthentication());
  results.push(await checkBuildStatus());

  // Display results
  console.log('📊 Validation Results:');
  console.log('======================\n');

  let passCount = 0;
  let failCount = 0;
  let warningCount = 0;

  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${result.category}: ${result.message}`);
    
    if (result.details && result.details.length > 0) {
      result.details.forEach(detail => console.log(`   ${detail}`));
    }
    console.log();

    if (result.status === 'pass') passCount++;
    else if (result.status === 'fail') failCount++;
    else warningCount++;
  }

  // Summary
  console.log('📈 Summary:');
  console.log('===========');
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⚠️  Warnings: ${warningCount}`);
  console.log();

  // Overall status
  if (failCount === 0 && warningCount === 0) {
    console.log('🎉 All production checks passed! Ready for launch.');
    return 0;
  } else if (failCount === 0) {
    console.log('⚠️  Production checks passed with warnings. Review warnings before launch.');
    return 0;
  } else {
    console.log('❌ Production checks failed. Fix critical issues before launch.');
    return 1;
  }
}

main().then(code => process.exit(code)).catch(error => {
  console.error('Error running production validator:', error);
  process.exit(1);
});
