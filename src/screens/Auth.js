import React, { useState } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { themed, useTheme } from '../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../config';
import { useAuth } from '../AuthContext';
import { Btn } from '../ui';

const NAVY = '#1B2B5B';

function Input({ icon, label, secure, ...p }) {
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inWrap, focus && { borderColor: COLORS.primary }]}>
        <Text style={s.inIcon}>{icon}</Text>
        <TextInput
          style={s.input}
          placeholderTextColor={COLORS.muted}
          textAlign="right"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={secure && !show}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          {...p}
        />
        {secure ? (
          <TouchableOpacity onPress={() => setShow(!show)} style={s.eye} accessibilityLabel="إظهار كلمة المرور">
            <Text style={{ fontSize: 17, opacity: show ? 1 : 0.55 }}>👁</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// تسجيل الدخول وإنشاء الحساب (هاتف على اليمين، Gmail على اليسار، وتحتهما تسجيل الدخول)
export default function Auth({ navigation, route }) {
  useTheme();
  const { signIn, signUpEmail, signUpPhone } = useAuth();
  const [mode, setMode] = useState('login'); // phone | email | login
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';

  const pick = (m) => { setMode(m); setErr(''); setId(''); setPw(''); setPw2(''); };

  const submit = async () => {
    setErr('');
    if (!id.trim() || !pw) return setErr('املأ جميع الحقول.');
    if (!isLogin) {
      if (pw.length < 6) return setErr('كلمة المرور 6 أحرف على الأقل.');
      if (pw !== pw2) return setErr('كلمتا المرور غير متطابقتين.');
    }
    setBusy(true);
    const e = isLogin ? await signIn(id, pw) : mode === 'phone' ? await signUpPhone(id, pw) : await signUpEmail(id, pw);
    setBusy(false);
    if (e) return setErr(e);
    if (route.params?.next) navigation.replace(route.params.next);
    else navigation.goBack();
  };

  const Tile = ({ m, icon, label }) => (
    <TouchableOpacity style={[s.tile, mode === m && s.tileOn]} onPress={() => pick(m)} activeOpacity={0.85}>
      <Text style={{ fontSize: 24 }}>{icon}</Text>
      <Text style={[s.tileTxt, mode === m && { color: COLORS.primary }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 30 }}>
          <SafeAreaView edges={['top']} style={s.hero}>
            <TouchableOpacity style={s.close} onPress={() => navigation.goBack()} accessibilityLabel="إغلاق">
              <Text style={{ color: NAVY, fontSize: 15 }}>✕</Text>
            </TouchableOpacity>
            <Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" />
            <Text style={s.hello}>{isLogin ? 'أهلاً بعودتك 👋' : 'أنشئ حسابك في دقيقة'}</Text>
            <Text style={s.helloSub}>{isLogin ? 'سجّل دخولك لمتابعة طلباتك والتواصل مع الدعم' : 'سجّل لتتمكن من الشراء ومتابعة طلباتك'}</Text>
          </SafeAreaView>

          <View style={s.card}>
            <View style={s.tiles}>
              <Tile m="phone" icon="📱" label="إنشاء حساب بالهاتف" />
              <Tile m="email" icon="✉️" label="إنشاء حساب Gmail" />
            </View>
            <TouchableOpacity style={[s.loginBtn, isLogin && s.loginOn]} onPress={() => pick('login')} activeOpacity={0.85}>
              <Text style={[s.loginTxt, isLogin && { color: COLORS.onPrimary }]}>🔑 تسجيل الدخول</Text>
            </TouchableOpacity>

            <Input
              icon={mode === 'phone' ? '📞' : mode === 'email' ? '✉️' : '👤'}
              label={mode === 'phone' ? 'رقم الهاتف' : mode === 'email' ? 'البريد الإلكتروني (Gmail)' : 'البريد الإلكتروني أو رقم الهاتف'}
              value={id}
              onChangeText={setId}
              keyboardType={mode === 'phone' ? 'phone-pad' : mode === 'email' ? 'email-address' : 'default'}
              placeholder={mode === 'phone' ? '07xxxxxxxxx' : mode === 'email' ? 'name@gmail.com' : 'name@gmail.com أو 07xxxxxxxxx'}
            />
            <Input icon="🔒" label="كلمة المرور" secure value={pw} onChangeText={setPw} placeholder="••••••••" />
            {!isLogin ? <Input icon="🔒" label="تأكيد كلمة المرور" secure value={pw2} onChangeText={setPw2} placeholder="••••••••" /> : null}

            {err ? <Text style={s.err}>⚠️ {err}</Text> : null}
            <Btn title={isLogin ? 'دخول' : 'إنشاء الحساب'} onPress={submit} loading={busy} style={{ marginTop: 18, paddingVertical: 16 }} />

            <View style={s.orRow}><View style={s.line} /><Text style={s.orTxt}>أو</Text><View style={s.line} /></View>
            <Btn title="🛍️ تصفّح المتجر كزائر" kind="ghost" onPress={() => navigation.goBack()} style={{ borderColor: COLORS.line }} />

            <Text style={s.terms}>
              بمتابعتك فإنك توافق على{' '}
              <Text style={s.link} onPress={() => navigation.navigate('Legal', { kind: 'terms' })}>شروط الاستخدام</Text>
              {' '}و{' '}
              <Text style={s.link} onPress={() => navigation.navigate('Legal', { kind: 'privacy' })}>سياسة الخصوصية</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = themed(() => ({
  hero: { backgroundColor: '#F5F1E5', alignItems: 'center', paddingBottom: 56, paddingTop: 10, borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  close: { position: 'absolute', top: 14, left: 14, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(27,43,91,0.08)', alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  logo: { width: 190, height: 150, marginTop: 30 },
  hello: { color: NAVY, fontSize: 21, fontWeight: '800', marginTop: 4 },
  helloSub: { color: NAVY, opacity: 0.7, fontSize: 13, marginTop: 4, textAlign: 'center', paddingHorizontal: 24 },
  card: { backgroundColor: COLORS.card, borderRadius: 24, borderWidth: 1, borderColor: COLORS.line, padding: 16, marginHorizontal: 16, marginTop: -34, elevation: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 14, paddingVertical: 12, alignItems: 'center', gap: 4, backgroundColor: COLORS.bg },
  tileOn: { borderColor: COLORS.primary, backgroundColor: COLORS.tint },
  tileTxt: { color: COLORS.dark, fontSize: 12.5, fontWeight: '700', textAlign: 'center' },
  loginBtn: { marginTop: 10, borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 14, paddingVertical: 12, alignItems: 'center', backgroundColor: COLORS.bg },
  loginOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  loginTxt: { color: COLORS.dark, fontWeight: '800', fontSize: 15 },
  label: { textAlign: 'right', color: COLORS.dark, fontWeight: '700', fontSize: 13.5, marginBottom: 6 },
  inWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 14, paddingHorizontal: 12 },
  inIcon: { fontSize: 16, marginLeft: 8, opacity: 0.8 },
  input: { flex: 1, paddingVertical: 13, fontSize: 16, color: COLORS.dark },
  eye: { paddingHorizontal: 6, paddingVertical: 6 },
  err: { color: COLORS.danger, textAlign: 'right', marginTop: 12, fontWeight: '600' },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  line: { flex: 1, height: 1, backgroundColor: COLORS.line },
  orTxt: { color: COLORS.muted, fontSize: 13 },
  terms: { color: COLORS.muted, textAlign: 'center', fontSize: 12, lineHeight: 22, marginTop: 14 },
  link: { color: COLORS.primary, fontWeight: '700' },
}));
