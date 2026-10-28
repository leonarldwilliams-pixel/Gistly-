import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, TextInput } from 'react-native';
import io from 'socket.io-client';

const socket = io('https://your-backend.com');

export default function LinkedDevicesScreen() {
  const [qr, setQr] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [phone, setPhone] = useState('');

  const startLinking = () => {
    setShowQrModal(true);
    socket.emit('start-linked-session', 'user123'); // your user ID
    
    socket.on('linked-devices-qr', (qrBase64) => {
      setQr(qrBase64);
    });

    socket.on('pairingCode', (code) => {
      setPairingCode(code);
    });
  };

  const getCodeWithNumber = () => {
    socket.emit('request-pairing-code', { userId: 'user123', phoneNumber: phone });
  };

  return (
    <View style={styles.container}>
      {/* Header like WhatsApp */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Linked devices</Text>
      </View>

      <View style={styles.illustrationBox}>
        <Text style={{fontSize: 80}}>🔗</Text>
        <Text style={styles.desc}>Use WhatsApp on other devices</Text>
      </View>

      {/* Link a Device Button - Like WhatsApp */}
      <TouchableOpacity style={styles.linkButton} onPress={startLinking}>
        <Text style={styles.linkButtonText}>Link a device</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>
        Tap "Link a device" and scan the QR code from your other phone in WhatsApp {'>'} Linked devices
      </Text>

      {/* QR Modal - Looks like WhatsApp */}
      <Modal visible={showQrModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowQrModal(false)}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Link a device</Text>
          </View>

          {!pairingCode ? (
            <>
              {qr ? (
                <Image source={{uri: qr}} style={styles.qrImage} />
              ) : (
                <Text style={styles.loading}>Generating QR...</Text>
              )}
              <Text style={styles.scanHint}>Scan this QR code with your phone</Text>
              <Text style={styles.steps}>1. Open WhatsApp on your phone</Text>
              <Text style={styles.steps}>2. Tap Menu ⋮ or Settings ⚙️</Text>
              <Text style={styles.steps}>3. Tap Linked devices {'>'} Link a device</Text>
              
              <View style={styles.divider} />
              
              <TouchableOpacity onPress={() => setPairingCode('SHOW_INPUT')}>
                <Text style={styles.linkWithNumber}>Link with phone number instead</Text>
              </TouchableOpacity>
            </>
          ) : pairingCode === 'SHOW_INPUT' ? (
            <View style={{width: '100%', padding: 20}}>
              <Text style={styles.enterPhone}>Enter phone number</Text>
              <TextInput 
                style={styles.input} 
                placeholder="254712345678" 
                placeholderTextColor="#8696a0"
                keyboardType="phone-pad"
                onChangeText={setPhone}
              />
              <TouchableOpacity style={styles.codeButton} onPress={getCodeWithNumber}>
                <Text style={styles.linkButtonText}>Get Code</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{alignItems: 'center'}}>
              <Text style={styles.codeLabel}>Enter this code on your phone</Text>
              <Text style={styles.codeText}>{pairingCode}</Text>
              <Text style={styles.codeHint}>WhatsApp {'>'} Linked devices {'>'} Link with phone number</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111b21', padding: 16 },
  header: { paddingVertical: 20 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  illustrationBox: { alignItems: 'center', marginVertical: 40 },
  desc: { color: '#8696a0', marginTop: 10, fontSize: 15 },
  linkButton: { backgroundColor: '#00a884', padding: 15, borderRadius: 25, alignItems: 'center', marginTop: 20 },
  linkButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  hint: { color: '#8696a0', fontSize: 13, textAlign: 'center', marginTop: 20, lineHeight: 18 },
  modalContainer: { flex: 1, backgroundColor: '#111b21', alignItems: 'center', paddingTop: 50 },
  modalHeader: { flexDirection: 'row', width: '100%', paddingHorizontal: 20, alignItems: 'center', marginBottom: 30 },
  closeText: { color: 'white', fontSize: 22, marginRight: 20 },
  modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  qrImage: { width: 280, height: 280, backgroundColor: 'white', borderRadius: 12, padding: 10 },
  loading: { color: 'white', marginTop: 50 },
  scanHint: { color: 'white', marginTop: 20, fontSize: 16 },
  steps: { color: '#8696a0', fontSize: 14, marginTop: 8, alignSelf: 'flex-start', marginLeft: 30 },
  divider: { height: 1, backgroundColor: '#222d34', width: '90%', marginVertical: 30 },
  linkWithNumber: { color: '#53bdeb', fontSize: 15 },
  enterPhone: { color: 'white', fontSize: 18, marginBottom: 15 },
  input: { backgroundColor: '#202c33', color: 'white', padding: 15, borderRadius: 10, width: '100%' },
  codeButton: { backgroundColor: '#00a884', padding: 15, borderRadius: 25, alignItems: 'center', marginTop: 20 },
  codeLabel: { color: '#8696a0', fontSize: 15 },
  codeText: { color: 'white', fontSize: 32, letterSpacing: 5, fontWeight: 'bold', marginVertical: 20 },
  codeHint: { color: '#8696a0', fontSize: 13, textAlign: 'center' }
});
