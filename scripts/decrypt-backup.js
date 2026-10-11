// Usage:  BACKUP_KEY="your-key" node scripts/decrypt-backup.js backup-XXXX.enc
const crypto = require("crypto");
const fs = require("fs");

const file = process.argv[2];
if (!file || !process.env.BACKUP_KEY) {
  console.error('Usage: BACKUP_KEY="..." node scripts/decrypt-backup.js <file.enc>');
  process.exit(1);
}
const buf = fs.readFileSync(file);
const key = crypto.createHash("sha256").update(process.env.BACKUP_KEY).digest();
const decipher = crypto.createDecipheriv("aes-256-gcm", key, buf.subarray(0, 12));
decipher.setAuthTag(buf.subarray(12, 28));
const out = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]);
fs.writeFileSync(file.replace(/\.enc$/, ".json"), out);
console.log("Decrypted to", file.replace(/\.enc$/, ".json"));
