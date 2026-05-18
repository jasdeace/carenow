import { Alert } from 'react-native';

type Source = 'camera' | 'library';

// Lazy-load the native module so a missing/old build can't crash the
// whole app at import time — only the camera feature degrades.
function getImagePicker(): typeof import('expo-image-picker') | null {
  try {
    return require('expo-image-picker');
  } catch {
    return null;
  }
}

// Returns a data-URI base64 string, or null if cancelled / denied / unavailable.
export async function pickImage(
  source: Source,
  opts: { quality?: number } = {},
): Promise<string | null> {
  const ImagePicker = getImagePicker();
  if (!ImagePicker) {
    Alert.alert('카메라 사용 불가', '앱을 다시 빌드하면 카메라 기능을 사용할 수 있습니다.');
    return null;
  }

  const quality = opts.quality ?? 0.6;
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const common = {
    base64: true,
    quality,
    mediaTypes: ['images'] as any,
  };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(common)
      : await ImagePicker.launchImageLibraryAsync(common);

  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.base64) return null;
  return `data:image/jpeg;base64,${asset.base64}`;
}
