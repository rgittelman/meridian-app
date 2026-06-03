import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Derives display initials from a full name.
 * "Ryan Gittelman" → "RG"
 * "Ryan"           → "R"
 * null / ""        → null  (caller renders "M" fallback)
 */
export function deriveInitials(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const words = trimmed.split(/\s+/);
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

type MeridianProfileState = {
  /** Display name — seeded from Google auth on first hydration, user-editable in future phases */
  displayName: string | null;
  /** Google profile photo URL — null in J.1; populated in J.2+ without new scopes */
  avatarUrl: string | null;
  /** Derived from displayName — stored so initials survive offline */
  initials: string | null;

  /**
   * Write-once seed from Google auth state.
   * No-op if displayName is already set — never overwrites an existing value.
   * Safe to call multiple times (idempotent).
   */
  seedFromAuth: (authDisplayName: string | null) => void;
};

export const useProfileStore = create<MeridianProfileState>()(
  persist(
    (set, get) => ({
      displayName: null,
      avatarUrl: null,
      initials: null,

      seedFromAuth: (authDisplayName) => {
        // Write-once: never overwrite a value that's already been set
        if (get().displayName !== null) return;
        if (!authDisplayName) return;

        set({
          displayName: authDisplayName,
          initials: deriveInitials(authDisplayName),
        });
      },
    }),
    {
      name: 'meridian.profile',
      storage: createJSONStorage(() => AsyncStorage),
      // avatarUrl excluded from persist until J.2+ populates it meaningfully
      partialize: (state) => ({
        displayName: state.displayName,
        avatarUrl: state.avatarUrl,
        initials: state.initials,
      }),
    },
  ),
);
