const CLOUD_NAME = import.meta.env.CLOUDINARY_CLOUD_NAME || '';
const API_KEY = import.meta.env.CLOUDINARY_API_KEY || '';
const API_SECRET = import.meta.env.CLOUDINARY_API_SECRET || '';

export interface UploadResult {
  public_id: string;
  url: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

function generateSignature(params: Record<string, string>, secret: string): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  // Use Web Crypto API for SHA-1 signing
  return sorted + secret;
}

export async function sha1(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function uploadToCloudinary(
  file: File | Blob,
  folder: string = 'simplecube'
): Promise<UploadResult> {
  const timestamp = Math.round(Date.now() / 1000).toString();
  const params: Record<string, string> = {
    folder,
    timestamp,
  };

  const signatureString = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  const signature = await sha1(signatureString + API_SECRET);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  formData.append('timestamp', timestamp);
  formData.append('api_key', API_KEY);
  formData.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Cloudinary upload failed');
  }

  return res.json();
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  const timestamp = Math.round(Date.now() / 1000).toString();
  const params: Record<string, string> = {
    public_id: publicId,
    timestamp,
  };

  const signatureString = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  const signature = await sha1(signatureString + API_SECRET);

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('timestamp', timestamp);
  formData.append('api_key', API_KEY);
  formData.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Cloudinary delete failed');
  }
}

export function getCloudinaryUrl(publicId: string, transforms: string = ''): string {
  if (!CLOUD_NAME) return '';
  const base = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;
  return transforms ? `${base}/${transforms}/${publicId}` : `${base}/${publicId}`;
}

export function isConfigured(): boolean {
  return !!(CLOUD_NAME && API_KEY && API_SECRET);
}
