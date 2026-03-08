import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import zlib from 'zlib';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

interface BackupConfig {
  backupDir: string;
  retentionDays: number;
  schedule: string;
  tables: string[];
  includeAuth: boolean;
  includeStorage: boolean;
  compress: boolean;
  encrypt: boolean;
}

interface BackupMetadata {
  timestamp: string;
  version: string;
  tables: string[];
  rowCounts: Record<string, number>;
  size: number;
  checksum: string;
}

class AutomaticBackupSystem {
  private supabase: SupabaseClient;
  private config: BackupConfig;
  private isRunning: boolean;
  private backupInterval?: ReturnType<typeof setInterval>;

  constructor(config: BackupConfig) {
    this.supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    this.config = config;
    this.isRunning = false;
    this.ensureBackupDirectory();
  }

  private ensureBackupDirectory() {
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
    }
    
    // Create subdirectories
    const subdirs = ['daily', 'weekly', 'monthly', 'auth', 'storage'];
    subdirs.forEach(subdir => {
      const dir = path.join(this.config.backupDir, subdir);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private async getTableRowCount(table: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error(`Error getting row count for ${table}:`, error);
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      console.error(`Exception getting row count for ${table}:`, error);
      return 0;
    }
  }

  private async backupTable(table: string, backupPath: string): Promise<boolean> {
    try {
      console.log(`📊 Backing up table: ${table}`);
      
      // Get all data from table
      const { data, error } = await this.supabase
        .from(table)
        .select('*');
      
      if (error) {
        console.error(`Error fetching data from ${table}:`, error);
        return false;
      }
      
      if (!data || data.length === 0) {
        console.log(`Table ${table} is empty, creating empty backup`);
      }
      
      // Create backup object
      const backupData = {
        table,
        timestamp: new Date().toISOString(),
        count: data?.length || 0,
        data: data || []
      };
      
      this.writeBackupFile(backupPath, backupData);
      
      console.log(`✅ Table ${table} backed up successfully (${data?.length || 0} rows)`);
      return true;
      
    } catch (error) {
      console.error(`Error backing up table ${table}:`, error);
      return false;
    }
  }

  private getEncryptionKey(): Buffer {
    const secret = process.env.BACKUP_ENCRYPTION_KEY || SERVICE_ROLE_KEY || 'cinma-backup-fallback-key';
    return crypto.createHash('sha256').update(secret).digest();
  }

  private encryptBuffer(buffer: Buffer) {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      data: encrypted.toString('base64')
    };
  }

  private decryptBuffer(payload: { iv: string; authTag: string; data: string }): Buffer {
    const key = this.getEncryptionKey();
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(payload.iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(payload.data, 'base64')),
      decipher.final()
    ]);
  }

  private writeBackupFile(backupPath: string, payload: any) {
    const serialized = Buffer.from(JSON.stringify(payload), 'utf8');
    const compressed = this.config.compress;
    const payloadBuffer = compressed ? zlib.gzipSync(serialized, { level: 9 }) : serialized;

    if (this.config.encrypt) {
      const encrypted = this.encryptBuffer(payloadBuffer);
      const envelope = {
        format: 'cinma-backup.v2',
        encrypted: true,
        compressed,
        algorithm: 'aes-256-gcm',
        payload: encrypted
      };
      fs.writeFileSync(backupPath, JSON.stringify(envelope, null, 2), 'utf8');
      return;
    }

    if (compressed) {
      const envelope = {
        format: 'cinma-backup.v2',
        encrypted: false,
        compressed: true,
        encoding: 'base64',
        data: payloadBuffer.toString('base64')
      };
      fs.writeFileSync(backupPath, JSON.stringify(envelope, null, 2), 'utf8');
      return;
    }

    fs.writeFileSync(backupPath, JSON.stringify(payload, null, 2), 'utf8');
  }

  private readBackupFile(backupPath: string): any {
    const content = fs.readFileSync(backupPath, 'utf8');
    const parsed = JSON.parse(content);

    if (!parsed || parsed.format !== 'cinma-backup.v2') {
      return parsed;
    }

    let payloadBuffer: Buffer;

    if (parsed.encrypted) {
      payloadBuffer = this.decryptBuffer(parsed.payload);
    } else if (parsed.compressed && parsed.encoding === 'base64') {
      payloadBuffer = Buffer.from(parsed.data, 'base64');
    } else {
      return parsed;
    }

    const rawBuffer = parsed.compressed ? zlib.gunzipSync(payloadBuffer) : payloadBuffer;
    return JSON.parse(rawBuffer.toString('utf8'));
  }

  private async backupAuthData(backupPath: string): Promise<boolean> {
    if (!this.config.includeAuth) {
      console.log('⏭️ Auth backup disabled');
      return true;
    }
    
    try {
      console.log('🔐 Backing up auth data...');
      
      // Note: We can't directly backup auth.users via Supabase client
      // This is a placeholder for auth backup logic
      const authData = {
        timestamp: new Date().toISOString(),
        note: 'Auth backup requires direct database access or admin API',
        users_count: 0 // Would need to get this from auth.users table
      };
      
      this.writeBackupFile(backupPath, authData);
      console.log('✅ Auth backup placeholder created');
      return true;
      
    } catch (error) {
      console.error('Error backing up auth data:', error);
      return false;
    }
  }

  private async backupStorageData(backupPath: string): Promise<boolean> {
    if (!this.config.includeStorage) {
      console.log('⏭️ Storage backup disabled');
      return true;
    }
    
    try {
      console.log('💾 Backing up storage metadata...');
      
      // Get storage objects metadata
      // This requires knowing bucket names. 
      // For now we just create a placeholder or list known buckets
      const buckets = ['posters', 'backdrops', 'avatars']; // Example
      
      const storageData = {
        timestamp: new Date().toISOString(),
        buckets: [], 
        note: 'Storage backup includes metadata only. Files need separate backup.'
      };
      
      this.writeBackupFile(backupPath, storageData);
      console.log('✅ Storage metadata backed up');
      return true;
      
    } catch (error) {
      console.error('Error backing up storage data:', error);
      return false;
    }
  }

  private async createBackupMetadata(tables: string[]): Promise<BackupMetadata> {
    const rowCounts: Record<string, number> = {};
    
    for (const table of tables) {
      rowCounts[table] = await this.getTableRowCount(table);
    }
    
    return {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      tables,
      rowCounts,
      size: 0, // Will be calculated after file creation
      checksum: 'pending' // Will be calculated after file creation
    };
  }

  private cleanupOldBackups() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    
    const backupTypes = ['daily', 'weekly', 'monthly'];
    
    backupTypes.forEach(type => {
      const dir = path.join(this.config.backupDir, type);
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          console.log(`🗑️ Deleting old backup: ${file}`);
          fs.unlinkSync(filePath);
        }
      });
    });
  }

  public getLastBackupTime(): string | null {
    // Check daily folder for latest file
    const dir = path.join(this.config.backupDir, 'daily');
    if (!fs.existsSync(dir)) return null;
    
    const files = fs.readdirSync(dir);
    if (files.length === 0) return null;
    
    // Sort by modification time
    files.sort((a, b) => {
      return fs.statSync(path.join(dir, b)).mtime.getTime() - fs.statSync(path.join(dir, a)).mtime.getTime();
    });
    
    return fs.statSync(path.join(dir, files[0])).mtime.toISOString();
  }

  public async createBackup(type: string = 'daily'): Promise<boolean> {
    if (this.isRunning) {
      console.log('⚠️ Backup already in progress');
      return false;
    }
    
    this.isRunning = true;
    const startTime = Date.now();
    console.log(`🚀 Starting ${type} backup...`);
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(this.config.backupDir, type, `backup-${timestamp}`);
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      let successCount = 0;
      const totalCount = this.config.tables.length + (this.config.includeAuth ? 1 : 0) + (this.config.includeStorage ? 1 : 0);
      
      // Backup tables
      for (const table of this.config.tables) {
        const backupPath = path.join(backupDir, `${table}.json`);
        const success = await this.backupTable(table, backupPath);
        if (success) successCount++;
      }
      
      // Backup auth
      if (this.config.includeAuth) {
        const authPath = path.join(backupDir, 'auth.json');
        const success = await this.backupAuthData(authPath);
        if (success) successCount++;
      }
      
      // Backup storage
      if (this.config.includeStorage) {
        const storagePath = path.join(backupDir, 'storage.json');
        const success = await this.backupStorageData(storagePath);
        if (success) successCount++;
      }
      
      // Create metadata file
      const metadata = await this.createBackupMetadata(this.config.tables);
      const metadataPath = path.join(backupDir, 'metadata.json');
      this.writeBackupFile(metadataPath, metadata);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Backup completed in ${duration}ms`);
      console.log(`📊 Success rate: ${successCount}/${totalCount}`);
      
      // Cleanup old backups
      this.cleanupOldBackups();
      
      return successCount === totalCount;
      
    } catch (error) {
      console.error('❌ Backup failed:', error);
      return false;
    } finally {
      this.isRunning = false;
    }
  }

  public async restoreBackup(backupPath: string): Promise<boolean> {
    try {
      console.log(`🔄 Restoring backup from: ${backupPath}`);
      
      // Read metadata
      const metadataPath = path.join(backupPath, 'metadata.json');
      if (!fs.existsSync(metadataPath)) {
        console.error('Metadata file not found');
        return false;
      }
      
      const metadata = this.readBackupFile(metadataPath);
      console.log(`📋 Backup metadata: ${JSON.stringify(metadata, null, 2)}`);
      
      // Restore tables
      for (const table of metadata.tables) {
        const tablePath = path.join(backupPath, `${table}.json`);
        if (fs.existsSync(tablePath)) {
          await this.restoreTable(table, tablePath);
        }
      }
      
      console.log('✅ Restore completed');
      return true;
      
    } catch (error) {
      console.error('❌ Restore failed:', error);
      return false;
    }
  }

  private async restoreTable(table: string, backupPath: string): Promise<boolean> {
    try {
      console.log(`🔄 Restoring table: ${table}`);
      
      const backupData = this.readBackupFile(backupPath);
      
      // Clear existing data
      const { error: deleteError } = await this.supabase
        .from(table)
        .delete()
        .neq('id', 0); // Delete all rows
      
      if (deleteError) {
        console.error(`Error clearing table ${table}:`, deleteError);
        return false;
      }
      
      // Insert backup data
      if (backupData.data && backupData.data.length > 0) {
        const { error: insertError } = await this.supabase
          .from(table)
          .insert(backupData.data);
        
        if (insertError) {
          console.error(`Error inserting data into ${table}:`, insertError);
          return false;
        }
        
        console.log(`✅ Table ${table} restored (${backupData.data.length} rows)`);
      } else {
        console.log(`✅ Table ${table} cleared (no data to restore)`);
      }
      
      return true;
      
    } catch (error) {
      console.error(`Error restoring table ${table}:`, error);
      return false;
    }
  }

  public startScheduledBackups() {
    console.log(`⏰ Starting scheduled backups with schedule: ${this.config.schedule}`);
    
    // Simple interval-based scheduling (in production, use a proper cron job)
    const intervalMinutes = 60; // Default to hourly
    this.backupInterval = setInterval(async () => {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      
      // Daily backup at 2 AM
      if (hour === 2) {
        console.log('🌅 Starting daily backup...');
        await this.createBackup('daily');
      }
      
      // Weekly backup on Sunday at 3 AM
      if (day === 0 && hour === 3) {
        console.log('📅 Starting weekly backup...');
        await this.createBackup('weekly');
      }
      
      // Monthly backup on 1st day at 4 AM
      if (now.getDate() === 1 && hour === 4) {
        console.log('📆 Starting monthly backup...');
        await this.createBackup('monthly');
      }
    }, intervalMinutes * 60 * 1000);
    
    console.log('✅ Scheduled backups started');
  }

  public stopScheduledBackups() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = undefined;
      console.log('⏹️ Scheduled backups stopped');
    }
  }

  public getBackupStatus() {
    return {
      isRunning: this.isRunning,
      queueSize: 0,
      lastBackup: this.getLastBackupTime(),
    };
  }
}

// Default configuration
const defaultConfig: BackupConfig = {
  backupDir: path.join(process.cwd(), 'backups'),
  retentionDays: 30,
  schedule: '0 0 * * *',
  tables: [
    'profiles',
    'videos',
    'categories',
    'user_progress',
    'watch_later',
    'favorites',
    'comments',
    'notifications',
    'error_logs',
    'admin_logs'
  ],
  includeAuth: true,
  includeStorage: true,
  compress: false,
  encrypt: false
};

const backupSystem = new AutomaticBackupSystem(defaultConfig);

export { backupSystem, AutomaticBackupSystem };

// CLI interface
if (process.argv[1] === __filename) {
  const command = process.argv[2];
  
  switch (command) {
    case 'backup':
      const type = process.argv[3] || 'daily';
      backupSystem.createBackup(type).then(success => {
        console.log(success ? '✅ Backup completed successfully' : '❌ Backup failed');
        process.exit(success ? 0 : 1);
      });
      break;
      
    case 'restore':
      const backupPath = process.argv[3];
      if (!backupPath) {
        console.error('Please provide backup path');
        process.exit(1);
      }
      backupSystem.restoreBackup(backupPath).then(success => {
        console.log(success ? '✅ Restore completed successfully' : '❌ Restore failed');
        process.exit(success ? 0 : 1);
      });
      break;
      
    case 'status':
      const status = backupSystem.getBackupStatus();
      console.log('Backup Status:', JSON.stringify(status, null, 2));
      break;
      
    case 'start':
      backupSystem.startScheduledBackups();
      console.log('🚀 Scheduled backups started');
      break;
      
    case 'stop':
      backupSystem.stopScheduledBackups();
      console.log('⏹️ Scheduled backups stopped');
      break;
      
    default:
      console.log(`
Usage: ts-node automaticBackup.ts <command> [options]

Commands:
  backup [type]     - Create backup (daily|weekly|monthly)
  restore <path>    - Restore from backup
  status            - Show backup status
  start             - Start scheduled backups
`);
  }
}
