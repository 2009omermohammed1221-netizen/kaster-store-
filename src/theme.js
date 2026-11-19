import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LIGHT = {
  primary: '#1F3A6E', onPrimary: '#FFFFFF', dark: '#0B1630', bg: '#F5F7FB', card: '#FFFFFF',
  muted: '#56627F', line: '#DFE4EF', tint: '#EAF0FB',
  danger: '#E5484D', dangerBg: '#FDE4E5', dangerInk: '#C0262B',
  ok: '#1E8E5A', okBg: '#DFF5EA', amber: '#B7791F', amberBg: '#FFF4D6',
  blue: '#1D6FB8', blueBg: '#E1F0FF', accent: '#E98B2A',
};
const DARK = {
  primary: '#7FA6F0', onPrimary: '#0E1730', dark: '#EEF2FB', bg: '#0E1424', card: '#172036',
  muted: '#B3BEDA', line: '#26314D', tint: '#1E2A48',
  danger: '#FF6A6E', dangerBg: '#3A1D22', dangerInk: '#FF8A8E',
  ok: '#4CC38A', okBg: '#16322A', amber: '#F2B85B', amberBg: '#3A2D12',
  blue: '#6DB4F5', blueBg: '#132B42', accent: '#F0A24A',
};

// لون النص الافتراضي يتبع الوضع (حتى لا تظهر نصوص سوداء على خلفية داكنة)
try {
  const origRender = Text.render;
  if (typeof origRender === 'function' && !Text.__themed) {
    Text.__themed = true;
    Text.render = function (...args) {
      const el = origRender.apply(this, args);
      return React.cloneElement(el, { style: [{ color: COLORS.dark, fontSize: 15 }, el.props.style] });
    };
  }
} catch (e) {}

// كائن الألوان الحالي. يتغير عند تبديل الوضع، والشاشات تعيد الرسم عبر useTheme().
export const COLORS = { ...LIGHT };
let version = 0;

export function applyTheme(scheme) {
  Object.assign(COLORS, scheme === 'dark' ? DARK : LIGHT);
  version++;
}

// بديل StyleSheet.create يُعاد حسابه عند تغيّر الوضع
export function themed(factory) {
  let v = -1;
  let cache = {};
  return new Proxy({}, {
    get(_, key) {
      if (v !== version) { cache = StyleSheet.create(factory()); v = version; }
      return cache[key];
    },
  });
}

const Ctx = createContext({ mode: 'system', scheme: 'light', setMode: () => {} });

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState('system'); // system | light | dark
  const [ready, setReady] = useState(false);
  const applied = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem('theme_mode')
      .then((v) => { if (v === 'light' || v === 'dark' || v === 'system') setModeState(v); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const scheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  if (applied.current !== scheme) { applyTheme(scheme); applied.current = scheme; }

  const setMode = (m) => {
    setModeState(m);
    AsyncStorage.setItem('theme_mode', m).catch(() => {});
  };

  if (!ready) return null;
  return <Ctx.Provider value={{ mode, scheme, setMode }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
