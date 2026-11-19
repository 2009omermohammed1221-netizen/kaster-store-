import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, Easing, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// شاشة افتتاحية قصيرة: الشعار بالوسط (بنفس مكانه في شاشة النظام) ثم تتلاشى للتطبيق
const BG = '#F5F1E5';

export default function Splash({ onDone }) {
  const out = useRef(new Animated.Value(1)).current;
  const bar = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(bar, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const t = setTimeout(() => {
      Animated.timing(out, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => onDone && onDone());
    }, 450);
    return () => clearTimeout(t);
  }, []);

  const w = bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Animated.View style={[s.root, { opacity: out }]} pointerEvents="auto" onLayout={() => SplashScreen.hideAsync().catch(() => {})}>
      <Image source={require('../../assets/logo.png')} style={s.img} resizeMode="contain" />
      <View style={s.track}><Animated.View style={[s.fill, { width: w }]} /></View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  img: { width: 178, height: 200 },
  track: { position: 'absolute', bottom: 70, width: 140, height: 4, borderRadius: 2, backgroundColor: 'rgba(31,58,110,0.12)', overflow: 'hidden' },
  fill: { height: 4, backgroundColor: '#E98B2A', borderRadius: 2 },
});
