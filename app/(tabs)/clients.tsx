import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  Linking,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Phone, Star, Plus, Edit2 } from 'lucide-react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ClientType = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  is_loyal: boolean;
  courses: number;
};

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function ClientsScreen() {
  const [clients, setClients] = useState<ClientType[]>([]);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [filter, setFilter] = useState<'alpha' | 'loyal' | 'courses'>('alpha');
  const [search, setSearch] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientType | null>(null);
  const [newClient, setNewClient] = useState({ first_name: '', last_name: '', phone: '', email: '' });

  const scrollRef = useRef<ScrollView | null>(null);
  const letterPositionsRef = useRef<Record<string, number>>({});

  const normalizeText = (s: string) => s?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';

  const groupedClients = useMemo(() => {
    let list = [...clients];

    if (filter === 'loyal') {
      list = list.filter((c) => c.is_loyal);
    } else if (filter === 'courses') {
      list = list.sort((a, b) => b.courses - a.courses);
    } else {
      list = list.sort((a, b) => normalizeText(a.last_name).localeCompare(normalizeText(b.last_name)));
    }

    if (search.trim()) {
      const q = normalizeText(search.trim());
      list = list.filter((c) => {
        const fullname = normalizeText(`${c.first_name} ${c.last_name}`);
        return (
          fullname.includes(q) ||
          normalizeText(c.phone || '').includes(q) ||
          normalizeText(c.email || '').includes(q)
        );
      });
    }

    const grouped: Record<string, ClientType[]> = {};
    for (const letter of LETTERS) grouped[letter] = [];
    for (const c of list) {
      const firstLetter = (c.last_name?.[0] || c.first_name?.[0] || '#').toUpperCase();
      const letter = LETTERS.includes(firstLetter) ? firstLetter : '#';
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(c);
    }

    return grouped;
  }, [clients, filter, search]);

  const sections = useMemo(() => {
    const secs: { letter: string; items: ClientType[] }[] = [];
    for (const letter of LETTERS) {
      if (groupedClients[letter] && groupedClients[letter].length > 0) {
        secs.push({ letter, items: groupedClients[letter] });
      }
    }
    if (groupedClients['#'] && groupedClients['#'].length > 0) {
      secs.push({ letter: '#', items: groupedClients['#'] });
    }
    return secs;
  }, [groupedClients]);

  const toggleLoyal = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, is_loyal: !c.is_loyal } : c)));
  };

  const handleCall = async (phone: string) => {
    const phoneUrl = `tel:${phone}`;
    try {
      const supported = await Linking.canOpenURL(phoneUrl);
      if (supported) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application Téléphone sur cet appareil.');
      }
    } catch (err) {
      console.error('call error', err);
      Alert.alert('Erreur', 'Impossible de lancer l\'appel.');
    }
  };

  const handleAddClient = () => {
    // Defensive: dismiss keyboard
    Keyboard.dismiss();

    console.log('handleAddClient called', newClient);
    if (!newClient.first_name.trim() || !newClient.last_name.trim() || !newClient.phone.trim()) {
      Alert.alert('Erreur', 'Prénom, nom et téléphone sont requis.');
      return;
    }
    const entry: ClientType = {
      id: Date.now().toString(),
      first_name: newClient.first_name.trim(),
      last_name: newClient.last_name.trim(),
      phone: newClient.phone.trim(),
      email: newClient.email?.trim() || '',
      is_loyal: false,
      courses: 0,
    };
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setClients((prev) => [...prev, entry]);
    setNewClient({ first_name: '', last_name: '', phone: '', email: '' });
    setAddModalVisible(false);
    Alert.alert('Succès', 'Client ajouté localement.');
    console.log('Client added', entry);
  };

  const openEditModal = (client: ClientType) => {
    setEditingClient({ ...client });
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (!editingClient) return;
    if (!editingClient.first_name.trim() || !editingClient.last_name.trim() || !editingClient.phone.trim()) {
      Alert.alert('Erreur', 'Prénom, nom et téléphone sont requis.');
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setClients((prev) => prev.map((c) => (c.id === editingClient.id ? editingClient : c)));
    setEditModalVisible(false);
    setEditingClient(null);
    Alert.alert('Succès', 'Client modifié localement.');
  };

  const handleLetterPress = (letter: string) => {
    const pos = letterPositionsRef.current[letter];
    if (pos !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({ y: pos - 8, animated: true });
    } else {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const onLayoutSection = (letter: string, y: number) => {
    letterPositionsRef.current[letter] = y;
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedClient((prev) => (prev === id ? null : id));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Clients</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity onPress={() => setFilter('alpha')} style={[styles.filterButton, filter === 'alpha' && styles.filterActive]}>
            <Text style={[styles.filterText, filter === 'alpha' && styles.filterTextActive]}>A → Z</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilter('loyal')} style={[styles.filterButton, filter === 'loyal' && styles.filterActive]}>
            <Text style={[styles.filterText, filter === 'loyal' && styles.filterTextActive]}>Favoris</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilter('courses')} style={[styles.filterButton, filter === 'courses' && styles.filterActive]}>
            <Text style={[styles.filterText, filter === 'courses' && styles.filterTextActive]}>Courses</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom, prénom, téléphone..."
          placeholderTextColor="#9FBFD9"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.addQuickButton} onPress={() => setAddModalVisible(true)}>
          <Plus size={18} color="#0B1E3F" />
        </TouchableOpacity>
      </View>

      {/* Main list */}
      <View style={styles.listWrap}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {sections.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Aucun client. Appuyez sur + pour en ajouter.</Text>
            </View>
          ) : (
            sections.map((sec) => (
              <View
                key={sec.letter}
                onLayout={(e) => {
                  const y = e.nativeEvent.layout.y;
                  onLayoutSection(sec.letter, y);
                }}
              >
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{sec.letter}</Text>
                </View>
                {sec.items.map((client) => (
                  <View key={client.id} style={styles.card}>
                    <TouchableOpacity style={styles.cardHeader} onPress={() => toggleExpand(client.id)}>
                      <Text style={styles.clientName}>
                        {client.first_name} {client.last_name}
                      </Text>
                      <View style={styles.cardActions}>
                        <TouchableOpacity onPress={() => handleCall(client.phone)} style={styles.iconButton}>
                          <Phone size={18} color="#5CE1E6" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => toggleLoyal(client.id)} style={styles.iconButton}>
                          <Star size={18} color={client.is_loyal ? '#2BB5FF' : '#9FBFD9'} fill={client.is_loyal ? '#2BB5FF' : 'none'} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openEditModal(client)} style={styles.iconButton}>
                          <Edit2 size={18} color="#5CE1E6" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>

                    {expandedClient === client.id && (
                      <View style={styles.cardDetails}>
                        <Text style={styles.detailText}>Téléphone: <Text style={styles.boldText}>{client.phone}</Text></Text>
                        {client.email ? <Text style={styles.detailText}>Email: <Text style={styles.boldText}>{client.email}</Text></Text> : null}
                        <Text style={styles.detailText}>Courses: <Text style={styles.boldText}>{client.courses}</Text></Text>
                        <View style={styles.detailButtonsRow}>
                          <TouchableOpacity style={styles.callButton} onPress={() => handleCall(client.phone)}>
                            <Text style={styles.callButtonText}>Appeler</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.modifyInlineButton} onPress={() => openEditModal(client)}>
                            <Text style={styles.modifyInlineText}>Modifier</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>

        {/* Alphabet sidebar */}
        <View style={styles.alphabetSidebar}>
          {LETTERS.map((L) => (
            <TouchableOpacity key={L} onPress={() => handleLetterPress(L)} style={styles.letterTouch}>
              <Text style={styles.letterText}>{L}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Add modal (fixed) */}
      <Modal visible={addModalVisible} transparent animationType="slide" statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Ajouter un client</Text>
              <TextInput
                placeholder="Prénom"
                placeholderTextColor="#9FBFD9"
                style={styles.modalInput}
                value={newClient.first_name}
                onChangeText={(t) => setNewClient((p) => ({ ...p, first_name: t }))}
              />
              <TextInput
                placeholder="Nom"
                placeholderTextColor="#9FBFD9"
                style={styles.modalInput}
                value={newClient.last_name}
                onChangeText={(t) => setNewClient((p) => ({ ...p, last_name: t }))}
              />
              <TextInput
                placeholder="Téléphone"
                placeholderTextColor="#9FBFD9"
                keyboardType="phone-pad"
                style={styles.modalInput}
                value={newClient.phone}
                onChangeText={(t) => setNewClient((p) => ({ ...p, phone: t }))}
              />
              <TextInput
                placeholder="Email (optionnel)"
                placeholderTextColor="#9FBFD9"
                style={styles.modalInput}
                value={newClient.email}
                onChangeText={(t) => setNewClient((p) => ({ ...p, email: t }))}
              />

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity style={styles.saveButton} onPress={handleAddClient} accessibilityLabel="Enregistrer client">
                  <Text style={styles.saveButtonText}>Enregistrer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setAddModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit modal */}
      <Modal visible={editModalVisible} transparent animationType="slide" statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Modifier le client</Text>
              <TextInput
                placeholder="Prénom"
                placeholderTextColor="#9FBFD9"
                style={styles.modalInput}
                value={editingClient?.first_name || ''}
                onChangeText={(t) => setEditingClient((p) => (p ? { ...p, first_name: t } : p))}
              />
              <TextInput
                placeholder="Nom"
                placeholderTextColor="#9FBFD9"
                style={styles.modalInput}
                value={editingClient?.last_name || ''}
                onChangeText={(t) => setEditingClient((p) => (p ? { ...p, last_name: t } : p))}
              />
              <TextInput
                placeholder="Téléphone"
                placeholderTextColor="#9FBFD9"
                keyboardType="phone-pad"
                style={styles.modalInput}
                value={editingClient?.phone || ''}
                onChangeText={(t) => setEditingClient((p) => (p ? { ...p, phone: t } : p))}
              />
              <TextInput
                placeholder="Email (optionnel)"
                placeholderTextColor="#9FBFD9"
                style={styles.modalInput}
                value={editingClient?.email || ''}
                onChangeText={(t) => setEditingClient((p) => (p ? { ...p, email: t } : p))}
              />

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit} accessibilityLabel="Enregistrer modification">
                  <Text style={styles.saveButtonText}>Enregistrer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setEditModalVisible(false);
                    setEditingClient(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1E3F' },
  header: { paddingTop: 40, paddingHorizontal: 18, paddingBottom: 8 },
  title: { fontSize: 24, color: '#FFFFFF', fontWeight: '700', marginBottom: 8 },
  filterRow: { flexDirection: 'row', marginTop: 4 },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#083054',
    borderRadius: 8,
    marginRight: 8,
  },
  filterActive: { backgroundColor: '#5CE1E6' },
  filterText: { color: '#A7CFE8', fontWeight: '600' },
  filterTextActive: { color: '#0B1E3F' },

  searchRow: { flexDirection: 'row', paddingHorizontal: 16, alignItems: 'center', marginBottom: 8 },
  searchInput: {
    flex: 1,
    backgroundColor: '#082038',
    borderRadius: 10,
    padding: 12,
    color: '#E6FBFF',
    fontSize: 14,
  },
  addQuickButton: {
    marginLeft: 8,
    backgroundColor: '#2BB5FF',
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  listWrap: { flex: 1, flexDirection: 'row' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#9FBFD9' },

  sectionHeader: { backgroundColor: 'transparent', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  sectionHeaderText: { color: '#5CE1E6', fontWeight: '700', fontSize: 16 },

  card: {
    backgroundColor: '#082038',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientName: { fontSize: 17, color: '#E6FBFF', fontWeight: '700' },
  cardActions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginLeft: 8, padding: 6 },

  cardDetails: { marginTop: 8, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: '#074057' },
  detailText: { color: '#CFF8FB', marginBottom: 6, fontSize: 14 },
  boldText: { color: '#FFFFFF', fontWeight: '700' },
  detailButtonsRow: { flexDirection: 'row', marginTop: 8 },

  callButton: { backgroundColor: '#2BB5FF', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  callButtonText: { color: '#092233', fontWeight: '700' },
  modifyInlineButton: { backgroundColor: 'transparent', paddingVertical: 8, paddingHorizontal: 10 },
  modifyInlineText: { color: '#5CE1E6', fontWeight: '700' },

  alphabetSidebar: {
    width: 28,
    alignItems: 'center',
    paddingVertical: 8,
    marginRight: 6,
    marginLeft: 6,
  },
  letterTouch: { paddingVertical: 2 },
  letterText: { fontSize: 11, color: '#8FBEDC', fontWeight: '700' },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: '86%', backgroundColor: '#082038', borderRadius: 12, padding: 18 },
  modalTitle: { color: '#E6FBFF', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  modalInput: { backgroundColor: '#061827', borderRadius: 8, padding: 10, color: '#E6FBFF', marginBottom: 10 },

  modalButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  saveButton: { backgroundColor: '#2BB5FF', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', flex: 1, marginRight: 8 },
  saveButtonText: { color: '#0B1E3F', fontWeight: '700' },
  cancelButton: { backgroundColor: 'transparent', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', flex: 1 },
  cancelButtonText: { color: '#9FBFD9' },
});


