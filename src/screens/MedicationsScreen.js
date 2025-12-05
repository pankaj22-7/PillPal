import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, FAB, Searchbar, IconButton } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const MedicationsScreen = ({ navigation }) => {
  const [medications, setMedications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'medications'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const meds = [];
      querySnapshot.forEach((doc) => {
        meds.push({ id: doc.id, ...doc.data() });
      });
      // Sort by time
      meds.sort((a, b) => {
        const timeA = a.time || '00:00';
        const timeB = b.time || '00:00';
        return timeA.localeCompare(timeB);
      });
      setMedications(meds);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredMedications = medications.filter(med =>
    med.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteMedication = async (medicationId, medicationName) => {
    Alert.alert(
      'Delete Medication',
      `Are you sure you want to delete ${medicationName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'medications', medicationId));
              Alert.alert('Success', 'Medication deleted successfully');
            } catch (error) {
              console.error('Error deleting medication:', error);
              Alert.alert('Error', 'Failed to delete medication');
            }
          }
        }
      ]
    );
  };

  const renderMedication = ({ item }) => (
    <Card style={styles.medicationCard} elevation={2}>
      <Card.Content>
        <View style={styles.medicationHeader}>
          <View style={styles.medicationInfo}>
            <Text style={styles.medicationName}>{item.name}</Text>
            <Text style={styles.medicationTime}>⏰ {item.time}</Text>
          </View>
          <View style={styles.medicationActions}>
            <IconButton
              icon="pencil"
              size={20}
              iconColor="#4CAF50"
              onPress={() => navigation.navigate('EditMed', { medication: item })}
            />
            <IconButton
              icon="delete"
              size={20}
              iconColor="#FF5722"
              onPress={() => handleDeleteMedication(item.id, item.name)}
            />
          </View>
        </View>
        
        <Text style={styles.medicationDosage}>💊 {item.dosage}</Text>
        
        {item.instructions && (
          <Text style={styles.medicationInstructions}>📝 {item.instructions}</Text>
        )}
        
        <View style={styles.medicationFooter}>
          <Text style={styles.medicationFrequency}>🔄 {item.frequency || 'Daily'}</Text>
          {item.duration && (
            <Text style={styles.medicationDuration}>📅 {item.duration}</Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.viewDetailsButton}
          onPress={() => navigation.navigate('MedDetail', { medication: item })}
        >
          <Text style={styles.viewDetailsText}>View Details</Text>
        </TouchableOpacity>
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="medication" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No medications yet</Text>
      <Text style={styles.emptySubtitle}>
        Add your first prescription using the AI scanner or manually add medications
      </Text>
      <TouchableOpacity 
        style={styles.addFirstMedButton}
        onPress={() => navigation.navigate('Prescriptions')}
      >
        <Text style={styles.addFirstMedText}>📷 Scan Prescription</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Medications</Text>
        <Text style={styles.subtitle}>
          {medications.length} medication{medications.length !== 1 ? 's' : ''} scheduled
        </Text>
        
        <Searchbar
          placeholder="Search medications..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          iconColor="#4CAF50"
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading medications...</Text>
        </View>
      ) : filteredMedications.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredMedications}
          renderItem={renderMedication}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FAB
        icon="camera"
        style={styles.scanFab}
        onPress={() => navigation.navigate('Prescriptions')}
        label="Scan Prescription"
      />
      
      <FAB
        icon="plus"
        style={styles.addFab}
        onPress={() => navigation.navigate('AddMed')}
        small
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  medicationCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  medicationTime: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  medicationActions: {
    flexDirection: 'row',
  },
  medicationDosage: {
    fontSize: 16,
    color: '#555',
    marginBottom: 4,
  },
  medicationInstructions: {
    fontSize: 14,
    color: '#777',
    marginBottom: 8,
    lineHeight: 20,
  },
  medicationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  medicationFrequency: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  medicationDuration: {
    fontSize: 14,
    color: '#666',
  },
  viewDetailsButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  viewDetailsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  addFirstMedButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  addFirstMedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scanFab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 70,
    backgroundColor: '#4CAF50',
  },
  addFab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 16,
    backgroundColor: '#2196F3',
  },
});

export default MedicationsScreen;
