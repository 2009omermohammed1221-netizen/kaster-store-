import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORE } from './config';
import { build as localBuild } from './build.json';

const API = 'https://api.github.com/repos/kasterstore/kaster-store-/releases/tags/latest';

// يظهر زر «تحديث التطبيق» عند وجود نسخة أحدث، ويفتح تنزيل الـ APK مباشرة
export default function UpdateBanner() {
  // أعلى رقم نسخة معروف على الخادم (يُحفظ حتى لا يختفي الشريط عند فشل الاتصال)
  const [remote, setRemote] = useState(0);

  useEffect(() => {
    let off = false;
    AsyncStorage.getItem('remote_build').then((v) => { if (!off && v) setRemote(parseInt(v, 10) || 0); }).catch(() => {});
    fetch(API, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => r.json())
      .then((rel) => {
        const m = /build\s*(\d+)/i.exec(rel?.body || '');
        const n = m ? parseInt(m[1], 10) : 0;
        if (n > 0) {
          AsyncStorage.setItem('remote_build', String(n)).catch(() => {});
          if (!off) setRemote(n);
        }
      })
      .catch(() => {});
    return () => { off = true; };
  }, []);

  const info = remote > localBuild;
  const hide = false;
  if (!info || hide) return null;
  return (
    <View style={s.box}>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>🎉 يتوفر تحديث جديد للتطبيق</Text>
      </View>
      <TouchableOpacity style={s.btn} onPress={() => Linking.openURL(STORE.shareUrl)}>
        <Text style={s.btnTxt}>تحديث التطبيق</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1F3A6E', marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 14 },
  title: { color: '#fff', fontWeight: '800', textAlign: 'right', fontSize: 14 },
  note: { color: 'rgba(255,255,255,0.85)', textAlign: 'right', fontSize: 13, marginTop: 3 },
  btn: { backgroundColor: '#E98B2A', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10 },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
