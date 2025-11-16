// App.js (racine)
import React from 'react';
import { View, Text, StatusBar } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" />
      <Text style={{ fontSize: 18 }}>Resaura démarre bien 🚕</Text>
    </View>
  );
}
