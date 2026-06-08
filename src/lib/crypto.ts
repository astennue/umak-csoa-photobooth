import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || 'umak-csoa-photobooth-encryption-key-2024'
const ALGORITHM = 'aes-256-cbc'

// Derive a consistent 32-byte key using scrypt
function getKey(): Buffer {
  return crypto.scryptSync(ENCRYPTION_KEY, 'umak-csoa-salt', 32)
}

export function encrypt(text: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

export function decrypt(encryptedText: string): string {
  try {
    const key = getKey()
    const parts = encryptedText.split(':')
    if (parts.length !== 2) return ''
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return ''
  }
}
