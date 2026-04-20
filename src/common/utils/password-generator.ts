import * as generator from 'generate-password';

export function generatePassword() {
  return generator.generate({
    length: 12,
    numbers: true,
    uppercase: true,
    lowercase: true,
    symbols: false,
    strict: true,
  });
}
