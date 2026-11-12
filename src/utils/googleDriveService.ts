import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton safely
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firebaseAuth = getAuth(firebaseApp);

export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
];

const provider = new GoogleAuthProvider();
DRIVE_SCOPES.forEach((scope) => provider.addScope(scope));

// In-memory token storage only (as strictly mandated by Google Workspace guidelines)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initDriveAuth = (
  onSuccess?: (user: User, token: string) => void,
  onFailure?: () => void
) => {
  return onAuthStateChanged(firebaseAuth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onSuccess) onSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onFailure) onFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onFailure) onFailure();
    }
  });
};

export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(firebaseAuth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not retrieve Google OAuth access token from authentication response.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
};

export const signOutGoogle = async (): Promise<void> => {
  await signOut(firebaseAuth);
  cachedAccessToken = null;
};

export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
}

export const listDriveFiles = async (
  searchTerm = '',
  onlyScreenplays = true
): Promise<DriveFileItem[]> => {
  const token = cachedAccessToken;
  if (!token) throw new Error('Not authenticated with Google Drive. Please sign in first.');

  let q = "trashed = false";
  if (onlyScreenplays) {
    q += " and (name contains '.fdx' or name contains '.fdproject' or name contains '.fountain' or name contains '.pdf' or name contains '.txt' or mimeType = 'text/plain' or mimeType = 'application/xml' or mimeType = 'application/json')";
  }
  if (searchTerm.trim()) {
    q += ` and name contains '${searchTerm.replace(/'/g, "\\'")}'`;
  }

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', q);
  url.searchParams.set('fields', 'files(id, name, mimeType, modifiedTime, size, webViewLink)');
  url.searchParams.set('orderBy', 'modifiedTime desc');
  url.searchParams.set('pageSize', '50');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Google Drive API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return (data.files || []) as DriveFileItem[];
};

export const downloadDriveFile = async (fileId: string): Promise<{ text: string; name: string; mimeType: string }> => {
  const token = cachedAccessToken;
  if (!token) throw new Error('Not authenticated with Google Drive. Please sign in first.');

  // Fetch file metadata
  const metaResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaResp.ok) throw new Error('Failed to retrieve file metadata from Google Drive');
  const metadata = await metaResp.json();

  // Fetch file contents
  const contentResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!contentResp.ok) throw new Error(`Failed to download file contents: ${contentResp.statusText}`);

  const text = await contentResp.text();
  return { text, name: metadata.name || 'Untitled Script', mimeType: metadata.mimeType || 'text/plain' };
};

export const uploadScreenplayToDrive = async (
  filename: string,
  content: string,
  mimeType = 'text/plain',
  description = 'Saved from Final Draft 13 Studio'
): Promise<DriveFileItem> => {
  const token = cachedAccessToken;
  if (!token) throw new Error('Not authenticated with Google Drive. Please sign in first.');

  const metadata = {
    name: filename,
    mimeType: mimeType,
    description: description,
  };

  const boundary = '-------FD_STUDIO_MULTIPART_BOUNDARY_2026';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to upload to Google Drive: ${response.status}`);
  }

  return (await response.json()) as DriveFileItem;
};

// Mandatory confirmation required before mutating an existing file
export const updateDriveFile = async (
  fileId: string,
  content: string,
  mimeType = 'text/plain'
): Promise<DriveFileItem> => {
  const token = cachedAccessToken;
  if (!token) throw new Error('Not authenticated with Google Drive.');

  const response = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,name,mimeType,modifiedTime,size`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mimeType,
      },
      body: content,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to update file in Google Drive: ${response.status}`);
  }

  return (await response.json()) as DriveFileItem;
};

// Mandatory confirmation required before deleting a file
export const deleteDriveFile = async (fileId: string): Promise<void> => {
  const token = cachedAccessToken;
  if (!token) throw new Error('Not authenticated with Google Drive.');

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to delete file from Google Drive: ${response.status}`);
  }
};
