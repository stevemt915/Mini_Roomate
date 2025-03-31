import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

type Student = {
  id: string;
  full_name: string;
  room_number: string;
  email: string;
  phone_number: string;
  attendance_percentage: number;
  pending_complaints: number;
};

export default function StudentDetails() {
  const { id } = useLocalSearchParams();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch student profile
        const { data: profile, error: profileError } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (profileError) throw profileError;

        // Fetch attendance stats
        const { count: presentCount } = await supabase
          .from('attendance')
          .select('*', { count: 'exact' })
          .eq('student_id', profile.user_id)
          .eq('status', 'present');

        const { count: totalCount } = await supabase
          .from('attendance')
          .select('*', { count: 'exact' })
          .eq('student_id', profile.user_id);

        // Fetch complaints
        const { count: pendingComplaints } = await supabase
          .from('complaints')
          .select('*', { count: 'exact' })
          .eq('student_id', profile.user_id)
          .eq('status', 'pending');

        const attendancePercentage = totalCount && totalCount > 0
          ? Math.round(((presentCount || 0) / totalCount) * 100)
          : 0;

        setStudent({
          id: profile.id,
          full_name: profile.full_name,
          room_number: profile.room_number,
          email: profile.email,
          phone_number: profile.phone_number,
          attendance_percentage: attendancePercentage,
          pending_complaints: pendingComplaints || 0,
        });
      } catch (error) {
        console.error('Error fetching student details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentDetails();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A7043" />
      </View>
    );
  }

  if (!student) {
    return (
      <View style={styles.container}>
        <Text>Student not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{student.full_name}</Text>
      
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Room Number:</Text>
          <Text style={styles.value}>{student.room_number}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{student.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Phone:</Text>
          <Text style={styles.value}>{student.phone_number}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{student.attendance_percentage}%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{student.pending_complaints}</Text>
            <Text style={styles.statLabel}>Pending Complaints</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F7F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2F4F2F',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A7043',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A7043',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
});