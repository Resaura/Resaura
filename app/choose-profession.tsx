import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ProfessionModule } from '@/types/database';
import { Car, Scissors, Home, Sparkles } from 'lucide-react-native';

const professionIcons: Record<string, any> = {
  taxi_vtc: Car,
  coiffeur: Scissors,
  loueur: Home,
  estheticien: Sparkles,
};

export default function ChooseProfessionScreen() {
  const [professions, setProfessions] = useState<ProfessionModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadProfessions();
  }, []);

  const loadProfessions = async () => {
    try {
      const { data, error } = await supabase
        .from('profession_modules')
        .select('*')
        .eq('is_active', true)
        .order('display_name');

      if (error) throw error;
      setProfessions(data || []);
    } catch (error) {
      console.error('Error loading professions:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectProfession = async (professionName: string) => {
    if (!user) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ profession: professionName })
        .eq('id', user.id);

      if (error) throw error;

      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error updating profession:', error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choisissez votre métier</Text>
        <Text style={styles.subtitle}>
          Sélectionnez votre profession pour accéder aux outils adaptés
        </Text>
      </View>

      <View style={styles.professionsGrid}>
        {professions.map((profession) => {
          const Icon = professionIcons[profession.name] || Car;
          const isAvailable = profession.name === 'taxi_vtc';

          return (
            <TouchableOpacity
              key={profession.id}
              style={[
                styles.professionCard,
                !isAvailable && styles.professionCardDisabled,
              ]}
              onPress={() => isAvailable && selectProfession(profession.name)}
              disabled={!isAvailable || updating}
            >
              <View style={styles.iconContainer}>
                <Icon
                  size={48}
                  color={isAvailable ? '#1E3A8A' : '#94A3B8'}
                  strokeWidth={2}
                />
              </View>
              <Text
                style={[
                  styles.professionName,
                  !isAvailable && styles.professionNameDisabled,
                ]}
              >
                {profession.display_name}
              </Text>
              {!isAvailable && (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Bientôt disponible</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {updating && (
        <View style={styles.updatingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
  },
  professionsGrid: {
    padding: 24,
    gap: 16,
  },
  professionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  professionCardDisabled: {
    opacity: 0.6,
  },
  iconContainer: {
    marginBottom: 16,
  },
  professionName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  professionNameDisabled: {
    color: '#94A3B8',
  },
  comingSoonBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  updatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
