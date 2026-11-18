import React, { useState } from 'react';
import { View, Text, FlatList, Image, Switch, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { themed, useTheme } from '../theme';
import { COLORS, fmt } from '../config';
import { emojiOf } from '../data';
import { supabase } from '../supabase';
import { useProducts } from '../ProductsContext';
import { Btn, Empty } from '../ui';

export default function ManageProducts({ navigation }) {
  useTheme();
  const { all, reload, removeLocal } = useProducts();
  const [busy, setBusy] = useState(null);

  const toggle = async (p, active) => {
    setBusy(p.id);
    await supabase.from('products').update({ active }).eq('id', p.id);
    await reload();
    setBusy(null);
  };
  const remove = (p) =>
    Alert.alert('حذف المنتج', `ماذا تريد أن تفعل بـ «${p.name}»؟`, [
      { text: 'إلغاء', style: 'cancel' },
      ...(p.active ? [{ text: 'إيقاف النشر فقط', onPress: () => toggle(p, false) }] : []),
      { text: 'حذف نهائي', style: 'destructive', onPress: async () => {
        setBusy(p.id);
        const { data, error } = await supabase.from('products').delete().eq('id', p.id).select('id');
        setBusy(null);
        if (error || !data || data.length === 0) {
          Alert.alert('تعذّر الحذف', error ? error.message : 'لا تملك صلاحية الحذف. شغّل ملف الإعداد في Supabase ثم أعد المحاولة.');
          return;
        }
        removeLocal(p.id);
        reload();
      } },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={s.bar}><Btn title="+ إضافة منتج" onPress={() => navigation.navigate('ProductEditor', {})} /></View>
      <FlatList
        data={all}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
        ListEmptyComponent={<Empty icon="🛍️" text="لا توجد منتجات. اضغط «إضافة منتج» للبدء." />}
        renderItem={({ item: p }) => {
          const img = p.media.find((m) => m.type === 'image');
          return (
            <View style={[s.row, !p.active && { opacity: 0.55 }]}>
              <View style={s.thumb}>{img ? <Image source={{ uri: img.url }} style={{ width: 56, height: 56 }} /> : <Text style={{ fontSize: 28 }}>{emojiOf(p.cat)}</Text>}</View>
              <TouchableOpacity style={{ flex: 1, marginHorizontal: 10 }} onPress={() => navigation.navigate('ProductEditor', { id: p.id })}>
                <Text style={s.name} numberOfLines={1}>{p.name}</Text>
                <Text style={s.sub}>{fmt(p.price)} • {p.media.length} وسائط</Text>
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Switch value={p.active} disabled={busy === p.id} onValueChange={(v) => toggle(p, v)} trackColor={{ true: COLORS.primary }} />
              </View>
              <TouchableOpacity style={s.delBtn} onPress={() => remove(p)}><Text style={s.delTxt}>🗑 حذف</Text></TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const s = themed(() => ({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 10, marginBottom: 10 },
  thumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: COLORS.tint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { textAlign: 'right', fontWeight: '700', color: COLORS.dark },
  sub: { textAlign: 'right', color: COLORS.muted, marginTop: 3, fontSize: 12.5 },
  delBtn: { marginStart: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.danger, backgroundColor: 'rgba(220,38,38,0.08)' },
  delTxt: { color: COLORS.danger, fontWeight: '700', fontSize: 13 },
  bar: { padding: 12, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.line },
}));
