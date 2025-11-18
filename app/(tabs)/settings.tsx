import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Settings as SettingsType, Vehicle } from '@/types/database';
import { User, Car, LogOut, Save, Briefcase, Maximize2 } from 'lucide-react-native';
import { useDisplaySettings } from '@/contexts/DisplayContext';
import { useSwipeTabsNavigation } from '@/hooks/useSwipeTabsNavigation';

const C = {
  bg: '#001f3b',
  card: '#022647',
  cardSoft: '#01152b',
  border: '#0b3259',
  text: '#ffffff',
  textMut: '#9fbfd9',
  accent: '#0de7f4',
  danger: '#f97373',
};

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { immersive, setImmersive } = useDisplaySettings();

  const safeBottom = (insets.bottom || 0) + 8;
  const safeTop = Math.max(60, insets.top + 20);
  const swipeHandlers = useSwipeTabsNavigation('settings');

  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);

  const [vehicleForm, setVehicleForm] = useState({
    brand: '',
    model: '',
    license_plate: '',
  });

  const [settingsForm, setSettingsForm] = useState({
    price_per_km: '1.50',
    minimum_fare: '7.00',
    dark_mode: false,
    notifications_enabled: true,
    language: 'fr',
  });

  useEffect(() => {
    if (user) {
      void loadSettings();
      void loadVehicle();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setSettingsForm({
          price_per_km: data.price_per_km?.toString() ?? '1.50',
          minimum_fare: data.minimum_fare?.toString() ?? '7.00',
          dark_mode: !!data.dark_mode,
          notifications_enabled: !!data.notifications_enabled,
          language: data.language ?? 'fr',
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadVehicle = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setVehicle(data);
        setVehicleForm({
          brand: data.brand ?? '',
          model: data.model ?? '',
          license_plate: data.license_plate ?? '',
        });
      }
    } catch (error) {
      console.error('Error loading vehicle:', error);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const payload = {
        user_id: user.id,
        price_per_km: parseFloat(settingsForm.price_per_km) || 0,
        minimum_fare: parseFloat(settingsForm.minimum_fare) || 0,
        dark_mode: settingsForm.dark_mode,
        notifications_enabled: settingsForm.notifications_enabled,
        language: settingsForm.language,
      };

      // upsert pour garantir qu’une ligne existe
      const { error } = await supabase.from('settings').upsert(payload, {
        onConflict: 'user_id',
      });

      if (error) throw error;

      if (vehicle) {
        const { error: vehicleError } = await supabase
          .from('vehicles')
          .update(vehicleForm)
          .eq('id', vehicle.id);

        if (vehicleError) throw vehicleError;
      } else if (vehicleForm.brand && vehicleForm.model && vehicleForm.license_plate) {
        const { error: vehicleError } = await supabase.from('vehicles').insert({
          user_id: user.id,
          ...vehicleForm,
        });

        if (vehicleError) throw vehicleError;
      }

      Alert.alert('Succès', 'Paramètres sauvegardés');
      void loadSettings();
      void loadVehicle();
    } catch (error: any) {
      Alert.alert('Erreur', error.message ?? 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error: any) {
            Alert.alert('Erreur', error.message ?? 'Impossible de se déconnecter.');
          }
        },
      },
    ]);
  };

  return (
    <View {...swipeHandlers} style={[styles.container, { paddingBottom: safeBottom }]}>
      <View style={[styles.header, { paddingTop: safeTop }]}>
        <Text style={styles.title}>Paramètres</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: safeBottom + 24 }}
      >
        {/* Profil utilisateur */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={20} color={C.accent} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Profil utilisateur</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Nom complet</Text>
              <Text style={styles.value}>
                {user?.first_name} {user?.last_name}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{user?.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Téléphone</Text>
              <Text style={styles.value}>{user?.phone}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.label}>Métier</Text>
              <Text style={styles.value}>
                {user?.profession === 'taxi_vtc' ? 'Taxi / VTC' : user?.profession}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.changeProfessionButton}
            onPress={() => router.push('/choose-profession')}
          >
            <Briefcase size={20} color={C.accent} strokeWidth={2} />
            <Text style={styles.changeProfessionText}>Changer de métier</Text>
          </TouchableOpacity>
        </View>

        {/* Affichage */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Maximize2 size={20} color={C.accent} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Affichage</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Mode plein écran (immersif)</Text>
              <Switch
                value={immersive}
                onValueChange={(value) => {
                  void setImmersive(value);
                }}
                trackColor={{ false: '#1e2b45', true: C.accent }}
                thumbColor="#ffffff"
              />
            </View>
            <Text style={styles.helperText}>
              Masque les boutons système Android. Glissez depuis le bas pour les afficher
              temporairement.
            </Text>
          </View>
        </View>

        {/* Véhicule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Car size={20} color={C.accent} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Véhicule</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.inputLabel}>Marque</Text>
            <TextInput
              style={styles.input}
              placeholder="Toyota"
              placeholderTextColor={C.textMut}
              value={vehicleForm.brand}
              onChangeText={(text) => setVehicleForm({ ...vehicleForm, brand: text })}
            />

            <Text style={styles.inputLabel}>Modèle</Text>
            <TextInput
              style={styles.input}
              placeholder="Prius"
              placeholderTextColor={C.textMut}
              value={vehicleForm.model}
              onChangeText={(text) => setVehicleForm({ ...vehicleForm, model: text })}
            />

            <Text style={styles.inputLabel}>Plaque d'immatriculation</Text>
            <TextInput
              style={styles.input}
              placeholder="AB-123-CD"
              placeholderTextColor={C.textMut}
              value={vehicleForm.license_plate}
              onChangeText={(text) =>
                setVehicleForm({ ...vehicleForm, license_plate: text })
              }
            />
          </View>
        </View>

        {/* Tarifs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tarifs</Text>

          <View style={styles.card}>
            <Text style={styles.inputLabel}>Prix au kilomètre</Text>
            <TextInput
              style={styles.input}
              placeholder="1.50"
              placeholderTextColor={C.textMut}
              keyboardType="decimal-pad"
              value={settingsForm.price_per_km}
              onChangeText={(text) =>
                setSettingsForm({ ...settingsForm, price_per_km: text })
              }
            />

            <Text style={styles.inputLabel}>Tarif minimum</Text>
            <TextInput
              style={styles.input}
              placeholder="7.00"
              placeholderTextColor={C.textMut}
              keyboardType="decimal-pad"
              value={settingsForm.minimum_fare}
              onChangeText={(text) =>
                setSettingsForm({ ...settingsForm, minimum_fare: text })
              }
            />
          </View>
        </View>

        {/* Préférences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Préférences</Text>

          <View style={styles.card}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Notifications</Text>
              <Switch
                value={settingsForm.notifications_enabled}
                onValueChange={(value) =>
                  setSettingsForm({ ...settingsForm, notifications_enabled: value })
                }
                trackColor={{ false: '#1e2b45', true: C.accent }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveSettings}
          disabled={loading}
        >
          <Save size={20} color={C.bg} strokeWidth={2} />
          <Text style={styles.saveButtonText}>
            {loading ? 'Sauvegarde…' : 'Sauvegarder les paramètres'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color={C.danger} strokeWidth={2} />
          <Text style={styles.signOutButtonText}>Déconnexion</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: C.text,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3153',
  },
  label: {
    fontSize: 14,
    color: C.textMut,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textMut,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: C.cardSoft,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: C.text,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 15,
    color: C.text,
  },
  helperText: {
    fontSize: 12,
    color: C.textMut,
    marginTop: 6,
  },
  changeProfessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    backgroundColor: 'transparent',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.accent,
  },
  changeProfessionText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.accent,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    backgroundColor: C.accent,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.bg,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    backgroundColor: C.card,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#4b1b1b',
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.danger,
  },
});
