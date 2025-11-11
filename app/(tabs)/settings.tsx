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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Settings as SettingsType, Vehicle } from '@/types/database';
import { User, Car, LogOut, Save, Briefcase } from 'lucide-react-native';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
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
      loadSettings();
      loadVehicle();
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
          price_per_km: data.price_per_km.toString(),
          minimum_fare: data.minimum_fare.toString(),
          dark_mode: data.dark_mode,
          notifications_enabled: data.notifications_enabled,
          language: data.language,
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
          brand: data.brand,
          model: data.model,
          license_plate: data.license_plate,
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
      const { error } = await supabase
        .from('settings')
        .update({
          price_per_km: parseFloat(settingsForm.price_per_km),
          minimum_fare: parseFloat(settingsForm.minimum_fare),
          dark_mode: settingsForm.dark_mode,
          notifications_enabled: settingsForm.notifications_enabled,
          language: settingsForm.language,
        })
        .eq('user_id', user.id);

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
      loadSettings();
      loadVehicle();
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error: any) {
            Alert.alert('Erreur', error.message);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Paramètres</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={20} color="#1E3A8A" strokeWidth={2} />
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
            <View style={styles.infoRow}>
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
            <Briefcase size={20} color="#1E3A8A" strokeWidth={2} />
            <Text style={styles.changeProfessionText}>Changer de métier</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Car size={20} color="#1E3A8A" strokeWidth={2} />
            <Text style={styles.sectionTitle}>Véhicule</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.inputLabel}>Marque</Text>
            <TextInput
              style={styles.input}
              placeholder="Toyota"
              value={vehicleForm.brand}
              onChangeText={(text) =>
                setVehicleForm({ ...vehicleForm, brand: text })
              }
            />

            <Text style={styles.inputLabel}>Modèle</Text>
            <TextInput
              style={styles.input}
              placeholder="Prius"
              value={vehicleForm.model}
              onChangeText={(text) =>
                setVehicleForm({ ...vehicleForm, model: text })
              }
            />

            <Text style={styles.inputLabel}>Plaque d'immatriculation</Text>
            <TextInput
              style={styles.input}
              placeholder="AB-123-CD"
              value={vehicleForm.license_plate}
              onChangeText={(text) =>
                setVehicleForm({ ...vehicleForm, license_plate: text })
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tarifs</Text>

          <View style={styles.card}>
            <Text style={styles.inputLabel}>Prix au kilomètre (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="1.50"
              keyboardType="decimal-pad"
              value={settingsForm.price_per_km}
              onChangeText={(text) =>
                setSettingsForm({ ...settingsForm, price_per_km: text })
              }
            />

            <Text style={styles.inputLabel}>Tarif minimum (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="7.00"
              keyboardType="decimal-pad"
              value={settingsForm.minimum_fare}
              onChangeText={(text) =>
                setSettingsForm({ ...settingsForm, minimum_fare: text })
              }
            />
          </View>
        </View>

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
                trackColor={{ false: '#E2E8F0', true: '#1E3A8A' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveSettings}
          disabled={loading}
        >
          <Save size={20} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.saveButtonText}>
            {loading ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color="#EF4444" strokeWidth={2} />
          <Text style={styles.signOutButtonText}>Déconnexion</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  label: {
    fontSize: 14,
    color: '#64748B',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1E293B',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  switchLabel: {
    fontSize: 16,
    color: '#1E293B',
  },
  changeProfessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  changeProfessionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
