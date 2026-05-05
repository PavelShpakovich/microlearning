import ru from './messages/ru.json';
import en from './messages/en.json';

export const allMessages = { ru, en } as const;
export type Messages = typeof ru;
export type Namespace = keyof Messages;
export type SupportedLocale = keyof typeof allMessages;

// Backward compatibility — default to ru
export const messages = ru;
