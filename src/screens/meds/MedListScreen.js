import React, { useState, useEffect } from 'react';
import { FlatList, StyleSheet, View, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Text, IconButton, FAB, Searchbar, Button } from 'react-native-paper';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

export default function MedListScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Debug: Log current user
  console.log('MedListScreen - Current user:', auth.currentUser);
  console.log('MedListScreen - User ID:', auth.currentUser?.uid);

  const medsRef = query(
    collection(db, 'medications'),
    where('userId', '==', auth.currentUser?.uid || ''),
    where('isActive', '==', true)
  );

  const [snapshot, loading, error] = useCollection(medsRef);

  // Debug: Log query results
  useEffect(() => {
    console.log('=== MEDICATION QUERY DEBUG ===');
    console.log('Loading:', loading);
    console.log('Error:', error);
    console.log('Snapshot exists:', !!snapshot);
    console.log('Document count:', snapshot?.docs?.length || 0);
    
    if (snapshot?.docs?.length > 0) {
      console.log('Documents found:');
      snapshot.docs.forEach((doc, index) => {
        console.log(`  ${index + 1}:`, doc.data());
      });
    } else {
      console.log('No documents found');
    }
    console.log('==============================');
  }, [snapshot, loading, error]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const filteredMeds = snapshot?.docs.filter((doc) => {
    const med = doc.data();
    return med.name?.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const deleteMedication = async (medId) => {
    Alert.alert(
      'Delete Medication',
      'Are you sure you want to delete this medication?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'medications', medId));
              console.log('Medication deleted:', medId);
            } catch (error) {
              console.error('Error deleting medication:', error);
              Alert.alert('Error', 'Failed to delete medication. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Format time to 12-hour format for display
  const formatTimeFor12Hour = (time24) => {
    if (!time24) return 'Not set';
    
    try {
      const [hours, minutes] = time24.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return time24; // Return original if formatting fails
    }
  };

  const renderMedication = ({ item }) => {
    const med = item.data();
    const medId = item.id;
    
    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.medInfo}>
              <Text variant="titleLarge" style={styles.medName}>
                {med.name || 'Unnamed Medication'}
              </Text>
              <Text variant="bodyMedium" style={styles.medDetails}>
                Dosage: {med.dosage || 'Not specified'}
              </Text>
              <Text variant="bodyMedium" style={styles.medDetails}>
                Time: {formatTimeFor12Hour(med.time)}
              </Text>
              <Text variant="bodyMedium" style={styles.medDetails}>
                Frequency: {med.frequency || 'Daily'}
              </Text>
              {med.instructions ? (
                <Text variant="bodySmall" style={styles.instructions}>
                  Instructions: {med.instructions}
                </Text>
              ) : null}
              {med.notes ? (
                <Text variant="bodySmall" style={styles.notes}>
                  Notes: {med.notes}
                </Text>
              ) : null}
            </View>
            <View style={styles.cardActions}>
              {/* Edit button */}
              <IconButton
                icon="pencil"
                size={24}
                onPress={() => navigation.navigate('EditMed', { 
                  medication: med, 
                  medicationId: medId 
                })}
                style={styles.actionButton}
                iconColor="#2196F3"
              />
              {/* Delete button */}
              <IconButton
                icon="delete"
                size={24}
                onPress={() => deleteMedication(medId)}
                iconColor="#F44336"
                style={styles.actionButton}
              />
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>
          My Medications
        </Text>
        <View style={styles.loadingContainer}>
          <Text variant="bodyLarge">Loading medications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>
          My Medications
        </Text>
        <View style={styles.errorContainer}>
          <Text variant="bodyLarge" style={styles.errorText}>
            Error loading medications: {error.message}
          </Text>
          <Button onPress={onRefresh} mode="contained">
            Retry
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const EmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        No Medications Added
      </Text>
      <Text variant="bodyLarge" style={styles.emptyDescription}>
        Add your first medication to get started with tracking your doses and reminders.
      </Text>
      
      {/* Debug info - wrapped properly in Text components */}
      {auth.currentUser?.uid ? (
        <Text variant="bodySmall" style={styles.debugText}>
          Debug: User ID: {auth.currentUser.uid.slice(-6)}
        </Text>
      ) : null}
      
      {snapshot?.docs ? (
        <Text variant="bodySmall" style={styles.debugText}>
          Query results: {snapshot.docs.length} documents
        </Text>
      ) : null}
      
      <Button
        mode="contained"
        onPress={() => navigation.navigate('AddMed')}
        style={styles.addFirstButton}
        icon="pill"
      >
        Add Your First Medication
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        My Medications ({filteredMeds.length})
      </Text>

      <Searchbar
        placeholder="Search medications..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      <FlatList
        data={filteredMeds}
        keyExtractor={(item) => item.id}
        renderItem={renderMedication}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={<EmptyList />}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('AddMed')}
        label="Add Med"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
    color: '#2196F3',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#F44336',
  },
  searchbar: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  medInfo: {
    flex: 1,
    paddingRight: 8,
  },
  medName: {
    marginBottom: 8,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  medDetails: {
    marginBottom: 4,
    color: '#333333',
  },
  instructions: {
    marginTop: 8,
    color: '#666666',
    fontStyle: 'italic',
  },
  notes: {
    marginTop: 4,
    color: '#666666',
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'column',
  },
  actionButton: {
    margin: 0,
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    marginBottom: 16,
    textAlign: 'center',
    color: '#333333',
  },
  emptyDescription: {
    marginBottom: 32,
    textAlign: 'center',
    color: '#666666',
    lineHeight: 24,
  },
  debugText: {
    marginBottom: 4,
    textAlign: 'center',
    color: '#999999',
  },
  addFirstButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});
