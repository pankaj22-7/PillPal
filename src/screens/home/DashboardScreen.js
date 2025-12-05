import React, { useState, useEffect } from 'react';
import { FlatList, StyleSheet, View, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Text, Button, FAB, Badge, ProgressBar } from 'react-native-paper';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

export default function DashboardScreen({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [todaysDoses, setTodaysDoses] = useState([]);

  // ✅ DEBUG: Log current user
  console.log('DashboardScreen - Current user:', auth.currentUser);
  console.log('DashboardScreen - User ID:', auth.currentUser?.uid);

  // ✅ FIXED: Use the same query structure as MedListScreen
  const medsRef = query(
    collection(db, 'medications'),
    where('userId', '==', auth.currentUser?.uid || ''),
    where('isActive', '==', true)
    // Removed orderBy to match MedListScreen query exactly
  );
  const [snapshot, loading, error] = useCollection(medsRef);

  // Get today's dose records
  const today = new Date().toISOString().split('T')[0];
  const dosesRef = query(
    collection(db, 'doseRecords'),
    where('userId', '==', auth.currentUser?.uid || ''),
    where('date', '==', today)
  );
  const [dosesSnapshot] = useCollection(dosesRef);

  // ✅ DEBUG: Log query results
  useEffect(() => {
    console.log('=== DASHBOARD MEDICATION QUERY DEBUG ===');
    console.log('Loading:', loading);
    console.log('Error:', error);
    console.log('Snapshot exists:', !!snapshot);
    console.log('Document count:', snapshot?.docs?.length || 0);
    console.log('Today:', today);
    
    if (snapshot?.docs?.length > 0) {
      console.log('Medications found:');
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`  ${index + 1}:`, {
          id: doc.id,
          name: data.name,
          time: data.time,
          userId: data.userId,
          isActive: data.isActive
        });
      });
    } else {
      console.log('No medications found in Dashboard');
    }
    console.log('==========================================');
  }, [snapshot, loading, error]);

  // ✅ FIXED: Calculate today's doses properly
  useEffect(() => {
    if (snapshot?.docs) {
      const doses = snapshot.docs.map(doc => {
        const med = doc.data();
        const doseRecord = dosesSnapshot?.docs.find(dose => 
          dose.data().medicationId === doc.id
        );
        
        return {
          id: doc.id,
          name: med.name,
          dosage: med.dosage,
          time: med.time,
          frequency: med.frequency,
          instructions: med.instructions,
          notes: med.notes,
          taken: !!doseRecord,
          dueTime: med.time
        };
      });
      
      console.log('Dashboard - Calculated doses:', doses.length);
      doses.forEach((dose, index) => {
        console.log(`  Dose ${index + 1}:`, {
          name: dose.name,
          time: dose.time,
          taken: dose.taken
        });
      });
      
      setTodaysDoses(doses);
    }
  }, [snapshot, dosesSnapshot]);

  const markDoseAsTaken = async (medicationId, medName) => {
    try {
      await addDoc(collection(db, 'doseRecords'), {
        userId: auth.currentUser.uid,
        medicationId,
        medicationName: medName,
        date: today,
        timestamp: serverTimestamp(),
        status: 'taken'
      });
      console.log('Dose marked as taken:', medicationId);
    } catch (error) {
      console.error('Error marking dose:', error);
      Alert.alert('Error', 'Failed to mark dose as taken. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // The real-time listeners will automatically update the data
    setTimeout(() => setRefreshing(false), 1000);
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
      return time24;
    }
  };

  const renderMedication = ({ item }) => (
    <Card style={[styles.medCard, item.taken && styles.takenCard]}>
      <Card.Content>
        <View style={styles.medHeader}>
          <View style={styles.medInfo}>
            <Text variant="titleMedium" style={styles.medName}>
              {item.name}
            </Text>
            <Text variant="bodyMedium">{item.dosage}</Text>
            <Text variant="bodySmall">Due at {formatTimeFor12Hour(item.time)}</Text>
            {item.instructions ? (
              <Text variant="bodySmall" style={styles.instructions}>
                {item.instructions}
              </Text>
            ) : null}
          </View>
          <View style={styles.medActions}>
            <Badge 
              style={[styles.badge, item.taken ? styles.takenBadge : styles.pendingBadge]}
            >
              {item.taken ? 'Taken' : 'Pending'}
            </Badge>
            {!item.taken ? (
              <Button
                mode="contained"
                compact
                onPress={() => markDoseAsTaken(item.id, item.name)}
                style={styles.takeButton}
              >
                Mark Taken
              </Button>
            ) : null}
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const adherenceRate = todaysDoses.length > 0 
    ? (todaysDoses.filter(dose => dose.taken).length / todaysDoses.length) * 100 
    : 0;

  // ✅ FIXED: Show loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>
          Today's Schedule
        </Text>
        <View style={styles.loadingContainer}>
          <Text variant="bodyLarge">Loading your medications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ FIXED: Show error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>
          Today's Schedule
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

  return (
    <SafeAreaView style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Today's Schedule
      </Text>
      
      {/* Quick Stats */}
      <Card style={styles.statsCard}>
        <Card.Content>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statNumber}>
                {todaysDoses.filter(d => d.taken).length}/{todaysDoses.length}
              </Text>
              <Text variant="bodySmall">Doses Taken</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statNumber}>
                {Math.round(adherenceRate)}%
              </Text>
              <Text variant="bodySmall">Today's Rate</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={styles.statNumber}>
                {todaysDoses.length}
              </Text>
              <Text variant="bodySmall">Total Meds</Text>
            </View>
          </View>
          <ProgressBar 
            progress={adherenceRate / 100} 
            color="#4CAF50" 
            style={styles.progressBar}
          />
        </Card.Content>
      </Card>

      {/* Debug Info Card */}
      <Card style={styles.debugCard}>
        <Card.Content>
          <Text variant="bodySmall" style={styles.debugText}>
            Debug: User ID: {auth.currentUser?.uid?.slice(-6) || 'None'}
          </Text>
          <Text variant="bodySmall" style={styles.debugText}>
            Medications in DB: {snapshot?.docs?.length || 0}
          </Text>
          <Text variant="bodySmall" style={styles.debugText}>
            Today's doses calculated: {todaysDoses.length}
          </Text>
        </Card.Content>
      </Card>

      {/* Today's Medications */}
      <FlatList
        data={todaysDoses}
        keyExtractor={(item) => item.id}
        renderItem={renderMedication}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="headlineSmall" style={styles.emptyTitle}>
              No Medications Scheduled
            </Text>
            <Text variant="bodyLarge" style={styles.emptyText}>
              Add your medications to see today's schedule here
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Meds', { screen: 'AddMed' })}
              style={styles.addButton}
              icon="pill"
            >
              Add Your First Medication
            </Button>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('Meds', { screen: 'AddMed' })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5', 
    padding: 16 
  },
  title: { 
    marginBottom: 20, 
    textAlign: 'center', 
    color: '#2196F3',
    fontWeight: 'bold'
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
  statsCard: { 
    marginBottom: 16, 
    backgroundColor: '#E3F2FD' 
  },
  statsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginBottom: 12 
  },
  statItem: { 
    alignItems: 'center' 
  },
  statNumber: { 
    color: '#2196F3', 
    fontWeight: 'bold' 
  },
  progressBar: { 
    height: 8, 
    borderRadius: 4 
  },
  debugCard: {
    marginBottom: 16,
    backgroundColor: '#FFF3E0'
  },
  debugText: {
    color: '#FF9800',
    marginBottom: 4
  },
  medCard: { 
    marginBottom: 12 
  },
  takenCard: { 
    backgroundColor: '#E8F5E8' 
  },
  medHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  medInfo: { 
    flex: 1 
  },
  medName: { 
    color: '#2196F3',
    fontWeight: 'bold'
  },
  instructions: {
    fontStyle: 'italic',
    color: '#666666',
    marginTop: 4
  },
  medActions: { 
    alignItems: 'flex-end' 
  },
  badge: { 
    marginBottom: 8 
  },
  takenBadge: { 
    backgroundColor: '#4CAF50' 
  },
  pendingBadge: { 
    backgroundColor: '#FF9800' 
  },
  takeButton: { 
    backgroundColor: '#4CAF50' 
  },
  listContainer: { 
    flexGrow: 1 
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyTitle: {
    marginBottom: 16,
    textAlign: 'center',
    color: '#333333',
  },
  emptyText: { 
    textAlign: 'center', 
    marginBottom: 20,
    color: '#666666'
  },
  addButton: { 
    marginTop: 10 
  },
  fab: { 
    position: 'absolute', 
    margin: 16, 
    right: 0, 
    bottom: 0,
    backgroundColor: '#2196F3'
  },
});
