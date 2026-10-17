declare module 'openpgp' {
  export function readKey(options: { armoredKey: string }): Promise<unknown>;
  export function createMessage(options: { text: string }): Promise<unknown>;
  export function encrypt(options: { message: unknown; encryptionKeys: unknown }): Promise<string>;
}