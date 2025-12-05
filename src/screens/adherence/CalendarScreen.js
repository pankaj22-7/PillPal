import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Text, Button, ProgressBar, Chip, FAB, Surface } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

const { width } = Dimensions.get('window');

export default function CalendarScreen({ navigation }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get all dose records for marking calendar
  const doseRecordsRef = query(
    collection(db, 'doseRecords'),
    where('userId', '==', auth.currentUser?.uid || '')
  );
  const [doseSnapshot] = useCollection(doseRecordsRef);

  // Get all medications for the selected day
  const medicationsRef = query(
    collection(db, 'medications'),
    where('userId', '==', auth.currentUser?.uid || ''),
    where('isActive', '==', true)
  );
  const [medsSnapshot] = useCollection(medicationsRef);

  // Process dose records and mark calendar dates
  useEffect(() => {
    if (doseSnapshot?.docs) {
      const marks = {};
      const doseCounts = {};

      // Count doses per date
      doseSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const date = data.date;
        
        if (!doseCounts[date]) {
          doseCounts[date] = { taken: 0, total: 0 };
        }
        
        doseCounts[date].total++;
        if (data.status === 'taken') {
          doseCounts[date].taken++;
        }
      });

      // Mark dates on calendar based on adherence
      Object.keys(doseCounts).forEach(date => {
        const { taken, total } = doseCounts[date];
        const adherenceRate = taken / total;
        
        let color = '#FF5252'; // Red for poor adherence
        let textColor = '#fff';
        
        if (adherenceRate === 1) {
          color = '#4CAF50'; // Green for perfect adherence
        } else if (adherenceRate >= 0.8) {
          color = '#FF9800'; // Orange for good adherence
        }

        marks[date] = {
          customStyles: {
            container: {
              backgroundColor: color,
              borderRadius: 18,
              elevation: 2,
            },
            text: {
              color: textColor,
              fontWeight: 'bold'
            }
          }
        };
      });

      setMarkedDates(marks);
      setLoading(false);
    }
  }, [doseSnapshot]);

  // Get data for selected day
  useEffect(() => {
    if (selectedDate && medsSnapshot?.docs && doseSnapshot?.docs) {
      const dayMeds = medsSnapshot.docs.map(doc => {
        const med = doc.data();
        const doseRecord = doseSnapshot.docs.find(dose => 
          dose.data().medicationId === doc.id && 
          dose.data().date === selectedDate
        );

        return {
          id: doc.id,
          name: med.name,
          dosage: med.dosage,
          time: med.time,
          frequency: med.frequency,
          taken: !!doseRecord,
          doseRecord: doseRecord?.data()
        };
      });

      setSelectedDayData({
        date: selectedDate,
        medications: dayMeds,
        totalMeds: dayMeds.length,
        takenMeds: dayMeds.filter(m => m.taken).length
      });
    }
  }, [selectedDate, medsSnapshot, doseSnapshot]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time24) => {
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

  const markDoseAsTaken = async (medicationId, medName) => {
    try {
      await addDoc(collection(db, 'doseRecords'), {
        userId: auth.currentUser.uid,
        medicationId,
        medicationName: medName,
        date: selectedDate,
        timestamp: serverTimestamp(),
        status: 'taken'
      });
      
      Alert.alert('Success', `Marked ${medName} as taken for ${formatDate(selectedDate)}`);
    } catch (error) {
      console.error('Error marking dose:', error);
      Alert.alert('Error', 'Failed to mark dose as taken. Please try again.');
    }
  };

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
  };

  const getAdherenceColor = (rate) => {
    if (rate === 1) return '#4CAF50';
    if (rate >= 0.8) return '#FF9800';
    return '#FF5252';
  };

  const adherenceRate = selectedDayData ? 
    selectedDayData.totalMeds > 0 ? selectedDayData.takenMeds / selectedDayData.totalMeds : 0 : 0;

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const isPastDate = selectedDate < new Date().toISOString().split('T')[0];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          📅 Medication Calendar
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Track your daily medication adherence
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Calendar Container - No Card Wrapper */}
        <Surface style={styles.calendarContainer} elevation={3}>
          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>Perfect</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.legendText}>Good</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF5252' }]} />
              <Text style={styles.legendText}>Missed</Text>
            </View>
          </View>

          {/* Calendar */}
          <Calendar
            current={selectedDate}
            onDayPress={onDayPress}
            markedDates={{
              ...markedDates,
              [selectedDate]: {
                ...markedDates[selectedDate],
                customStyles: {
                  container: {
                    backgroundColor: markedDates[selectedDate]?.customStyles?.container?.backgroundColor || '#2196F3',
                    borderRadius: 18,
                    elevation: 4,
                    borderWidth: 3,
                    borderColor: '#fff'
                  },
                  text: {
                    color: '#fff',
                    fontWeight: 'bold'
                  }
                }
              }
            }}
            markingType={'custom'}
            theme={{
              calendarBackground: 'transparent',
              textSectionTitleColor: '#2196F3',
              textSectionTitleDisabledColor: '#d9e1e8',
              selectedDayBackgroundColor: '#2196F3',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#2196F3',
              dayTextColor: '#2d4150',
              textDisabledColor: '#d9e1e8',
              arrowColor: '#2196F3',
              disabledArrowColor: '#d9e1e8',
              monthTextColor: '#2196F3',
              indicatorColor: '#2196F3',
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '600',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14
            }}
            style={styles.calendar}
          />
        </Surface>

        {/* Selected Day Info - Streamlined Design */}
        {selectedDayData && (
          <View style={styles.dayInfoContainer}>
            {/* Date Header */}
            <View style={styles.dateHeader}>
              <Text variant="titleLarge" style={styles.selectedDateText}>
                {formatDate(selectedDate)}
              </Text>
              {isToday && (
                <Chip style={styles.todayChip} textStyle={{ color: '#fff' }}>
                  Today
                </Chip>
              )}
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <Surface style={[styles.statCard, { backgroundColor: getAdherenceColor(adherenceRate) }]} elevation={2}>
                <Text style={styles.statNumber}>
                  {Math.round(adherenceRate * 100)}%
                </Text>
                <Text style={styles.statLabel}>Adherence</Text>
              </Surface>
              
              <Surface style={styles.statCard} elevation={2}>
                <Text style={styles.statNumber}>
                  {selectedDayData.takenMeds}/{selectedDayData.totalMeds}
                </Text>
                <Text style={styles.statLabel}>Completed</Text>
              </Surface>
            </View>

            {/* Progress Bar */}
            <ProgressBar 
              progress={adherenceRate} 
              color={getAdherenceColor(adherenceRate)}
              style={styles.progressBar}
            />

            {/* Medications List */}
            <View style={styles.medicationsSection}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                💊 Medications for this day
              </Text>
              
              {selectedDayData.medications.length === 0 ? (
                <Surface style={styles.emptyState} elevation={1}>
                  <Text style={styles.emptyText}>
                    No medications scheduled for this day
                  </Text>
                  <Button
                    mode="outlined"
                    onPress={() => navigation.navigate('Meds', { screen: 'AddMed' })}
                    style={styles.addMedButton}
                  >
                    Add Medication
                  </Button>
                </Surface>
              ) : (
                selectedDayData.medications.map((med, index) => (
                  <Surface key={med.id} style={styles.medItem} elevation={2}>
                    <View style={styles.medRow}>
                      <View style={styles.medInfo}>
                        <Text variant="titleMedium" style={styles.medName}>
                          {med.name}
                        </Text>
                        <Text variant="bodyMedium" style={styles.medDetails}>
                          {med.dosage} • {formatTime(med.time)}
                        </Text>
                      </View>
                      
                      <View style={styles.medActions}>
                        <Chip
                          mode={med.taken ? 'flat' : 'outlined'}
                          style={[
                            styles.statusChip,
                            med.taken ? styles.takenChip : styles.pendingChip
                          ]}
                          textStyle={{ 
                            color: med.taken ? '#fff' : '#FF9800',
                            fontWeight: 'bold'
                          }}
                        >
                          {med.taken ? '✓ Taken' : '⏰ Pending'}
                        </Chip>
                        
                        {!med.taken && (isToday || isPastDate) && (
                          <Button
                            mode="contained"
                            compact
                            onPress={() => markDoseAsTaken(med.id, med.name)}
                            style={styles.markButton}
                          >
                            Mark Taken
                          </Button>
                        )}
                      </View>
                    </View>
                  </Surface>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="home"
        style={styles.fab}
        onPress={() => navigation.navigate('Home')}
        label="Home"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 3,
  },
  title: {
    textAlign: 'center',
    color: '#2196F3',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
  },
  calendarContainer: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#fff',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  calendar: {
    borderRadius: 10,
  },
  dayInfoContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  selectedDateText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  todayChip: {
    backgroundColor: '#2196F3',
  },
  quickStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 20,
  },
  medicationsSection: {
    gap: 12,
  },
  sectionTitle: {
    color: '#2196F3',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  addMedButton: {
    borderColor: '#2196F3',
  },
  medItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  medRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    color: '#333',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  medDetails: {
    color: '#666',
  },
  medActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusChip: {
    marginBottom: 8,
  },
  takenChip: {
    backgroundColor: '#4CAF50',
  },
  pendingChip: {
    borderColor: '#FF9800',
  },
  markButton: {
    backgroundColor: '#4CAF50',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});
