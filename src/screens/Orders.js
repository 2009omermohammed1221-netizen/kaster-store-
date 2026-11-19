import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Modal, TextInput, TouchableOpacity, RefreshControl, Alert, StyleSheet } from 'react-native';
import { themed, useTheme } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, STATUS, STATUS_KEYS, fmt, fmtDate } from '../config';
import { supabase } from '../supabase';
import { useAuth } from '../AuthContext';
import { notify } from '../notifications';
import { Btn, Chip, Empty } from '../ui';

const short = (id) => String(id).slice(-6).toUpperCase();

export default function Orders({ navigation }) {
  useTheme();
  const { session, isOwner } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!session) return;
    const ch = supabase.channel('orders-rt-' + session.user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session, load]);

  const setStatus = async (order, status, why) => {
    const { error } = await supabase
      .from('orders')
      .update({ status, reject_reason: status === 'rejected' ? why : null, updated_at: new Date().toISOString() })
      .eq('id', order.id);
    if (!error) {
      setOrders((cur) => cur.map((o) => (o.id === order.id ? { ...o, status, reject_reason: status === 'rejected' ? why : null } : o)));
      notify({ type: 'order_status', ref_id: order.id });
    }
  };

  const removeOrders = async (ids) => {
    const { data, error } = await supabase.from('orders').delete().in('id', ids).select('id');
    if (error || !data || data.length === 0) {
      Alert.alert('تعذّر الحذف', error ? error.message : 'لا تملك صلاحية الحذف.');
      return;
    }
    setOrders((cur) => cur.filter((o) => !ids.includes(o.id)));
  };

  const confirmDelete = (order) => {
    Alert.alert('حذف الطلب', `هل تريد حذف الطلب #${short(order.id)} نهائياً؟ لا يمكن التراجع.`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => removeOrders([order.id]) },
    ]);
  };

  const confirmClearDone = () => {
    const ids = orders.filter((o) => o.status === 'delivered' || o.status === 'rejected').map((o) => o.id);
    if (!ids.length) { Alert.alert('لا توجد طلبات منتهية', 'لا يوجد طلبات «تم التوصيل» أو «تم الرفض» لحذفها.'); return; }
    Alert.alert('حذف الطلبات المنتهية', `سيتم حذف ${ids.length} طلب (تم التوصيل / تم الرفض) نهائياً. هل أنت متأكد؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => removeOrders(ids) },
    ]);
  };

  const choose = (order, status) => {
    if (order.status === status) return;
    if (status === 'rejected') { setReason(''); setRejecting(order); }
    else setStatus(order, status);
  };

  if (!session) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <Text style={s.title}>طلباتي</Text>
        <Empty icon="📦" text="سجّل دخولك لتتابع طلباتك" action="تسجيل الدخول" onAction={() => navigation.navigate('Auth')} />
      </SafeAreaView>
    );
  }

  const list = isOwner && filter !== 'all' ? orders.filter((o) => o.status === filter) : orders;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Text style={s.title}>{isOwner ? 'جميع الطلبات' : 'طلباتي'}</Text>
      {isOwner ? (
        <View style={s.filters}>
          <Chip label="الكل" on={filter === 'all'} onPress={() => setFilter('all')} />
          {STATUS_KEYS.map((k) => <Chip key={k} label={STATUS[k].label} on={filter === k} onPress={() => setFilter(k)} color={STATUS[k].color} />)}
        </View>
      ) : null}
      {isOwner && orders.some((o) => o.status === 'delivered' || o.status === 'rejected') ? (
        <TouchableOpacity style={s.clear} onPress={confirmClearDone}>
          <Text style={s.delTxt}>🗑 حذف الطلبات المنتهية (تم التوصيل / تم الرفض)</Text>
        </TouchableOpacity>
      ) : null}

      <FlatList
        data={list}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={<Empty icon="📦" text={isOwner ? 'لا توجد طلبات' : 'لا توجد طلبات بعد'} />}
        renderItem={({ item: o }) => {
          const st = STATUS[o.status] || STATUS.pending;
          return (
            <View style={s.card}>
              <View style={s.head}>
                <Text style={s.num}>طلب #{short(o.id)}</Text>
                <Text style={[s.pill, { color: st.color, backgroundColor: st.bg }]}>{st.label}</Text>
              </View>
              <Text style={s.date}>{fmtDate(o.created_at)}</Text>

              {o.items.map((it, i) => (
                <Text key={i} style={s.item}>• {it.name} × {it.qty} — {fmt(it.price * it.qty)}</Text>
              ))}
              <Text style={s.total}>الإجمالي: {fmt(o.total)} (الدفع عند الاستلام)</Text>

              {isOwner ? (
                <View style={s.box}>
                  <Text style={s.line}>👤 {o.full_name}</Text>
                  <Text style={s.line}>📞 {o.phone}{o.phone2 ? `  /  ${o.phone2}` : ''}</Text>
                  <Text style={s.line}>📍 {o.governorate} - {o.area}</Text>
                  <Text style={s.line}>🧭 {o.landmark}</Text>
                  {o.notes ? <Text style={s.line}>📝 {o.notes}</Text> : null}
                </View>
              ) : null}

              {o.status === 'rejected' && o.reject_reason ? (
                <View style={s.reject}><Text style={s.rejectTxt}>سبب الرفض: {o.reject_reason}</Text></View>
              ) : null}

              {isOwner ? (
                <View style={s.statuses}>
                  {STATUS_KEYS.map((k) => (
                    <Chip key={k} label={STATUS[k].label} on={o.status === k} color={STATUS[k].color} onPress={() => choose(o, k)} />
                  ))}
                </View>
              ) : null}

              {isOwner ? (
                <TouchableOpacity style={s.del} onPress={() => confirmDelete(o)}>
                  <Text style={s.delTxt}>🗑 حذف هذا الطلب</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        }}
      />

      <Modal visible={!!rejecting} transparent animationType="fade" onRequestClose={() => setRejecting(null)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.mTitle}>سبب رفض الطلب</Text>
            <TextInput style={s.mInput} multiline value={reason} onChangeText={setReason} placeholder="اكتب السبب الذي سيراه الزبون" placeholderTextColor={COLORS.muted} textAlign="right" />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Btn title="تأكيد الرفض" kind="danger" style={{ flex: 1 }} disabled={!reason.trim()} onPress={() => { setStatus(rejecting, 'rejected', reason.trim()); setRejecting(null); }} />
              <Btn title="إلغاء" kind="ghost" style={{ flex: 1 }} onPress={() => setRejecting(null)} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.dark, textAlign: 'right', paddingHorizontal: 16, paddingVertical: 12 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingBottom: 4 },
  card: { backgroundColor: COLORS.card, borderRadius: 20, shadowColor: '#14213D', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2, padding: 14, marginBottom: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  num: { fontWeight: '800', fontSize: 15, color: COLORS.dark },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, overflow: 'hidden', fontWeight: '700', fontSize: 13.5 },
  date: { color: COLORS.muted, textAlign: 'right', fontSize: 13, marginTop: 2, marginBottom: 8 },
  item: { textAlign: 'right', color: COLORS.dark, marginVertical: 1 },
  total: { textAlign: 'right', fontWeight: '800', color: COLORS.primary, marginTop: 8 },
  box: { backgroundColor: COLORS.bg, borderRadius: 10, padding: 10, marginTop: 10, gap: 3 },
  line: { textAlign: 'right', color: COLORS.dark },
  reject: { backgroundColor: COLORS.dangerBg, borderRadius: 10, padding: 10, marginTop: 10 },
  rejectTxt: { color: COLORS.dangerInk, textAlign: 'right', fontWeight: '600' },
  del: { alignSelf: 'flex-end', marginTop: 12, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: COLORS.dangerBg },
  delTxt: { color: COLORS.dangerInk, fontWeight: '700', fontSize: 14 },
  clear: { alignSelf: 'flex-end', marginHorizontal: 12, marginBottom: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: COLORS.dangerBg },
  statuses: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  overlay: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16 },
  mTitle: { fontWeight: '800', fontSize: 17, textAlign: 'right', color: COLORS.dark, marginBottom: 10 },
  mInput: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 12, minHeight: 90, textAlignVertical: 'top', color: COLORS.dark },
}));
