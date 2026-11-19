import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { STORE } from './config';
import { build as localBuild } from './build.json';

const API = 'https://api.github.com/repos/kasterstore/kaster-store-/releases/tags/latest';

// يظهر زر «تحديث التطبيق» عند وجود نسخة أحدث، ويفتح تنزيل الـ APK مباشرة
export default function UpdateBanner() {
  const [info, setInfo] = useState(null);
  const [hide, setHide] = useState(false);

  useEffect(() => {
    let off = false;
    fetch(API, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => r.json())
      .then((rel) => {
        const m = /build\s*(\d+)/i.exec(rel?.body || '');
        const remote = m ? parseInt(m[1], 10) : 0;
        if (!off && remote > localBuild) {
          const notes = String(rel.body).split('\n').slice(1).map((x) => x.trim()).filter(Boolean).slice(0, 4);
          setInfo({ notes });
        }
      })
      .catch(() => {});
    return () => { off = true; };
  }, []);

  if (!info || hide) return null;
  return (
    <View style={s.box}>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>🎉 يتوفر تحديث جديد للتطبيق</Text>
        {info.notes.map((n, i) => <Text key={i} style={s.note}>• {n.replace(/^[-•*]\s*/, '')}</Text>)}
      </View>
      <TouchableOpacity style={s.btn} onPress={() => Linking.openURL(STORE.shareUrl)}>
        <Text style={s.btnTxt}>تحديث التطبيق</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setHide(true)} style={{ padding: 6 }}><Text style={{ color: '#fff', fontSize: 16 }}>✕</Text></TouchableOpacity>
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
