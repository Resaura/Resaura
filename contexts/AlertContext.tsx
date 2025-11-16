import React, { createContext, useContext, useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

const COLORS = {
  appBg: '#001f3b',        // fond global de l'app + fond popup
  azure: '#0de7f4',        // interactif / CTA / bordure
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.55)', // voile derrière la popup
};

type Action = {
  text: string;
  onPress?: () => void;
  // 'primary' = bouton plein azur
  // 'ghost'   = bouton border azur fond transparent (option si un jour tu veux un 2e bouton moins important)
  variant?: 'primary' | 'ghost';
};

type ShowOptions = {
  actions?: Action[];
};

type AlertContextType = {
  show: (title?: string, message?: string, opts?: ShowOptions) => void;
};

const AlertCtx = createContext<AlertContextType | null>(null);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [actions, setActions] = useState<Action[]>([{ text: 'OK', variant: 'primary' }]);

  const show = (t?: string, m?: string, opts?: ShowOptions) => {
    setTitle(t);
    setMessage(m);
    setActions(
      opts?.actions?.length
        ? opts.actions
        : [{ text: 'OK', variant: 'primary' }]
    );
    setVisible(true);
  };

  const onClose = () => setVisible(false);

  const value = useMemo<AlertContextType>(() => ({ show }), []);

  return (
    <AlertCtx.Provider value={value}>
      {children}

      <Modal
        transparent
        animationType="fade"
        visible={visible}
        onRequestClose={onClose}
      >
        {/* Overlay derrière l'alerte */}
        <View style={styles.overlay}>
          {/* Carte d'alerte */}
          <View style={styles.card}>
            {!!title && <Text style={styles.title}>{title}</Text>}
            {!!message && <Text style={styles.message}>{message}</Text>}

            <View style={styles.actions}>
              {actions.map((a, i) => {
                const press = () => {
                  onClose();
                  a.onPress?.();
                };

                // bouton important -> plein azur
                if (a.variant === 'primary' || !a.variant) {
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={press}
                      style={styles.btnPrimary}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.btnPrimaryText}>{a.text}</Text>
                    </TouchableOpacity>
                  );
                }

                // bouton secondaire -> fond transparent, border azur
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={press}
                    style={styles.btnGhost}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.btnGhostText}>{a.text}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AlertCtx.Provider>
  );
}

export function useAppAlert(): AlertContextType {
  const ctx = useContext(AlertCtx);
  if (ctx) return ctx;

  // fallback natif si jamais le provider n'est pas monté
  return {
    show: (title, message, opts) => {
      Alert.alert(
        title || '',
        message || '',
        (opts?.actions || [{ text: 'OK' }]).map((a) => ({
          text: a.text,
          onPress: a.onPress,
        }))
      );
    },
  };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.appBg,      // fond marine foncé opaque
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.azure,          // bordure azur
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
  },
  title: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    color: COLORS.white,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.95,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginTop: 20,
  },

  // Bouton principal = fond azur, texte marine
  btnPrimary: {
    backgroundColor: COLORS.azure,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    minWidth: 100,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: COLORS.appBg,
    fontSize: 14,
    fontWeight: '800',
  },

  // Bouton ghost = fond transparent bordure azur (si un jour tu veux un 2e bouton genre Annuler)
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.azure,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    minWidth: 100,
    alignItems: 'center',
  },
  btnGhostText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
