import { User } from './types';

// Helper function to get gendered text based on user's gender
export function getGenderedText(
  user: User | null,
  maleText: string,
  femaleText: string,
  otherText?: string
): string {
  const gender = user?.gender || 'male';
  
  switch (gender) {
    case 'female':
      return femaleText;
    case 'other':
      return otherText || maleText; // fallback to male if other is not provided
    case 'male':
    default:
      return maleText;
  }
}
