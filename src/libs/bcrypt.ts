import * as bcrypto from 'bcrypt';

export function encodeSha256(text: string) {
  const salt = bcrypto.genSaltSync(Number(process.env.SALT_ROUNDS));
  return bcrypto.hashSync(text, salt);
}

export function compare(text: string, password: string) {
  return bcrypto.compareSync(text, password);
}
