// app/debug-env.tsx
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { useAppAlert } from '@/contexts/AlertContext';
import { COLORS, RADIUS } from '@/lib/theme';
import 'react-native-url-polyfill/auto';

// Vars d'env (lecture en runtime)
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

type OtaInfo = {
  updateId?: string | null;
  runtimeVersion?: string | null;
  channel?: string | null;
  createdAt?: string | null;
  isEmbeddedLaunch: boolean;
  isEmergencyLaunch: boolean;
  manifestDump?: string;
};

export default function DebugEnv() {
  const [ota, setOta] = useState<OtaInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [netResult, setNetResult] = useState<string | null>(null);
  const router = useRouter();
  const alert = useAppAlert();

  useEffect(() => {
    // Charger les infos OTA actuelles
    const m: any = (Updates as any).manifest ?? (Updates as any).manifest2 ?? null;

    const info: OtaInfo = {
      updateId: Updates.updateId ?? m?.id ?? m?.updateId ?? null,
      runtimeVersion:
        Updates.runtimeVersion ??
        m?.runtimeVersion ??
        m?.extra?.runtimeVersion ??
        null,
      channel:
        (Updates as any).channel ??
        m?.extra?.expoClient?.channel ??
        m?.extra?.channel ??
        null,
      createdAt:
        m?.createdAt ??
        m?.extra?.expoClient?.publishedTime ??
        null,
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
      isEmergencyLaunch: Updates.isEmergencyLaunch,
      manifestDump: safeJson(m),
    };
    setOta(info);
  }, []);

  const onCheckUpdate = async () => {
    setChecking(true);
    try {
      const res = await Updates.checkForUpdateAsync();
      if (res.isAvailable) {
        alert.show('Mise à jour disponible', 'Une mise à jour OTA est disponible.', {
          actions: [{ text: 'Télécharger + Recharger', variant: 'primary', onPress: onFetchReload }],
        });
      } else {
        alert.show('À jour', 'Aucune mise à jour OTA disponible.');
      }
    } catch (e: any) {
      alert.show('Erreur OTA', e?.message ?? 'Échec de la vérification OTA.');
    } finally {
      setChecking(false);
    }
  };

  const onFetchReload = async () => {
    try {
      await Updates.fetchUpdateAsync();
    } catch (e: any) {
      alert.show('Téléchargement OTA', e?.message ?? 'Échec du téléchargement OTA.');
      return;
    }
    // si succès, on recharge l’app sur la nouvelle version
    try {
      await Updates.reloadAsync();
    } catch (e: any) {
      alert.show('Redémarrage OTA', e?.message ?? 'Échec du rechargement.');
    }
  };

  const onTestNetwork = async () => {
    try {
      const ipText = await fetch('https://api.ipify.org?format=json').then(r => r.text());

      let health = 'skip';
      if (SUPABASE_URL && SUPABASE_ANON) {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
          headers: { apikey: SUPABASE_ANON },
        });
        health = `status=${res.status}`;
      }

      const summary =
        `URL: ${SUPABASE_URL ?? 'null'}\n` +
        `Anon length: ${SUPABASE_ANON ? SUPABASE_ANON.length : 0}\n` +
        `ipify: ${ipText}\n` +
        `auth health: ${health}`;

      setNetResult(summary);
      alert.show('ENV / Réseau', summary);
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      setNetResult(`Network error: ${msg}`);
      alert.show('Erreur réseau', msg);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Debug OTA / Environnement</Text>

        {/* Bloc OTA */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Mise à jour actuellement chargée</Text>
          <Row k="updateId" v={ota?.updateId ?? 'n/a'} mono />
          <Row k="runtimeVersion" v={ota?.runtimeVersion ?? 'n/a'} />
          <Row k="channel" v={ota?.channel ?? 'n/a'} />
          <Row k="embedded launch" v={String(ota?.isEmbeddedLaunch ?? false)} />
          <Row k="emergency launch" v={String(ota?.isEmergencyLaunch ?? false)} />
          <Row k="createdAt" v={formatDate(ota?.createdAt)} />
          <View style={styles.actions}>
            <Btn text={checking ? 'Vérification…' : 'Vérifier une MAJ'} onPress={onCheckUpdate} disabled={checking} />
            <Btn text="Télécharger + Recharger" onPress={onFetchReload} />
          </View>
        </View>

        {/* Bloc ENV / Réseau */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>ENV / Réseau</Text>
          <Row k="EXPO_PUBLIC_SUPABASE_URL" v={SUPABASE_URL ?? 'null'} />
          <Row k="ANON length" v={String(SUPABASE_ANON ? SUPABASE_ANON.length : 0)} />
          <View style={styles.actions}>
            <Btn text="Tester réseau / Supabase" onPress={onTestNetwork} />
            <Btn text="Retour" variant="ghost" onPress={() => router.back()} />
          </View>
          {netResult ? <Text style={styles.monoDump}>{netResult}</Text> : null}
        </View>

        {/* Manifest brut (debug) */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Manifest (brut)</Text>
          <Text style={styles.monoDump}>{ota?.manifestDump ?? '—'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ————— helpers UI ————— */

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.key}>{k}</Text>
      <Text style={[styles.val, mono && styles.mono]}>{v}</Text>
    </View>
  );
}

function Btn({
  text,
  onPress,
  disabled,
  variant = 'primary',
}: {
  text: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
}) {
  const buttonStyles: ViewStyle[] = [styles.btn];
  if (variant === 'ghost') buttonStyles.push(styles.btnGhost);
  if (disabled) buttonStyles.push(styles.btnDisabled);
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={buttonStyles}>
      <Text style={variant === 'ghost' ? styles.btnGhostText : styles.btnText}>{text}</Text>
    </TouchableOpacity>
  );
}

/* ————— helpers data ————— */

function safeJson(obj: any) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj ?? '—');
  }
}

function formatDate(input?: string | null) {
  if (!input) return 'n/a';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

/* ————— styles ————— */

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: COLORS.background,
    gap: 16,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS['2xl'],
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },
  cardLabel: {
    color: COLORS.azure,
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  key: { color: COLORS.textMuted },
  val: { color: COLORS.text, flexShrink: 1, textAlign: 'right' },
  mono: { fontFamily: Platform.select({ android: 'monospace', ios: 'Menlo' }) },
  actions: { gap: 10, marginTop: 12 },
  btn: {
    backgroundColor: COLORS.azure,
    paddingVertical: 14,
    borderRadius: RADIUS['2xl'],
    alignItems: 'center',
  },
  btnText: { color: '#003642', fontWeight: '800' },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.azure },
  btnDisabled: { opacity: 0.6 },
  btnGhostText: { color: COLORS.azure, fontWeight: '700' },
  monoDump: { color: COLORS.textMuted, fontSize: 12, marginTop: 8 },
});
