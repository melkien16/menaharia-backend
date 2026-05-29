import * as generator from 'generate-password';
import { generatePassword } from './password-generator';

jest.mock('generate-password', () => ({
  generate: jest.fn(() => 'Abcdef123456'),
}));

describe('generatePassword', () => {
  it('uses the expected password policy', () => {
    const result = generatePassword();

    expect(result).toBe('Abcdef123456');
    expect(generator.generate).toHaveBeenCalledWith({
      length: 12,
      numbers: true,
      uppercase: true,
      lowercase: true,
      symbols: false,
      strict: true,
    });
  });
});
