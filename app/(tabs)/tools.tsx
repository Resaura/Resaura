import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Power, Pause, Clock, FileText, Plus, X, Edit, Trash2 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function ToolsScreen() {
  const [status, setStatus] = useState<'available' | 'busy' | 'pause'>('available');
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadNotes();
    }
  }, [user]);

  const loadNotes = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const saveNote = async () => {
    if (!user || !noteTitle.trim()) {
      Alert.alert('Erreur', 'Le titre est obligatoire');
      return;
    }

    try {
      if (editingNote) {
        const { error } = await supabase
          .from('notes')
          .update({ title: noteTitle, content: noteContent })
          .eq('id', editingNote.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('notes').insert({
          user_id: user.id,
          title: noteTitle,
          content: noteContent,
        });
        if (error) throw error;
      }
      setNoteTitle('');
      setNoteContent('');
      setEditingNote(null);
      loadNotes();
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    }
  };

  const editNote = (note: Note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
  };

  const deleteNote = async (id: string) => {
    Alert.alert('Supprimer', 'Êtes-vous sûr de vouloir supprimer cette note ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('notes').delete().eq('id', id);
            if (error) throw error;
            loadNotes();
          } catch (error: any) {
            Alert.alert('Erreur', error.message);
          }
        },
      },
    ]);
  };

  const getStatusColor = (currentStatus: string) => {
    switch (currentStatus) {
      case 'available':
        return '#10B981';
      case 'busy':
        return '#EF4444';
      case 'pause':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (currentStatus: string) => {
    switch (currentStatus) {
      case 'available':
        return 'Disponible';
      case 'busy':
        return 'Occupé';
      case 'pause':
        return 'En pause';
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Outils Chauffeur</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statut actuel</Text>

          <View style={styles.statusCard}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: getStatusColor(status) },
              ]}
            />
            <Text style={styles.statusText}>{getStatusLabel(status)}</Text>
          </View>

          <View style={styles.statusButtons}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                status === 'available' && styles.statusButtonActive,
              ]}
              onPress={() => setStatus('available')}
            >
              <Power
                size={20}
                color={status === 'available' ? '#FFFFFF' : '#10B981'}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.statusButtonText,
                  status === 'available' && styles.statusButtonTextActive,
                ]}
              >
                Disponible
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusButton,
                status === 'busy' && styles.statusButtonActive,
              ]}
              onPress={() => setStatus('busy')}
            >
              <Clock
                size={20}
                color={status === 'busy' ? '#FFFFFF' : '#EF4444'}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.statusButtonText,
                  status === 'busy' && styles.statusButtonTextActive,
                ]}
              >
                Occupé
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusButton,
                status === 'pause' && styles.statusButtonActive,
              ]}
              onPress={() => setStatus('pause')}
            >
              <Pause
                size={20}
                color={status === 'pause' ? '#FFFFFF' : '#F59E0B'}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.statusButtonText,
                  status === 'pause' && styles.statusButtonTextActive,
                ]}
              >
                Pause
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accès rapide</Text>

          <TouchableOpacity style={styles.toolCard} onPress={() => setNotesModalVisible(true)}>
            <View style={styles.toolIconContainer}>
              <FileText size={32} color="#1E3A8A" strokeWidth={2} />
            </View>
            <View style={styles.toolContent}>
              <Text style={styles.toolTitle}>Bloc-notes</Text>
              <Text style={styles.toolDescription}>
                Prenez des notes rapides ({notes.length} note{notes.length > 1 ? 's' : ''})
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={notesModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNotesModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bloc-notes</Text>
            <TouchableOpacity onPress={() => setNotesModalVisible(false)}>
              <X size={24} color="#64748B" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.noteForm}>
              <Text style={styles.label}>Titre</Text>
              <TextInput
                style={styles.input}
                placeholder="Titre de la note"
                value={noteTitle}
                onChangeText={setNoteTitle}
              />

              <Text style={styles.label}>Contenu</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Écrivez votre note ici..."
                multiline
                numberOfLines={4}
                value={noteContent}
                onChangeText={setNoteContent}
              />

              <TouchableOpacity style={styles.saveButton} onPress={saveNote}>
                <Plus size={20} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.saveButtonText}>
                  {editingNote ? 'Mettre à jour' : 'Ajouter la note'}
                </Text>
              </TouchableOpacity>

              {editingNote && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setEditingNote(null);
                    setNoteTitle('');
                    setNoteContent('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Annuler la modification</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.notesListTitle}>Mes notes</Text>
            {notes.map((note) => (
              <View key={note.id} style={styles.noteCard}>
                <View style={styles.noteCardContent}>
                  <Text style={styles.noteCardTitle}>{note.title}</Text>
                  {note.content && (
                    <Text style={styles.noteCardText} numberOfLines={2}>
                      {note.content}
                    </Text>
                  )}
                  <Text style={styles.noteCardDate}>
                    {new Date(note.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <View style={styles.noteCardActions}>
                  <TouchableOpacity onPress={() => editNote(note)}>
                    <Edit size={20} color="#1E3A8A" strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteNote(note.id)}>
                    <Trash2 size={20} color="#EF4444" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {notes.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Aucune note. Créez-en une ci-dessus.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
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
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusButtonActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  statusButtonTextActive: {
    color: '#FFFFFF',
  },
  toolCard: {
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
  toolIconContainer: {
    width: 56,
    height: 56,
    backgroundColor: '#EFF6FF',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolContent: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  noteForm: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 12,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  notesListTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteCardContent: {
    flex: 1,
    marginRight: 12,
  },
  noteCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  noteCardText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
    lineHeight: 20,
  },
  noteCardDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  noteCardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#94A3B8',
  },
});
