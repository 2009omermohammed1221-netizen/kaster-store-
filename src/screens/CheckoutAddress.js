import React, { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { themed, useTheme } from '../theme';
import { COLORS, STORE, fmt } from '../config';
import { AREAS, GOVERNORATES, searchAreas, norm } from '../areas';
import { supabase } from '../supabase';
import { useCart } from '../CartContext';
import { useAuth } from '../AuthContext';
import { notify } from '../notifications';
import { Btn, Chip, Field } from '../ui';

// الخطوة 2: المحافظة والمنطقة وأقرب نقطة دالة، ثم تأكيد الطلب
export default function CheckoutAddress({ route, navigation }) {
  useTheme();
  const { info } = route.params;
  const { items, subtotal, clear } = useCart();
  const { user, profile, refreshProfile } = useAuth();
  const [gov, setGov] = useState('');
  const [area, setArea] = useState('');
  const [otherArea, setOtherArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [q, setQ] = useState('');
  const [aq, setAq] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const total = subtotal + STORE.deliveryFee;
  const finalArea = area === 'أخرى' ? otherArea.trim() : area;

  const confirm = async () => {
    if (!gov) return setErr('اختر المحافظة.');
    if (!finalArea) return setErr('اختر المنطقة أو اكتبها.');
    if (!landmark.trim()) return setErr('اكتب أقرب نقطة دالة.');
    if (!items.length) return setErr('السلة فارغة.');
    setErr('');
    setBusy(true);
    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        full_name: info.name,
        phone: info.phone,
        phone2: info.phone2 || null,
        notes: info.notes || null,
        governorate: gov,
        area: finalArea,
        landmark: landmark.trim(),
        items: items.map((i) => ({ id: i.product.id, name: i.product.name, qty: i.qty, price: i.product.price })),
        subtotal,
        delivery_fee: STORE.deliveryFee,
        total,
      })
      .select()
      .single();
    if (error) { setBusy(false); return setErr('تعذّر إرسال الطلب: ' + error.message); }

    if (!profile?.full_name) {
      await supabase.from('profiles').update({ full_name: info.name }).eq('id', user.id);
      refreshProfile();
    }
    notify({ type: 'new_order', ref_id: data.id });
    clear();
    setBusy(false);
    // الانتقال فوراً إلى «طلباتي»
    navigation.reset({ index: 0, routes: [{ name: 'Tabs', params: { screen: 'Orders' } }] });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.root} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={s.step}>الخطوة 2 من 2</Text>
        <Text style={s.h}>عنوان التوصيل</Text>

        <Field label="🔍 ابحث عن حي أو منطقة (في كل العراق)" value={q} onChangeText={setQ} placeholder="مثال: الكرادة، الزبير، الحي..." />
        {q.trim() ? (
          <View style={s.results}>
            {searchAreas(q).length ? searchAreas(q).map((r) => (
              <TouchableOpacity key={r.gov + r.area} style={s.res} onPress={() => { setGov(r.gov); setArea(r.area); setQ(''); setAq(''); }}>
                <Text style={s.resTxt}>{r.area}</Text>
                <Text style={s.resGov}>{r.gov}</Text>
              </TouchableOpacity>
            )) : <Text style={s.none}>ما لقيت نتيجة. اختر المحافظة ثم «أخرى» واكتب اسم منطقتك.</Text>}
          </View>
        ) : null}

        <Text style={s.label}>المحافظة *</Text>
        <View style={s.chips}>
          {GOVERNORATES.map((g) => (
            <Chip key={g} label={g} on={gov === g} onPress={() => { setGov(g); setArea(''); }} />
          ))}
        </View>

        {gov ? (
          <>
            <Text style={s.label}>المنطقة أو الحي *</Text>
            <Field value={aq} onChangeText={setAq} placeholder={`ابحث داخل ${gov}...`} />
            <View style={s.chips}>
              {[...AREAS[gov].filter((a) => !aq.trim() || norm(a).includes(norm(aq))), 'أخرى'].map((a) => (
                <Chip key={a} label={a} on={area === a} onPress={() => setArea(a)} />
              ))}
            </View>
            {area === 'أخرى' ? <Field value={otherArea} onChangeText={setOtherArea} placeholder="اكتب اسم المنطقة" /> : null}
          </>
        ) : null}

        <Field label="أقرب نقطة دالة *" value={landmark} onChangeText={setLandmark} placeholder="مثال: قرب جامع ... / مقابل مدرسة ..." />

        <View style={s.sum}>
          <Text style={s.sumTxt}>💵 الدفع عند الاستلام</Text>
          <Text style={s.sumTotal}>الإجمالي: {fmt(total)}{STORE.deliveryFee > 0 ? ` (يشمل التوصيل ${fmt(STORE.deliveryFee)})` : ' (توصيل مجاني 🚚)'}</Text>
        </View>
        {err ? <Text style={s.err}>{err}</Text> : null}
        <Btn title="تأكيد الطلب" onPress={confirm} loading={busy} style={{ marginTop: 14, marginBottom: 30 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: COLORS.bg },
  step: { color: COLORS.muted, textAlign: 'right' },
  h: { fontSize: 20, fontWeight: '800', textAlign: 'right', color: COLORS.dark, marginBottom: 14, marginTop: 2 },
  label: { textAlign: 'right', color: COLORS.dark, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  sum: { backgroundColor: COLORS.card, borderRadius: 20, shadowColor: '#14213D', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2, padding: 14, marginTop: 6 },
  sumTxt: { textAlign: 'right', color: COLORS.primary, fontWeight: '700' },
  sumTotal: { textAlign: 'right', fontWeight: '800', fontSize: 16, marginTop: 6, color: COLORS.dark },
  results: { backgroundColor: COLORS.card, borderRadius: 16, marginBottom: 12, maxHeight: 260, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.line },
  res: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  resTxt: { color: COLORS.dark, fontWeight: '700' },
  resGov: { color: COLORS.muted },
  none: { color: COLORS.muted, textAlign: 'right', padding: 14 },
  err: { color: COLORS.danger, textAlign: 'right', marginTop: 10 },
}));
