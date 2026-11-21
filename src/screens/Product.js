import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Linking, PanResponder, useWindowDimensions, StyleSheet } from 'react-native';
import { themed, useTheme } from '../theme';
import { Video, ResizeMode } from 'expo-av';
import { COLORS, fmt } from '../config';
import { CATEGORIES, emojiOf } from '../data';
import { useCart } from '../CartContext';
import { useProducts } from '../ProductsContext';
import { useAuth } from '../AuthContext';
import { Btn } from '../ui';
import ImageViewer from '../ImageViewer';

export default function Product({ route, navigation }) {
  useTheme();
  const { add } = useCart();
  const { all } = useProducts();
  const { isOwner } = useAuth();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [viewIdx, setViewIdx] = useState(null);
  const p = all.find((x) => x.id === route.params.id);
  const cnt = useRef(0);
  cnt.current = p?.media?.length || 0;
  // تقليب الصور يدوياً بالترتيب الصحيح (1 ثم 2 ثم 3...) بدون اعتماد على اتجاه التمرير في الجهاز
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) setPage((x) => Math.min(x + 1, cnt.current - 1));
        else if (g.dx > 40) setPage((x) => Math.max(x - 1, 0));
      },
    })
  ).current;
  if (!p) return null;
  const cat = CATEGORIES.find((c) => c.id === p.cat);
  const media = p.media || [];
  const imgs = media.filter((m) => m.type === 'image').map((m) => m.url);

  return (
    <View style={s.root}>
      <ScrollView>
        {media.length ? (
          <View>
            <View {...swipe.panHandlers}>
              {(() => {
                const m = media[Math.min(page, media.length - 1)];
                return m.type === 'video' ? (
                  <Video key={page} source={{ uri: m.url }} style={{ width, height: width, backgroundColor: '#000' }} useNativeControls resizeMode={ResizeMode.CONTAIN} />
                ) : (
                  <TouchableOpacity activeOpacity={0.95} onPress={() => setViewIdx(Math.max(0, imgs.indexOf(m.url)))}>
                    <Image source={{ uri: m.url }} style={{ width, height: width, backgroundColor: '#fff' }} resizeMode="contain" />
                  </TouchableOpacity>
                );
              })()}
            </View>
            {media.length > 1 ? (
              <>
                <TouchableOpacity style={[s.arrow, { left: 8 }]} disabled={page === 0} onPress={() => setPage((x) => Math.max(0, x - 1))}><Text style={[s.arrowTxt, page === 0 && { opacity: 0.3 }]}>‹</Text></TouchableOpacity>
                <TouchableOpacity style={[s.arrow, { right: 8 }]} disabled={page >= media.length - 1} onPress={() => setPage((x) => Math.min(media.length - 1, x + 1))}><Text style={[s.arrowTxt, page >= media.length - 1 && { opacity: 0.3 }]}>›</Text></TouchableOpacity>
              </>
            ) : null}
            {imgs.length ? (
              <TouchableOpacity style={s.zoomBtn} onPress={() => { const cur = media[Math.min(page, media.length - 1)]; setViewIdx(Math.max(0, imgs.indexOf(cur?.url))); }}><Text style={s.zoomTxt}>🔍 عرض الصورة</Text></TouchableOpacity>
            ) : null}
            {media.length > 1 && <Text style={s.pager}>{page + 1} / {media.length}</Text>}
          </View>
        ) : (
          <View style={s.big}><Text style={{ fontSize: 110 }}>{emojiOf(p.cat)}</Text></View>
        )}

        <View style={s.body}>
          <Text style={s.cat}>{cat?.name}</Text>
          <Text style={s.name}>{p.name}</Text>
          <Text style={s.price}>{fmt(p.price)}</Text>
          {p.oldPrice ? <Text style={s.old}>{fmt(p.oldPrice)}</Text> : null}
          {p.desc ? (<><Text style={s.h}>الوصف</Text><Text style={s.desc}>{p.desc}</Text></>) : null}

          {p.links?.length ? (
            <>
              <Text style={s.h}>روابط</Text>
              {p.links.map((l, i) => (
                <TouchableOpacity key={i} style={s.link} onPress={() => Linking.openURL(l.url).catch(() => {})}>
                  <Text style={s.linkTxt}>🔗 {l.title || l.url}</Text>
                </TouchableOpacity>
              ))}
            </>
          ) : null}

          <Text style={s.cod}>💵 الدفع عند الاستلام • 🚚 توصيل مجاني</Text>
          <Text style={s.swap}>ℹ️ لا توجد خدمة استبدال أو استرجاع</Text>
          {isOwner ? <Btn kind="ghost" title="تعديل المنتج" style={{ marginTop: 12 }} onPress={() => navigation.navigate('ProductEditor', { id: p.id })} /> : null}
        </View>
      </ScrollView>

      <ImageViewer images={imgs} index={viewIdx} onIndex={setViewIdx} onClose={() => setViewIdx(null)} />
      <View style={s.bar}>
        <Btn style={{ flex: 1 }} title="أضف للسلة واذهب للدفع" onPress={() => { add(p); navigation.navigate('Tabs', { screen: 'Cart' }); }} />
        <Btn kind="ghost" title="+ سلة" style={{ paddingHorizontal: 18 }} onPress={() => add(p)} />
      </View>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: COLORS.bg },
  big: { height: 260, backgroundColor: COLORS.tint, alignItems: 'center', justifyContent: 'center' },
  pager: { position: 'absolute', bottom: 10, left: 12, backgroundColor: '#0009', color: '#fff', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden', fontSize: 13 },
  body: { padding: 18 },
  cat: { color: COLORS.muted, textAlign: 'right' },
  name: { fontSize: 22, fontWeight: '800', color: COLORS.dark, textAlign: 'right', marginTop: 4 },
  price: { fontSize: 22, color: COLORS.primary, fontWeight: '800', textAlign: 'right', marginTop: 10 },
  old: { color: COLORS.muted, textDecorationLine: 'line-through', textAlign: 'right' },
  h: { fontSize: 16, fontWeight: '700', textAlign: 'right', marginTop: 18, color: COLORS.dark },
  desc: { color: COLORS.dark, textAlign: 'right', marginTop: 6, lineHeight: 24 },
  link: { backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line, padding: 12, marginTop: 8 },
  linkTxt: { color: COLORS.primary, textAlign: 'right', fontWeight: '600' },
  cod: { marginTop: 18, color: COLORS.primary, textAlign: 'right', fontWeight: '600' },
  arrow: { position: 'absolute', top: '45%', width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  arrowTxt: { color: '#fff', fontSize: 26, fontWeight: '700', lineHeight: 30 },
  zoomBtn: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  zoomTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  swap: { marginTop: 8, color: COLORS.muted, textAlign: 'right', lineHeight: 22 },
  bar: { flexDirection: 'row', padding: 12, backgroundColor: COLORS.card, gap: 10, borderTopWidth: 1, borderTopColor: COLORS.line },
}));
