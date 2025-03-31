import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

type Student = {
  id: string;
  full_name: string;
  room_number: string;
  attendance_percentage: number;
  pending_complaints: number;
};

export default function Students() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStudents();
    setupRealtime();
    
    return () => {
      supabase.removeAllChannels();
    };
  }, []);

  const setupRealtime = () => {
    const channel = supabase
      .channel('students_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_profiles' },
        () => fetchStudents()
      )
      .subscribe();
  };

  const fetchStudents = async () => {
    try {
      setRefreshing(true);
      
      // Fetch student profiles
      const { data: studentData, error: studentError } = await supabase
        .from('student_profiles')
        .select('id, full_name, room_number, user_id');

      if (studentError) throw studentError;

      // Fetch attendance data
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('student_id, status');

      if (attendanceError) throw attendanceError;

      // Fetch complaint data
      const { data: complaintsData, error: complaintsError } = await supabase
        .from('complaints')
        .select('student_id, status')
        .eq('status', 'pending');

      if (complaintsError) throw complaintsError;

      const formattedStudents: Student[] = (studentData || []).map((student) => {
        const attendanceRecords = (attendanceData || []).filter(
          (a) => a.student_id === student.user_id
        );
        const presentCount = attendanceRecords.filter((a) => a.status === 'present').length;
        const totalCount = attendanceRecords.length;
        const attendancePercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

        const pendingComplaints = (complaintsData || []).filter(
          (c) => c.student_id === student.user_id
        ).length;

        return {
          id: student.id,
          full_name: student.full_name,
          room_number: student.room_number,
          attendance_percentage: attendancePercentage,
          pending_complaints: pendingComplaints,
        };
      });

      setStudents(formattedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStudentPress = (studentId: string) => {
    router.push(`/(admin)/student-details/${studentId}`);
  };

  const renderStudentItem = ({ item }: { item: Student }) => (
    <TouchableOpacity
      style={styles.studentCard}
      onPress={() => handleStudentPress(item.id)}
    >
      <Text style={styles.studentName}>{item.full_name}</Text>
      <View style={styles.studentInfo}>
        <Text style={styles.roomNumber}>Room {item.room_number}</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[
              styles.statValue,
              item.attendance_percentage < 75 && styles.lowStat
            ]}>
              {item.attendance_percentage}%
            </Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.pending_complaints}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A7043" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Students</Text>
      <FlatList
        data={students}
        renderItem={renderStudentItem}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={fetchStudents}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No students found</Text>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
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
  listContent: {
    paddingBottom: 20,
  },
  studentCard: {
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
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  studentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomNumber: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A7043',
  },
  lowStat: {
    color: '#F44336',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
});