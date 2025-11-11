// components/TimePicker.tsx
import React, { useMemo } from 'react';
import { Modal, View, Text, StyleSheet, FlatList, Pressable, Platform } from 'react-native';
import { COLORS, RADII } from '@/lib/theme';

type Props = {
  visible: boolean;
  value: string;           // "HH:MM"
  onClose: () => void;
  onConfirm: (hhmm: string) => void;
};

export default function TimePicker({ visible, value, onClose, onConfirm }: Props) {
  const [hh, mm] = value.split(':').map(v=>parseInt(v||'0',10));
  const hours = useMemo(()=>Array.from({length:24}, (_,i)=>i),[]);
  const minutes = useMemo(()=>Array.from({length:12}, (_,i)=>i*5),[]); // 00..55

  const [selH, setSelH] = React.useState(hh||0);
  const [selM, setSelM] = React.useState(Number.isFinite(mm)?mm:0);

  React.useEffect(()=>{ setSelH(hh||0); setSelM(Number.isFinite(mm)?mm:0); },[visible]);

  const Item = ({v, selected, onPress}:{v:number; selected:boolean; onPress:()=>void}) => (
    <Pressable onPress={onPress} style={[st.item, selected && st.itemSel]}>
      <Text style={[st.itemTxt, selected && st.itemTxtSel]}>{String(v).padStart(2,'0')}</Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.overlay}>
        <View style={st.box}>
          <Text style={st.title}>Heure</Text>
          <View style={st.rows}>
            <FlatList
              data={hours}
              keyExtractor={(i)=>`h${i}`}
              renderItem={({item})=>(
                <Item v={item} selected={item===selH} onPress={()=>setSelH(item)} />
              )}
              style={st.col}
            />
            <FlatList
              data={minutes}
              keyExtractor={(i)=>`m${i}`}
              renderItem={({item})=>(
                <Item v={item} selected={item===selM} onPress={()=>setSelM(item)} />
              )}
              style={st.col}
            />
          </View>
          <View style={st.actions}>
            <Pressable onPress={onClose} style={st.ghost}><Text style={st.ghostTxt}>Annuler</Text></Pressable>
            <Pressable
              onPress={()=>{ onConfirm(`${String(selH).padStart(2,'0')}:${String(selM).padStart(2,'0')}`); onClose(); }}
              style={st.cta}
            >
              <Text style={st.ctaTxt}>Valider</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center' },
  box: { width:'90%', backgroundColor:COLORS.background, borderRadius: RADII.card, borderWidth:1, borderColor:COLORS.inputBorder, padding:16 },
  title: { color: COLORS.text, fontWeight:'800', fontSize:16, marginBottom:8 },
  rows: { flexDirection:'row', gap:12 },
  col: { flex:1, maxHeight: 220, borderWidth:1, borderColor:COLORS.inputBorder, borderRadius:RADII.card, backgroundColor:COLORS.inputBg },
  item: { paddingVertical:10, alignItems:'center' },
  itemSel: { backgroundColor: COLORS.azure },
  itemTxt: { color: COLORS.text, fontWeight:'700' },
  itemTxtSel: { color: '#003642', fontWeight:'900' },
  actions: { flexDirection:'row', justifyContent:'flex-end', gap:8, marginTop:12 },
  cta: { backgroundColor: COLORS.azure, borderRadius: RADII.button, paddingHorizontal:16, paddingVertical:10 },
  ctaTxt: { color:'#003642', fontWeight:'800' },
  ghost: { borderColor: COLORS.outline, borderWidth:1, borderRadius: RADII.button, paddingHorizontal:16, paddingVertical:10 },
  ghostTxt: { color: COLORS.text, fontWeight:'700' },
});
