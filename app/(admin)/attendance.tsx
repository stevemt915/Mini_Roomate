import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, FlatList } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

// Define student type for clarity
type Student = {
  user_id: string; // Maps to student_id in attendance
  full_name: string;
  room_number: string;
  status: 'present' | 'absent' | null;
};

export default function Attendance() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch students on component mount
  useEffect(() => {
    fetchStudents();
  }, []);

  // Retrieve student data from student_profiles
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('student_profiles')
        .select('user_id, full_name, room_number');
      if (error) throw error;

      // Initialize each student with no status
      const initializedStudents = data.map((student: any) => ({
        ...student,
        status: null,
      }));
      setStudents(initializedStudents);
    } catch (error: any) {
      Alert.alert('Error', `Failed to fetch students: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Update student status in local state
  const markAttendance = (user_id: string, status: 'present' | 'absent') => {
    setStudents((prevStudents) =>
      prevStudents.map((student) =>
        student.user_id === user_id ? { ...student, status } : student
      )
    );
  };

  // Save attendance records to Supabase
  const saveAttendance = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Admin not authenticated');

      const today = new Date().toISOString().split('T')[0];
      const attendanceRecords = students
        .filter((student) => student.status !== null)
        .map((student) => ({
          student_id: student.user_id,
          date: today,
          status: student.status,
          marked_by: user.id,
        }));

      const { error } = await supabase
        .from('attendance')
        .upsert(attendanceRecords, { onConflict: 'student_id,date' });

      if (error) throw error;

      Alert.alert('Success', 'Attendance saved successfully!', [
        { text: 'OK', onPress: () => router.push('/(admin)/hostel-dashboard') },
      ]);
    } catch (error: any) {
      console.error('Save Attendance Error:', error);
      Alert.alert('Error', `Failed to save attendance: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Render each student row with room, name, status buttons, and date
  const renderStudent = ({ item }: { item: Student }) => (
    <View style={styles.studentRow}>
      <Text style={styles.roomCell}>{item.room_number}</Text>
      <Text style={styles.nameCell} numberOfLines={1} ellipsizeMode="tail">
        {item.full_name}
      </Text>
      <View style={styles.statusContainer}>
        <TouchableOpacity
          style={[
            styles.statusButton,
            item.status === 'present' && styles.presentButton,
          ]}
          onPress={() => markAttendance(item.user_id, 'present')}
        >
          <Text style={styles.buttonText}>Present</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.statusButton,
            item.status === 'absent' && styles.absentButton,
          ]}
          onPress={() => markAttendance(item.user_id, 'absent')}
        >
          <Text style={styles.buttonText}>Absent</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.dateCell}>{new Date().toISOString().split('T')[0]}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mark Attendance</Text>
      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={styles.headerRoomCell}>Room No</Text>
        <Text style={styles.headerNameCell}>Name</Text>
        <Text style={styles.headerStatusCell}>Status</Text>
        <Text style={styles.headerDateCell}>Date</Text>
      </View>
      {/* Student List */}
      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : (
        <FlatList
          data={students}
          renderItem={renderStudent}
          keyExtractor={(item) => item.user_id}
          ListEmptyComponent={<Text style={styles.emptyText}>No students found</Text>}
        />
      )}
      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, loading && styles.buttonDisabled]}
        onPress={saveAttendance}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>Save Attendance</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F7F5',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Aeonik-Bold',
    color: '#4A7043',
    marginBottom: 20,
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#A8D5A2',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  headerRoomCell: {
    flex: 0.8,
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
    color: '#2F4F2F',
    textAlign: 'center',
  },
  headerNameCell: {
    flex: 2.5,
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
    color: '#2F4F2F',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  headerStatusCell: {
    flex: 2,
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
    color: '#2F4F2F',
    textAlign: 'center',
  },
  headerDateCell: {
    flex: 1.2,
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
    color: '#2F4F2F',
    textAlign: 'center',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D3E0D3',
  },
  roomCell: {
    flex: 0.8,
    fontSize: 14,
    fontFamily: 'Aeonik-Regular',
    color: '#333',
    textAlign: 'center',
  },
  nameCell: {
    flex: 2.5,
    fontSize: 14,
    fontFamily: 'Aeonik-Regular',
    color: '#333',
    paddingHorizontal: 4,
  },
  statusContainer: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  dateCell: {
    flex: 1.2,
    fontSize: 14,
    fontFamily: 'Aeonik-Regular',
    color: '#333',
    textAlign: 'center',
  },
  statusButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
    minWidth: 70,
  },
  presentButton: {
    backgroundColor: '#4CAF50',
  },
  absentButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    fontSize: 12,
    fontFamily: 'Aeonik-Medium',
    color: '#fff',
    textAlign: 'center',
  },
  saveButton: {
    padding: 15,
    backgroundColor: '#4A7043',
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
    color: '#fff',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
});