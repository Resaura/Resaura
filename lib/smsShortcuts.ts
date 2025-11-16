import AsyncStorage from '@react-native-async-storage/async-storage';

export type SmsShortcut = {
  id: string;
  label: string;
  body: string;
  channel?: 'sms' | 'whatsapp';
};

const STORAGE_KEY = 'driver_sms_shortcuts_v1';

const DEFAULT_SHORTCUTS: SmsShortcut[] = [
  {
    id: 'arrival',
    label: 'Message d’arrivée',
    body: 'Bonjour, je suis arrivé à votre adresse. Je vous attends devant.',
    channel: 'sms',
  },
  {
    id: 'tracking',
    label: 'Lien de suivi',
    body: 'Votre chauffeur est en route. Suivez ma progression : {tracking_url}',
    channel: 'sms',
  },
];

function mergeDefaults(saved: SmsShortcut[]) {
  const map = new Map(saved.map((item) => [item.id, item]));
  DEFAULT_SHORTCUTS.forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
}

export async function getSmsShortcuts(): Promise<SmsShortcut[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SHORTCUTS;
    }
    const parsed = JSON.parse(raw) as SmsShortcut[];
    return mergeDefaults(parsed);
  } catch {
    return DEFAULT_SHORTCUTS;
  }
}

export async function saveSmsShortcuts(shortcuts: SmsShortcut[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
}

export function getDefaultSmsShortcuts() {
  return DEFAULT_SHORTCUTS;
}
