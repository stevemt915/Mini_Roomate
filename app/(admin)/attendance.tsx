import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, FlatList, TextInput } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';

type Student = {
  user_id: string;
  full_name: string;
  room_number: string;
  status: 'present' | 'absent' | null;
};

type AttendanceRecord = {
  student_id: string;
  date: string;
  status: 'present' | 'absent';
  marked_by: string;
};

export default function Attendance() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [viewMode, setViewMode] = useState<'mark' | 'view'>('mark');

  // Fetch students and attendance data
  useEffect(() => {
    fetchStudents();
    if (viewMode === 'view') {
      fetchAttendanceData();
    }
  }, [selectedDate, viewMode]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      let query = supabase.from('student_profiles').select('user_id, full_name, room_number');
      
      if (roomFilter) {
        query = query.eq('room_number', roomFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

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

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('date', dateStr);

      if (error) throw error;

      setStudents(prevStudents => 
        prevStudents.map(student => {
          const record = data.find((r: any) => r.student_id === student.user_id);
          return {
            ...student,
            status: record?.status || null
          };
        })
      );
    } catch (error: any) {
      Alert.alert('Error', `Failed to fetch attendance: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = (user_id: string, status: 'present' | 'absent') => {
    setStudents(prevStudents =>
      prevStudents.map(student =>
        student.user_id === user_id ? { ...student, status } : student
      )
    );
  };

  const markAll = (status: 'present' | 'absent') => {
    setStudents(prevStudents =>
      prevStudents.map(student => ({
        ...student,
        status
      }))
    );
  };

  const saveAttendance = async () => {
    try {
      const unmarkedStudents = students.filter(s => s.status === null);
      if (unmarkedStudents.length > 0) {
        Alert.alert(
          'Incomplete Attendance',
          `You have ${unmarkedStudents.length} unmarked students. Are you sure you want to proceed?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Save Anyway', onPress: () => confirmSaveAttendance() }
          ]
        );
      } else {
        await confirmSaveAttendance();
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to save attendance: ${error.message}`);
    }
  };

  const confirmSaveAttendance = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Admin not authenticated');

      const dateStr = selectedDate.toISOString().split('T')[0];
      const attendanceRecords = students
        .filter(student => student.status !== null)
        .map(student => ({
          student_id: student.user_id,
          date: dateStr,
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

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         student.room_number.includes(searchQuery);
    return matchesSearch;
  });

  const renderStudent = ({ item }: { item: Student }) => (
    <View style={styles.studentRow}>
      <Text style={styles.roomCell}>{item.room_number}</Text>
      <Text style={styles.nameCell} numberOfLines={1} ellipsizeMode="tail">
        {item.full_name}
      </Text>
      <View style={styles.statusContainer}>
        {viewMode === 'mark' ? (
          <>
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
          </>
        ) : (
          <Text style={[
            styles.statusText,
            item.status === 'present' && styles.presentText,
            item.status === 'absent' && styles.absentText
          ]}>
            {item.status || 'Not marked'}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {viewMode === 'mark' ? 'Mark Attendance' : 'View Attendance'}
      </Text>

      {/* Date Selection */}
      <View style={styles.dateRow}>
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateText}>
            {selectedDate.toLocaleDateString()}
          </Text>
          <MaterialIcons name="edit-calendar" size={20} color="#4A7043" />
        </TouchableOpacity>
        
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'mark' && styles.activeToggle]}
            onPress={() => setViewMode('mark')}
          >
            <Text style={styles.toggleText}>Mark</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'view' && styles.activeToggle]}
            onPress={() => setViewMode('view')}
          >
            <Text style={styles.toggleText}>View</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}

      {/* Filters */}
      <View style={styles.filterRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or room"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TextInput
          style={styles.roomInput}
          placeholder="Filter by room"
          value={roomFilter}
          onChangeText={setRoomFilter}
          keyboardType="numeric"
        />
      </View>

      {/* Bulk Actions */}
      {viewMode === 'mark' && (
        <View style={styles.bulkActions}>
          <TouchableOpacity
            style={styles.bulkButton}
            onPress={() => markAll('present')}
          >
            <Text style={styles.bulkButtonText}>Mark All Present</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bulkButton, styles.bulkAbsent]}
            onPress={() => markAll('absent')}
          >
            <Text style={styles.bulkButtonText}>Mark All Absent</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={styles.headerRoomCell}>Room</Text>
        <Text style={styles.headerNameCell}>Name</Text>
        <Text style={styles.headerStatusCell}>Status</Text>
      </View>

      {/* Student List */}
      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : (
        <FlatList
          data={filteredStudents}
          renderItem={renderStudent}
          keyExtractor={(item) => item.user_id}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {students.length === 0 ? 'No students found' : 'No matching students'}
            </Text>
          }
        />
      )}

      {/* Save Button */}
      {viewMode === 'mark' && (
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.buttonDisabled]}
          onPress={saveAttendance}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            Save Attendance for {selectedDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
      )}
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
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  dateText: {
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
    color: '#2F4F2F',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  activeToggle: {
    backgroundColor: '#4A7043',
  },
  toggleText: {
    fontFamily: 'Aeonik-Medium',
    color: '#333',
  },
  activeToggleText: {
    color: '#fff',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  searchInput: {
    flex: 2,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D3E0D3',
    fontFamily: 'Aeonik-Regular',
  },
  roomInput: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D3E0D3',
    fontFamily: 'Aeonik-Regular',
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  bulkButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
  },
  bulkAbsent: {
    backgroundColor: '#F44336',
  },
  bulkButtonText: {
    color: '#fff',
    fontFamily: 'Aeonik-Medium',
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
  statusText: {
    fontSize: 14,
    fontFamily: 'Aeonik-Medium',
  },
  presentText: {
    color: '#4CAF50',
  },
  absentText: {
    color: '#F44336',
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