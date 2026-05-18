import * as ImagePicker from 'expo-image-picker';

type Source = 'camera' | 'library';

// Returns a data-URI base64 string, or null if cancelled / denied.
export async function pickImage(
  source: Source,
  opts: { quality?: number } = {},
): Promise<string | null> {
  const quality = opts.quality ?? 0.6;

  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const common = {
    base64: true,
    quality,
    mediaTypes: ['images'] as ImagePicker.MediaType[],
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
