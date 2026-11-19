import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Image, TouchableOpacity, PanResponder, useWindowDimensions, StyleSheet } from 'react-native';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (t) => Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);

// عارض صور بملء الشاشة: تكبير/تصغير بالإصبعين أو بالأزرار، سحب لتحريك الصورة، نقر مزدوج للتكبير
export default function ImageViewer({ images, index, onClose, onIndex }) {
  const { width, height } = useWindowDimensions();
  const [v, setV] = useState({ s: 1, x: 0, y: 0 });
  const cur = useRef({ s: 1, x: 0, y: 0 });
  const g = useRef({ pinch: 0, base: null, last: 0 });
  const visible = index != null;

  const set = (n) => { cur.current = n; setV(n); };
  const reset = () => set({ s: 1, x: 0, y: 0 });
  useEffect(() => { reset(); }, [index]);

  const zoomBy = (f) => {
    const s = clamp(cur.current.s * f, 1, 5);
    set(s === 1 ? { s: 1, x: 0, y: 0 } : { ...cur.current, s });
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { g.current.pinch = 0; g.current.base = { ...cur.current }; },
      onPanResponderMove: (e, gs) => {
        const t = e.nativeEvent.touches;
        if (t.length >= 2) {
          const d = dist(t);
          if (!g.current.pinch) { g.current.pinch = d; g.current.base = { ...cur.current }; }
          const s = clamp(g.current.base.s * (d / g.current.pinch), 1, 5);
          set({ ...cur.current, s });
        } else if (cur.current.s > 1) {
          const b = g.current.base;
          const lim = (cur.current.s - 1) * 0.5;
          set({ s: cur.current.s, x: clamp(b.x + gs.dx, -width * lim, width * lim), y: clamp(b.y + gs.dy, -height * lim, height * lim) });
        }
      },
      onPanResponderRelease: (e, gs) => {
        if (Math.abs(gs.dx) < 6 && Math.abs(gs.dy) < 6) {
          const now = Date.now();
          if (now - g.current.last < 300) { cur.current.s > 1 ? reset() : set({ s: 2.5, x: 0, y: 0 }); g.current.last = 0; }
          else g.current.last = now;
        }
      },
    })
  ).current;

  if (!visible) return null;
  const n = images.length;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.root}>
        <View style={s.stage} {...pan.panHandlers}>
          <Image
            source={{ uri: images[index] }}
            style={{ width, height: height * 0.8, transform: [{ translateX: v.x }, { translateY: v.y }, { scale: v.s }] }}
            resizeMode="contain"
          />
        </View>
        <View style={s.top}>
          <TouchableOpacity style={s.btn} onPress={onClose}><Text style={s.btnTxt}>✕</Text></TouchableOpacity>
          {n > 1 ? <Text style={s.count}>{index + 1} / {n}</Text> : <View />}
        </View>
        {n > 1 ? (
          <>
            <TouchableOpacity style={[s.nav, { left: 10 }]} onPress={() => onIndex((index - 1 + n) % n)}><Text style={s.btnTxt}>‹</Text></TouchableOpacity>
            <TouchableOpacity style={[s.nav, { right: 10 }]} onPress={() => onIndex((index + 1) % n)}><Text style={s.btnTxt}>›</Text></TouchableOpacity>
          </>
        ) : null}
        <View style={s.bottom}>
          <TouchableOpacity style={s.zoom} onPress={() => zoomBy(1 / 1.5)}><Text style={s.zoomTxt}>−</Text></TouchableOpacity>
          <TouchableOpacity style={s.zoomSm} onPress={reset}><Text style={s.zoomSmTxt}>{Math.round(v.s * 100)}%</Text></TouchableOpacity>
          <TouchableOpacity style={s.zoom} onPress={() => zoomBy(1.5)}><Text style={s.zoomTxt}>+</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  top: { position: 'absolute', top: 40, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  btn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#fff', fontSize: 24, fontWeight: '700' },
  count: { color: '#fff', fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, overflow: 'hidden' },
  nav: { position: 'absolute', top: '45%', width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', bottom: 40, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 14 },
  zoom: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#E98B2A', alignItems: 'center', justifyContent: 'center' },
  zoomTxt: { color: '#fff', fontSize: 30, fontWeight: '800', lineHeight: 34 },
  zoomSm: { minWidth: 64, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center' },
  zoomSmTxt: { color: '#fff', fontWeight: '700' },
});
