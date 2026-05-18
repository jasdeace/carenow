import { Alert } from 'react-native';

type Source = 'camera' | 'library';

// Lazy-load native modules so a missing/old build can't crash the app
// at import time — only the camera feature degrades.
function getImagePicker(): typeof import('expo-image-picker') | null {
  try {
    return require('expo-image-picker');
  } catch {
    return null;
  }
}
function getImageManipulator(): typeof import('expo-image-manipulator') | null {
  try {
    return require('expo-image-manipulator');
  } catch {
    return null;
  }
}

// Returns a data-URI base64 string, or null if cancelled / denied / unavailable.
// The image is ALWAYS downscaled first — a full-res phone photo produces a
// multi-MB base64 string that blocks the JS thread and freezes the app.
export async function pickImage(
  source: Source,
  opts: { quality?: number; maxWidth?: number } = {},
): Promise<string | null> {
  const ImagePicker = getImagePicker();
  const ImageManipulator = getImageManipulator();
  if (!ImagePicker || !ImageManipulator) {
    Alert.alert('카메라 사용 불가', '앱을 다시 빌드하면 카메라 기능을 사용할 수 있습니다.');
    return null;
  }

  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  // Pick the URI only — never ask the picker for base64 (that's the huge string).
  const common = { quality: 1, mediaTypes: ['images'] as any };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(common)
      : await ImagePicker.launchImageLibraryAsync(common);
  if (result.canceled) return null;
  const uri = result.assets?.[0]?.uri;
  if (!uri) return null;

  // Downscale + compress, THEN encode base64 — keeps the payload ~100-300 KB.
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: opts.maxWidth ?? 1280 } }],
    {
      base64: true,
      compress: opts.quality ?? 0.6,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );
  if (!manipulated.base64) return null;
  return `data:image/jpeg;base64,${manipulated.base64}`;
}
