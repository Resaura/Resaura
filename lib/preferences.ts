import AsyncStorage from '@react-native-async-storage/async-storage';

const GOOGLE_REVIEW_MESSAGE_KEY = 'google_review_message';
export const DEFAULT_GOOGLE_REVIEW_MESSAGE = 'Bonjour, merci d’avoir voyagé avec nous ! Pouvez-vous laisser votre avis ici : https://g.page/r/resaura';

export async function getGoogleReviewMessage() {
  try {
    const stored = await AsyncStorage.getItem(GOOGLE_REVIEW_MESSAGE_KEY);
    return stored?.trim() ? stored : DEFAULT_GOOGLE_REVIEW_MESSAGE;
  } catch {
    return DEFAULT_GOOGLE_REVIEW_MESSAGE;
  }
}

export async function setGoogleReviewMessage(message: string) {
  const value = message?.trim() || DEFAULT_GOOGLE_REVIEW_MESSAGE;
  await AsyncStorage.setItem(GOOGLE_REVIEW_MESSAGE_KEY, value);
}
