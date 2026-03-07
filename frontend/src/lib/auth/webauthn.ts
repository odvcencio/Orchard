'use client';

type JsonObject = Record<string, unknown>;

export interface CreatedPasskeyCredential {
  id: string;
  rawId: string;
  type: string;
  authenticatorAttachment: string | null;
  response: {
    clientDataJSON: string;
    attestationObject: string;
  };
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
}

export interface PasskeyAssertion {
  id: string;
  rawId: string;
  type: string;
  authenticatorAttachment: string | null;
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle: string | null;
  };
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null;
}

function asObject(value: unknown, label: string): JsonObject {
  if (!isObject(value)) {
    throw new Error(`invalid ${label} in WebAuthn options`);
  }
  return value;
}

function getPublicKeyOptions(options: unknown): JsonObject {
  const root = asObject(options, 'options');
  if (root.publicKey === undefined) return { ...root };
  return { ...asObject(root.publicKey, 'publicKey') };
}

function decodeBase64URL(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = pad === 0 ? normalized : normalized + '='.repeat(4 - pad);
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function encodeBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let raw = '';
  for (let i = 0; i < bytes.length; i += 1) raw += String.fromCharCode(bytes[i]);
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function toBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (typeof value === 'string') return decodeBase64URL(value);
  throw new Error('invalid binary value in WebAuthn options');
}

export function browserSupportsPasskeys(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined';
}

function toCreationOptions(options: unknown): PublicKeyCredentialCreationOptions {
  const publicKey = getPublicKeyOptions(options);
  publicKey.challenge = toBytes(publicKey.challenge);

  if (isObject(publicKey.user) && publicKey.user.id !== undefined) {
    publicKey.user = {
      ...publicKey.user,
      id: toBytes(publicKey.user.id),
    };
  }

  if (Array.isArray(publicKey.excludeCredentials)) {
    publicKey.excludeCredentials = publicKey.excludeCredentials.map((credential, index) => {
      const item = asObject(credential, `excludeCredentials[${index}]`);
      return {
        ...item,
        id: toBytes(item.id),
      };
    });
  }

  return publicKey as unknown as PublicKeyCredentialCreationOptions;
}

function toRequestOptions(options: unknown): PublicKeyCredentialRequestOptions {
  const publicKey = getPublicKeyOptions(options);
  publicKey.challenge = toBytes(publicKey.challenge);

  if (Array.isArray(publicKey.allowCredentials)) {
    publicKey.allowCredentials = publicKey.allowCredentials.map((credential, index) => {
      const item = asObject(credential, `allowCredentials[${index}]`);
      return {
        ...item,
        id: toBytes(item.id),
      };
    });
  }

  return publicKey as unknown as PublicKeyCredentialRequestOptions;
}

export async function createPasskeyCredential(options: unknown): Promise<CreatedPasskeyCredential> {
  const credential = (await navigator.credentials.create({
    publicKey: toCreationOptions(options),
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error('passkey creation was cancelled');

  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: encodeBase64URL(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    response: {
      clientDataJSON: encodeBase64URL(response.clientDataJSON),
      attestationObject: encodeBase64URL(response.attestationObject),
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}

export async function getPasskeyAssertion(options: unknown): Promise<PasskeyAssertion> {
  const credential = (await navigator.credentials.get({
    publicKey: toRequestOptions(options),
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error('passkey sign-in was cancelled');

  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: encodeBase64URL(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    response: {
      clientDataJSON: encodeBase64URL(response.clientDataJSON),
      authenticatorData: encodeBase64URL(response.authenticatorData),
      signature: encodeBase64URL(response.signature),
      userHandle: response.userHandle ? encodeBase64URL(response.userHandle) : null,
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}
