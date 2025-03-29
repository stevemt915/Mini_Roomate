// app/(student)/attendance.tsx
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent';
}

export default function StudentAttendance() {
  const router = useRouter();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.error('User not authenticated');
      return;
    }

    const { data, error } = await supabase
      .from('attendance')
      .select('date, status')
      .eq('student_id', userData.user.id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching attendance:', error.message);
    } else {
      setAttendance(data || []);
    }
  };

  const renderAttendance = ({ item }: { item: AttendanceRecord }) => (
    <View style={styles.attendanceRow}>
      <Text style={styles.dateText}>{item.date}</Text>
      <Text style={[styles.statusText, item.status === 'present' ? styles.present : styles.absent]}>
        {item.status}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Attendance</Text>
      <FlatList
        data={attendance}
        renderItem={renderAttendance}
        keyExtractor={(item) => item.date}
        style={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No attendance records yet.</Text>}
      />
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push('/(student)/dashboard')}
      >
        <Text style={styles.backButtonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Aeonik-Bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  list: {
    width: '100%',
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  dateText: {
    fontSize: 16,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
  },
  statusText: {
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
    textTransform: 'capitalize',
  },
  present: {
    color: '#B3D8A8',
  },
  absent: {
    color: '#D9534F',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#B3D8A8',
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
  },
});