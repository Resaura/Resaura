import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  FileText,
  TrendingUp,
  Users,
  BarChart3,
  Calendar,
  Gauge,
} from 'lucide-react-native';

export default function AdvancedScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalReservations: 0,
    completedReservations: 0,
    totalRevenue: 0,
    totalClients: 0,
  });

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      const { data: reservations } = await supabase
        .from('reservations')
        .select('status, actual_price')
        .eq('user_id', user.id);

      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id);

      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id);

      const completed = reservations?.filter((r: any) => r.status === 'completed') || [];
      const totalRevenue = transactions?.reduce(
        (sum: number, t: any) => sum + Number(t.amount),
        0
      ) || 0;

      setStats({
        totalReservations: reservations?.length || 0,
        completedReservations: completed.length,
        totalRevenue,
        totalClients: clients?.length || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleGenerateInvoice = () => {
    Alert.alert(
      'Génération de facture',
      'La génération automatique de factures PDF sera disponible prochainement',
      [{ text: 'OK' }]
    );
  };

  const handleSendReceipt = () => {
    Alert.alert(
      'Envoi de reçu',
      'L\'envoi automatique de reçus par SMS/WhatsApp sera disponible prochainement',
      [{ text: 'OK' }]
    );
  };

  const handleCalendarSync = () => {
    Alert.alert(
      'Synchronisation',
      'L\'intégration Google Agenda sera disponible prochainement',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fonctions avancées</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistiques de performance</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Calendar size={24} color="#1E3A8A" strokeWidth={2} />
              </View>
              <Text style={styles.statValue}>{stats.totalReservations}</Text>
              <Text style={styles.statLabel}>Réservations totales</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <BarChart3 size={24} color="#10B981" strokeWidth={2} />
              </View>
              <Text style={styles.statValue}>{stats.completedReservations}</Text>
              <Text style={styles.statLabel}>Courses terminées</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <TrendingUp size={24} color="#F59E0B" strokeWidth={2} />
              </View>
              <Text style={styles.statValue}>{stats.totalRevenue.toFixed(0)} €</Text>
              <Text style={styles.statLabel}>Revenu total</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Users size={24} color="#3B82F6" strokeWidth={2} />
              </View>
              <Text style={styles.statValue}>{stats.totalClients}</Text>
              <Text style={styles.statLabel}>Clients actifs</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents et facturation</Text>

          <TouchableOpacity style={styles.featureCard} onPress={handleGenerateInvoice}>
            <View style={styles.featureIconContainer}>
              <FileText size={32} color="#1E3A8A" strokeWidth={2} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Générer une facture PDF</Text>
              <Text style={styles.featureDescription}>
                Créez automatiquement des factures professionnelles
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard} onPress={handleSendReceipt}>
            <View style={styles.featureIconContainer}>
              <FileText size={32} color="#10B981" strokeWidth={2} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Envoyer un reçu</Text>
              <Text style={styles.featureDescription}>
                Envoyez des reçus par SMS ou WhatsApp
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Intégrations</Text>

          <TouchableOpacity style={styles.featureCard} onPress={handleCalendarSync}>
            <View style={styles.featureIconContainer}>
              <Calendar size={32} color="#F59E0B" strokeWidth={2} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Synchroniser Google Agenda</Text>
              <Text style={styles.featureDescription}>
                Synchronisez vos réservations avec Google Calendar
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rentabilité</Text>

          <View style={styles.performanceCard}>
            <Gauge size={64} color="#10B981" strokeWidth={1.5} />
            <Text style={styles.performanceTitle}>Indicateur de performance</Text>
            <View style={styles.gaugeContainer}>
              <View style={styles.gaugeBar}>
                <View
                  style={[
                    styles.gaugeFill,
                    {
                      width: `${Math.min(
                        (stats.completedReservations / Math.max(stats.totalReservations, 1)) *
                          100,
                        100
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.gaugeText}>
                {stats.totalReservations > 0
                  ? Math.round(
                      (stats.completedReservations / stats.totalReservations) * 100
                    )
                  : 0}
                % de courses terminées
              </Text>
            </View>

            <View style={styles.performanceStats}>
              <View style={styles.performanceStat}>
                <Text style={styles.performanceStatLabel}>Revenu moyen</Text>
                <Text style={styles.performanceStatValue}>
                  {stats.completedReservations > 0
                    ? (stats.totalRevenue / stats.completedReservations).toFixed(2)
                    : '0.00'}{' '}
                  €
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dispatch de courses</Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Le système de dispatch et le tableau de bord web seront disponibles
              prochainement pour gérer vos courses et votre équipe.
            </Text>
          </View>
        </View>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#EFF6FF',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    backgroundColor: '#EFF6FF',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  performanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  performanceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 24,
  },
  gaugeContainer: {
    width: '100%',
    marginBottom: 24,
  },
  gaugeBar: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  gaugeFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 6,
  },
  gaugeText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  performanceStats: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 16,
  },
  performanceStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  performanceStatLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  performanceStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
    textAlign: 'center',
  },
}); 