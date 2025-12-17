import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits

/**
 * Generate a random cipher key for room encryption
 * @returns Hex-encoded cipher key
 */
export function generateCipherKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Encrypt a message using AES-256-CBC
 * @param message - Plain text message to encrypt
 * @param keyHex - Hex-encoded cipher key
 * @returns Encrypted message in format: iv:encryptedData (both hex-encoded)
 */
export function encryptMessage(message: string, keyHex: string): string {
  // Convert hex key to buffer
  const key = Buffer.from(keyHex, 'hex');
  
  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // Encrypt message
  let encrypted = cipher.update(message, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return IV and encrypted data separated by colon
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a message using AES-256-CBC
 * @param encryptedMessage - Encrypted message in format: iv:encryptedData
 * @param keyHex - Hex-encoded cipher key
 * @returns Decrypted plain text message
 */
export function decryptMessage(encryptedMessage: string, keyHex: string): string {
  // Split IV and encrypted data
  const parts = encryptedMessage.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted message format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedData = parts[1];
  
  // Convert hex key to buffer
  const key = Buffer.from(keyHex, 'hex');
  
  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  // Decrypt message
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
