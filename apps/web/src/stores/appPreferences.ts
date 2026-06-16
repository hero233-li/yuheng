import { create } from 'zustand';

export type MenuTabMode = 'single' | 'multi';
export type ThemeMode = 'light' | 'dark';
export type LayoutDensity = 'comfortable' | 'compact';
export type TableSize = 'small' | 'middle' | 'large';
export type CardShadow = 'none' | 'light' | 'strong';

interface AppPreferences {
  themeMode: ThemeMode;
  primaryColor: string;
  layoutDensity: LayoutDensity;
  contentWidth: number;
  contentPadding: number;
  pageGap: number;
  fontSize: number;
  borderRadius: number;
  headerHeight: number;
  siderWidth: number;
  siderCollapsed: boolean;
  tableSize: TableSize;
  cardShadow: CardShadow;
  menuTabModes: Record<string, MenuTabMode>;
  setThemeMode: (themeMode: ThemeMode) => void;
  setPrimaryColor: (primaryColor: string) => void;
  setLayoutDensity: (layoutDensity: LayoutDensity) => void;
  setContentWidth: (contentWidth: number) => void;
  setContentPadding: (contentPadding: number) => void;
  setPageGap: (pageGap: number) => void;
  setFontSize: (fontSize: number) => void;
  setBorderRadius: (borderRadius: number) => void;
  setHeaderHeight: (headerHeight: number) => void;
  setSiderWidth: (siderWidth: number) => void;
  setSiderCollapsed: (siderCollapsed: boolean) => void;
  setTableSize: (tableSize: TableSize) => void;
  setCardShadow: (cardShadow: CardShadow) => void;
  setMenuTabMode: (path: string, menuTabMode: MenuTabMode) => void;
}

const STORAGE_KEY = 'automation_app_preferences';

const defaultPreferences = {
  themeMode: 'light' as ThemeMode,
  primaryColor: '#1677ff',
  layoutDensity: 'comfortable' as LayoutDensity,
  contentWidth: 100,
  contentPadding: 12,
  pageGap: 12,
  fontSize: 14,
  borderRadius: 6,
  headerHeight: 72,
  siderWidth: 220,
  siderCollapsed: false,
  tableSize: 'middle' as TableSize,
  cardShadow: 'none' as CardShadow,
  menuTabModes: {
    '/product-apply': 'single' as MenuTabMode,
    '/search-form-2': 'single' as MenuTabMode,
    '/reset-password': 'single' as MenuTabMode,
    '/multi-task-table': 'single' as MenuTabMode,
    '/grouped-card-search': 'single' as MenuTabMode,
    '/personal-center': 'single' as MenuTabMode,
    '/menu-two/overview': 'single' as MenuTabMode,
    '/system-settings': 'single' as MenuTabMode,
  },
};

function readPreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultPreferences, ...JSON.parse(raw) } : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

function writePreferences(preferences: Pick<AppPreferences, 'themeMode' | 'primaryColor' | 'layoutDensity' | 'contentWidth' | 'contentPadding' | 'pageGap' | 'fontSize' | 'borderRadius' | 'headerHeight' | 'siderWidth' | 'siderCollapsed' | 'tableSize' | 'cardShadow' | 'menuTabModes'>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export const useAppPreferences = create<AppPreferences>((set, get) => ({
  ...readPreferences(),
  setThemeMode: (themeMode) => {
    const next = { ...get(), themeMode };
    writePreferences(next);
    set({ themeMode });
  },
  setPrimaryColor: (primaryColor) => {
    const next = { ...get(), primaryColor };
    writePreferences(next);
    set({ primaryColor });
  },
  setLayoutDensity: (layoutDensity) => {
    const next = { ...get(), layoutDensity };
    writePreferences(next);
    set({ layoutDensity });
  },
  setContentWidth: (contentWidth) => {
    const next = { ...get(), contentWidth };
    writePreferences(next);
    set({ contentWidth });
  },
  setContentPadding: (contentPadding) => {
    const next = { ...get(), contentPadding };
    writePreferences(next);
    set({ contentPadding });
  },
  setPageGap: (pageGap) => {
    const next = { ...get(), pageGap };
    writePreferences(next);
    set({ pageGap });
  },
  setFontSize: (fontSize) => {
    const next = { ...get(), fontSize };
    writePreferences(next);
    set({ fontSize });
  },
  setBorderRadius: (borderRadius) => {
    const next = { ...get(), borderRadius };
    writePreferences(next);
    set({ borderRadius });
  },
  setHeaderHeight: (headerHeight) => {
    const next = { ...get(), headerHeight };
    writePreferences(next);
    set({ headerHeight });
  },
  setSiderWidth: (siderWidth) => {
    const next = { ...get(), siderWidth };
    writePreferences(next);
    set({ siderWidth });
  },
  setSiderCollapsed: (siderCollapsed) => {
    const next = { ...get(), siderCollapsed };
    writePreferences(next);
    set({ siderCollapsed });
  },
  setTableSize: (tableSize) => {
    const next = { ...get(), tableSize };
    writePreferences(next);
    set({ tableSize });
  },
  setCardShadow: (cardShadow) => {
    const next = { ...get(), cardShadow };
    writePreferences(next);
    set({ cardShadow });
  },
  setMenuTabMode: (path, menuTabMode) => {
    const nextModes = { ...get().menuTabModes, [path]: menuTabMode };
    const next = { ...get(), menuTabModes: nextModes };
    writePreferences(next);
    set({ menuTabModes: nextModes });
  },
}));
