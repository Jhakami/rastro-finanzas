import { Buffer } from '@craftzdog/react-native-buffer';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { createCipheriv, randomBytes, pbkdf2Sync } from 'react-native-quick-crypto';
import { getDatabaseKey, openDatabase } from '@/infrastructure/database';

interface BackupEnvelope {
  format: 'rastro-backup';
  version: 1;
  createdAt: string;
  salt: string;
  iv: string;
  tag: string;
  payload: string;
}

export async function createEncryptedBackup(password: string): Promise<void> {
  if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  const db = await openDatabase();
  const database = await db.serializeAsync();
  const databaseKey = await getDatabaseKey();
  const inner = Buffer.from(
    JSON.stringify({ databaseKey, database: Buffer.from(database).toString('base64') }),
    'utf8',
  );
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(password, salt, 120_000, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(inner), cipher.final()]);
  const envelope: BackupEnvelope = {
    format: 'rastro-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    payload: encrypted.toString('base64'),
  };
  const uri = `${FileSystem.cacheDirectory}rastro-${new Date().toISOString().slice(0, 10)}.finbackup`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(envelope), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/octet-stream',
    dialogTitle: 'Guardar copia cifrada',
  });
}
