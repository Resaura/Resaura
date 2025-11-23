// app/(tabs)/tools.tsx
import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Power, Pause, Clock, FileText, Plus, X, Edit, Trash2, Send, Calculator } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '@/contexts/AuthContext';
import { useAppAlert } from '@/contexts/AlertContext';
import { supabase } from '@/lib/supabase';
import { COLORS, RADII, SHADOW } from '@/lib/theme';
import {
  getGoogleReviewMessage,
  setGoogleReviewMessage,
  DEFAULT_GOOGLE_REVIEW_MESSAGE,
} from '@/lib/preferences';
import { getSmsShortcuts, saveSmsShortcuts, type SmsShortcut } from '@/lib/smsShortcuts';
import { useSwipeTabsNavigation } from '@/hooks/useSwipeTabsNavigation';
import TvaCalculator from '@/components/tools/TvaCalculator';

const TOOLS_ORDER_KEY = 'tools_quick_order_v1';
const DEFAULT_TOOL_ORDER = ['notes', 'review', 'sms', 'tva'] as const;

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function ToolsScreen() {
  const [status, setStatus] = useState<'available' | 'busy' | 'pause'>('available');

  // Bloc-notes
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Avis Google
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [googleReviewMessage, setGoogleReviewMessageState] = useState(DEFAULT_GOOGLE_REVIEW_MESSAGE);
  const [reviewDraft, setReviewDraft] = useState(DEFAULT_GOOGLE_REVIEW_MESSAGE);

  // Raccourcis SMS
  const [smsModalVisible, setSmsModalVisible] = useState(false);
  const [smsShortcutsState, setSmsShortcutsState] = useState<SmsShortcut[]>([]);
  const [smsDrafts, setSmsDrafts] = useState<Record<string, string>>({});
  const [smsLabelDrafts, setSmsLabelDrafts] = useState<Record<string, string>>({});
  const [tvaCalculatorVisible, setTvaCalculatorVisible] = useState(false);
  const [toolOrder, setToolOrder] = useState<string[]>([...DEFAULT_TOOL_ORDER]);

  const { user } = useAuth();
  const alert = useAppAlert();
  const insets = useSafeAreaInsets();
  const safeBottom = (insets.bottom || 0) + 12;
  const safeTop = Math.max(20, insets.top);
  const swipeHandlers = useSwipeTabsNavigation('tools');

  useEffect(() => {
    if (user) {
      void loadNotes();
      void loadReviewMessage();
      void loadSmsSettings();
      void loadToolOrder();
    }
  }, [user]);

  const loadToolOrder = async () => {
    try {
      const raw = await AsyncStorage.getItem(TOOLS_ORDER_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      const allowed = new Set(DEFAULT_TOOL_ORDER);
      const filtered = parsed.filter((id) => allowed.has(id as typeof DEFAULT_TOOL_ORDER[number]));
      const missing = DEFAULT_TOOL_ORDER.filter((id) => !filtered.includes(id));
      setToolOrder([...filtered, ...missing]);
    } catch {
      // fallback on default order silently
    }
  };

  const persistToolOrder = async (order: string[]) => {
    setToolOrder(order);
    try {
      await AsyncStorage.setItem(TOOLS_ORDER_KEY, JSON.stringify(order));
    } catch {
      // silencieux
    }
  };

  const moveTool = (id: string, direction: 'up' | 'down') => {
    setToolOrder((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.length - 1) return prev;
      const next = [...prev];
      const target = direction === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[target]] = [next[target], next[idx]];
      void persistToolOrder(next);
      return next;
    });
  };

  // ---------- Loaders ----------
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
    } catch (e: any) {
      console.warn('[tools] loadNotes error:', e?.message);
      alert.show('Erreur', "Impossible de charger les notes.");
    }
  };

  const loadSmsSettings = async () => {
    try {
      const shortcuts = await getSmsShortcuts();
      setSmsShortcutsState(shortcuts);
      setSmsDrafts(Object.fromEntries(shortcuts.map((item) => [item.id, item.body])));
      setSmsLabelDrafts(Object.fromEntries(shortcuts.map((item) => [item.id, item.label])));
    } catch (e: any) {
      console.warn('[tools] loadSmsSettings error:', e?.message);
      alert.show('Erreur', "Impossible de charger les raccourcis SMS.");
    }
  };

  const loadReviewMessage = async () => {
    try {
      const msg = await getGoogleReviewMessage();
      setGoogleReviewMessageState(msg);
    } catch {
      // silencieux
    }
  };

  // ---------- Avis Google ----------
  const openReviewModal = () => {
    setReviewDraft(googleReviewMessage);
    setReviewModalVisible(true);
  };

  const saveReviewMessageSetting = async () => {
    try {
      await setGoogleReviewMessage(reviewDraft);
      const msg = await getGoogleReviewMessage();
      setGoogleReviewMessageState(msg);
      setReviewModalVisible(false);
      alert.show('Enregistré', 'Votre message “Avis Google” a été mis à jour.');
    } catch (e: any) {
      alert.show('Erreur', "Impossible d’enregistrer le message.");
    }
  };

  // ---------- Raccourcis SMS ----------
  const openSmsModal = () => {
    setSmsDrafts(Object.fromEntries(smsShortcutsState.map((item) => [item.id, item.body])));
    setSmsLabelDrafts(Object.fromEntries(smsShortcutsState.map((item) => [item.id, item.label])));
    setSmsModalVisible(true);
  };

  const saveSmsSettings = async () => {
    try {
      const payload = smsShortcutsState.map((item) => ({
        ...item,
        body: smsDrafts[item.id] ?? item.body,
        label: smsLabelDrafts[item.id] ?? item.label,
      }));
      await saveSmsShortcuts(payload);
      setSmsShortcutsState(payload);
      setSmsModalVisible(false);
      alert.show('Enregistré', 'Raccourcis SMS mis à jour.');
    } catch (e: any) {
      alert.show('Erreur', "Impossible d’enregistrer les raccourcis.");
    }
  };


  const addSmsShortcut = () => {
    const id = `custom-${Date.now()}`;
    const next = {
      id,
      label: 'Nouveau message',
      body: '',
      channel: 'sms',
    } as const;
    setSmsShortcutsState((prev) => [...prev, next]);
    setSmsDrafts((prev) => ({ ...prev, [id]: '' }));
    setSmsLabelDrafts((prev) => ({ ...prev, [id]: next.label }));
  };

  // ---------- Bloc-notes ----------
  const saveNote = async () => {
    if (!user) return;
    if (!noteTitle.trim()) {
      alert.show('Champs requis', 'Le titre est obligatoire.');
      return;
    }

    try {
      if (editingNote) {
        const { error } = await supabase
          .from('notes')
          .update({ title: noteTitle.trim(), content: noteContent.trim() })
          .eq('id', editingNote.id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('notes').insert({
          user_id: user.id,
          title: noteTitle.trim(),
          content: noteContent.trim(),
        });
        if (error) throw error;
      }

      setNoteTitle('');
      setNoteContent('');
      setEditingNote(null);
      await loadNotes();
      alert.show('Succès', 'Note enregistrée.');
    } catch (e: any) {
      alert.show('Erreur', e?.message || 'Échec enregistrement.');
    }
  };

  const editNote = (note: Note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
  };

  const deleteNote = async (id: string) => {
    alert.confirm({
      title: 'Supprimer',
      message: 'Êtes-vous sûr de vouloir supprimer cette note ?',
      confirmText: 'Supprimer',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('notes').delete().eq('id', id);
          if (error) throw error;
          await loadNotes();
          alert.show('Supprimée', 'La note a été supprimée.');
        } catch (e: any) {
          alert.show('Erreur', e?.message || 'Échec suppression.');
        }
      },
    });
  };

  // ---------- UI helpers ----------
  const statusMeta: Record<
    typeof status,
    { label: string; dot: string; iconColor: string }
  > = {
    available: { label: 'Disponible', dot: '#10B981', iconColor: '#10B981' },
    busy: { label: 'Occupé', dot: '#EF4444', iconColor: '#EF4444' },
    pause: { label: 'En pause', dot: '#F59E0B', iconColor: '#F59E0B' },
  };

  const toolItems = useMemo(
    () => ({
      notes: {
        id: 'notes',
        title: 'Bloc-notes',
        description: `Prenez des notes rapides (${notes.length} note${notes.length > 1 ? 's' : ''})`,
        icon: FileText,
        onPress: () => setNotesModalVisible(true),
      },
      review: {
        id: 'review',
        title: 'Avis Google',
        description: `Message actuel : ${googleReviewMessage.slice(0, 80)}${
          googleReviewMessage.length > 80 ? '…' : ''
        }`,
        icon: Clock,
        onPress: openReviewModal,
      },
      sms: {
        id: 'sms',
        title: 'Raccourcis SMS',
        description: 'Configurez vos messages (arrivǸe, suivi, avis) rǸutilisǸs partout.',
        icon: Send,
        onPress: openSmsModal,
      },
      tva: {
        id: 'tva',
        title: 'Calculatrice TVA',
        description: 'Convertissez rapidement vos montants HT/TTC avec les taux fran��ais.',
        icon: Calculator,
        onPress: () => setTvaCalculatorVisible(true),
      },
    }),
    [googleReviewMessage, notes.length],
  );

  const orderedTools = toolOrder
    .map((id) => toolItems[id as keyof typeof toolItems])
    .filter((item): item is (typeof toolItems)[keyof typeof toolItems] => Boolean(item));

  return (
    <View {...swipeHandlers} style={[styles.container, { paddingBottom: safeBottom }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: safeTop + 8 }]}>
        <Text style={styles.title}>Outils Chauffeur</Text>
      </View>

      {/* Contenu */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: safeBottom }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Statut */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statut actuel</Text>

          <View style={styles.statusCard}>
            <View style={[styles.statusIndicator, { backgroundColor: statusMeta[status].dot }]} />
            <Text style={styles.statusText}>{statusMeta[status].label}</Text>
          </View>

          <View style={styles.statusButtons}>
            <TouchableOpacity
              style={[styles.statusButton, status === 'available' && styles.statusButtonActive]}
              onPress={() => setStatus('available')}
              accessibilityRole="button"
              accessibilityLabel="Passer en Disponible"
            >
              <Power
                size={20}
                color={status === 'available' ? COLORS.text : statusMeta.available.iconColor}
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
              style={[styles.statusButton, status === 'busy' && styles.statusButtonActive]}
              onPress={() => setStatus('busy')}
              accessibilityRole="button"
              accessibilityLabel="Passer en Occupé"
            >
              <Clock
                size={20}
                color={status === 'busy' ? COLORS.text : statusMeta.busy.iconColor}
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
              style={[styles.statusButton, status === 'pause' && styles.statusButtonActive]}
              onPress={() => setStatus('pause')}
              accessibilityRole="button"
              accessibilityLabel="Passer en Pause"
            >
              <Pause
                size={20}
                color={status === 'pause' ? COLORS.text : statusMeta.pause.iconColor}
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

        {/* Acc??s rapide */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accès rapide</Text>

          {orderedTools.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <View key={tool.id} style={styles.toolCard}>
                <TouchableOpacity
                  style={styles.toolCardContent}
                  onPress={tool.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={`Ouvrir ${tool.title}`}
                >
                  <View style={styles.toolIconContainer}>
                    <Icon size={28} color={COLORS.background} strokeWidth={2} />
                  </View>
                  <View style={styles.toolContent}>
                    <Text style={styles.toolTitle}>{tool.title}</Text>
                    <Text style={styles.toolDescription} numberOfLines={2}>
                      {tool.description}
                    </Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.reorderRow}>
                  <TouchableOpacity
                    style={[styles.reorderBtn, index === 0 && styles.reorderBtnDisabled]}
                    onPress={() => moveTool(tool.id, 'up')}
                    disabled={index === 0}
                  >
                    <Text style={styles.reorderText}>Monter</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reorderBtn, index === orderedTools.length - 1 && styles.reorderBtnDisabled]}
                    onPress={() => moveTool(tool.id, 'down')}
                    disabled={index === orderedTools.length - 1}
                  >
                    <Text style={styles.reorderText}>Descendre</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Modal Bloc-notes */}
      <Modal
        visible={notesModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNotesModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalContainer, { paddingBottom: safeBottom }]}
        >
          <View style={[styles.modalHeader, { paddingTop: safeTop + 8 }]}>
            <Text style={styles.modalTitle}>Bloc-notes</Text>
            <TouchableOpacity onPress={() => setNotesModalVisible(false)} accessibilityLabel="Fermer">
              <X size={24} color={COLORS.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{ paddingBottom: safeBottom }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.noteForm}>
              <Text style={styles.label}>Titre</Text>
              <TextInput
                style={styles.input}
                placeholder="Titre de la note"
                placeholderTextColor={COLORS.textMuted}
                value={noteTitle}
                onChangeText={setNoteTitle}
              />

              <Text style={styles.label}>Contenu</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Écrivez votre note ici…"
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={4}
                value={noteContent}
                onChangeText={setNoteContent}
              />

              <TouchableOpacity style={styles.saveButton} onPress={saveNote}>
                <Plus size={18} color={COLORS.background} strokeWidth={2} />
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
                  {!!note.content && (
                    <Text style={styles.noteCardText} numberOfLines={3}>
                      {note.content}
                    </Text>
                  )}
                  <Text style={styles.noteCardDate}>
                    {new Date(note.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <View style={styles.noteCardActions}>
                  <TouchableOpacity onPress={() => editNote(note)} accessibilityLabel="Modifier la note">
                    <Edit size={20} color={COLORS.azure} strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteNote(note.id)}
                    accessibilityLabel="Supprimer la note"
                  >
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
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Avis Google */}
      <Modal
        visible={reviewModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalContainer, { paddingBottom: safeBottom }]}
        >
          <View style={[styles.modalHeader, { paddingTop: safeTop + 8 }]}>
            <Text style={styles.modalTitle}>Message “Avis Google”</Text>
            <TouchableOpacity onPress={() => setReviewModalVisible(false)} accessibilityLabel="Fermer">
              <X size={24} color={COLORS.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.label}>Message SMS</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={5}
              value={reviewDraft}
              onChangeText={setReviewDraft}
              placeholder="Personnalisez votre message (lien d’avis, salutation, etc.)"
              placeholderTextColor={COLORS.textMuted}
            />
            <TouchableOpacity style={styles.saveButton} onPress={saveReviewMessageSetting}>
              <Plus size={18} color={COLORS.background} strokeWidth={2} />
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setReviewModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Raccourcis SMS */}
      <Modal
        visible={smsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSmsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalContainer, { paddingBottom: safeBottom }]}
        >
          <View style={[styles.modalHeader, { paddingTop: safeTop + 8 }]}>
            <Text style={styles.modalTitle}>Raccourcis SMS</Text>
            <TouchableOpacity onPress={() => setSmsModalVisible(false)} accessibilityLabel="Fermer">
              <X size={24} color={COLORS.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.addSmsButton} onPress={addSmsShortcut}>
              <Plus size={18} color={COLORS.background} strokeWidth={2} />
              <Text style={styles.addSmsButtonText}>Ajouter un message</Text>
            </TouchableOpacity>
            {smsShortcutsState.map((shortcut) => (
              <View key={shortcut.id} style={styles.noteForm}>
                <TextInput
                  style={[styles.input, { marginBottom: 8 }]}
                  value={smsLabelDrafts[shortcut.id] ?? shortcut.label}
                  onChangeText={(text) =>
                    setSmsLabelDrafts((prev) => ({ ...prev, [shortcut.id]: text }))
                  }
                  placeholder="Nom du message"
                  placeholderTextColor={COLORS.textMuted}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  multiline
                  numberOfLines={4}
                  value={smsDrafts[shortcut.id] ?? ''}
                  onChangeText={(text) =>
                    setSmsDrafts((prev) => ({ ...prev, [shortcut.id]: text }))
                  }
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            ))}
          </ScrollView>

          <View style={{ padding: 20 }}>
            <TouchableOpacity style={styles.saveButton} onPress={saveSmsSettings}>
              <Plus size={18} color={COLORS.background} strokeWidth={2} />
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setSmsModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal
        visible={tvaCalculatorVisible}
        animationType="slide"
        onRequestClose={() => setTvaCalculatorVisible(false)}
      >
        <View style={[styles.modalContainer, { paddingBottom: safeBottom }]}>
          <View style={[styles.modalHeader, { paddingTop: safeTop + 8 }]}>
            <Text style={styles.modalTitle}>Calculatrice TVA</Text>
            <TouchableOpacity onPress={() => setTvaCalculatorVisible(false)} accessibilityLabel="Fermer">
              <X size={24} color={COLORS.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <TvaCalculator onClose={() => setTvaCalculatorVisible(false)} />
        </View>
      </Modal>
    </View>
  );
}

/* ============================= */
/* =           STYLES          = */
/* ============================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBorder,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },

  content: {
    flex: 1,
  },

  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },

  statusCard: {
    backgroundColor: COLORS.backgroundDeep,
    borderRadius: RADII.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    ...SHADOW.card,
    marginBottom: 12,
  },
  statusIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: RADII.button,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.azure,
  },
  statusButtonActive: {
    backgroundColor: COLORS.azure,
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusButtonTextActive: {
    color: COLORS.background,
  },

  toolCard: {
    backgroundColor: COLORS.backgroundDeep,
    borderRadius: RADII.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    ...SHADOW.card,
  },
  toolCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  toolIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.azure,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolContent: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
  },
  toolDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  reorderRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  reorderBtn: {
    borderRadius: RADII.button,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reorderBtnDisabled: {
    opacity: 0.45,
  },
  reorderText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 12,
  },

  /* Modales */
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  addSmsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.azure,
    borderRadius: RADII.button,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  addSmsButtonText: {
    color: COLORS.background,
    fontWeight: '800',
  },

  /* Formulaires */
  noteForm: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: RADII.input,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.azure,
    borderRadius: RADII.button,
    paddingVertical: 14,
  },
  saveButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '800',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 6,
  },
  cancelButtonText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },

  notesListTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 10,
  },
  noteCard: {
    backgroundColor: COLORS.backgroundDeep,
    borderRadius: RADII.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  noteCardContent: {
    flex: 1,
  },
  noteCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  noteCardText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 6,
    lineHeight: 18,
  },
  noteCardDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  noteCardActions: {
    flexDirection: 'row',
    gap: 12,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
});

