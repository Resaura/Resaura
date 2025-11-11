import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MapPin, Navigation, Phone, MessageCircle } from 'lucide-react-native';

export default function MapScreen() {
  const handleOpenMaps = () => {
    Alert.alert(
      'Navigation',
      'Cette fonctionnalité ouvrira Google Maps ou Waze pour la navigation',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Carte & Navigation</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.mapPlaceholder}>
          <MapPin size={64} color="#CBD5E1" strokeWidth={1.5} />
          <Text style={styles.placeholderText}>
            Carte interactive disponible prochainement
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleOpenMaps}>
            <Navigation size={24} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.buttonText}>Démarrer la navigation</Text>
          </TouchableOpacity>

          <View style={styles.row}>
            <TouchableOpacity style={styles.smallButton}>
              <Phone size={20} color="#1E3A8A" strokeWidth={2} />
              <Text style={styles.smallButtonText}>Appeler</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.smallButton}>
              <MessageCircle size={20} color="#1E3A8A" strokeWidth={2} />
              <Text style={styles.smallButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    padding: 16,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  placeholderText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 16,
  },
  buttonContainer: {
    gap: 12,
    marginTop: 16,
  },
  button: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  smallButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  smallButtonText: {
    color: '#1E3A8A',
    fontSize: 14,
    fontWeight: '600',
  },
});
