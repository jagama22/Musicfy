import { router, useSegments } from 'expo-router';
import { create } from 'zustand';

export type TabGroup = '(home)' | '(search)' | '(library)';
const TAB_GROUPS: TabGroup[] = ['(home)', '(search)', '(library)'];

/** Última pestaña activa: para navegar desde pantallas fuera de las pestañas (reproductor, cola). */
export const useLastTab = create<{ tab: TabGroup }>(() => ({ tab: '(home)' }));

function currentTab(segments: string[]): TabGroup | undefined {
  return TAB_GROUPS.find((g) => segments.includes(g));
}

/**
 * Navegación «tipo Spotify»: los detalles (álbum, artista…) se abren dentro de la pestaña
 * en la que estás, manteniendo la tab bar y el mini-player.
 */
export function useNav() {
  const segments = useSegments() as string[];
  const inTabs = currentTab(segments);

  const go = (path: string) => {
    const tab = inTabs ?? useLastTab.getState().tab;
    const href = `/(tabs)/${tab}/${path}`;
    if (!inTabs) {
      // Venimos de un modal (reproductor/cola): lo cerramos y navegamos en la pestaña.
      if (router.canDismiss()) router.dismissAll();
      setTimeout(() => router.push(href as never), 50);
    } else {
      router.push(href as never);
    }
  };

  return {
    album: (id?: string) => id && go(`album/${encodeURIComponent(id)}`),
    artist: (id?: string) => id && go(`artist/${encodeURIComponent(id)}`),
    playlist: (id: string) => go(`playlist/${encodeURIComponent(id)}`),
    genre: (name: string) => go(`genre/${encodeURIComponent(name)}`),
    mix: (key: string) => go(`mix/${encodeURIComponent(key)}`),
    liked: () => go('liked'),
    settings: () => router.push('/settings'),
  };
}
