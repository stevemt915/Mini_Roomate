import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  Modal, 
  TextInput, 
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

type Student = {
  id: string;
  full_name: string;
  room_number?: string;
  attendance_percentage: number;
  pending_complaints: number;
  pending_payments: number;
  user_id: string;
};

type Room = {
  id: string;
  room_number: string;
  capacity: number;
  current_occupancy: number;
  hostel_name: string;
};

type AdminTab = 'hostel-dashboard' | 'attendance' | 'complaints' | 'profile' | 'transactions';

export default function HostelDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalComplaints: 0,
    pendingPayments: 0,
  });
  const [activeTab, setActiveTab] = useState<AdminTab>('hostel-dashboard');
  const [isReminderModalVisible, setReminderModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reminderAmount, setReminderAmount] = useState('');
  const [reminderDescription, setReminderDescription] = useState('');
  const [reminderDueDate, setReminderDueDate] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isRoomModalVisible, setRoomModalVisible] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [roomLoading, setRoomLoading] = useState(false);

  const isTabActive = (tabName: AdminTab) => activeTab === tabName;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const profile = await fetchAdminData();
      if (!profile) {
        console.error('Failed to load admin profile, aborting loadData');
        Alert.alert('Error', 'Failed to load admin profile');
        return;
      }
      await Promise.all([fetchDashboardStats(), fetchStudents(), fetchRooms()]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const fetchAdminData = async () => {
    try {
      console.log('Fetching admin user data...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('Auth error or no user:', authError?.message || 'No user found');
        throw new Error('No authenticated user found');
      }
      console.log('Authenticated user ID:', user.id);

      console.log('Fetching admin profile for user_id:', user.id);
      const { data: profile, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching admin profile:', error.message);
        throw error;
      }
      if (!profile) {
        console.error('No admin profile found for user_id:', user.id);
        throw new Error('Admin profile not found');
      }

      console.log('Fetched admin profile:', profile);
      setAdminProfile(profile);
      return profile;
    } catch (error: any) {
      console.error('Error in fetchAdminData:', error.message);
      Alert.alert('Error', 'Failed to load admin profile: ' + error.message);
      return null;
    }
  };

  const fetchStudents = async () => {
    try {
      const { data: studentData, error: studentError } = await supabase
        .from('student_profiles')
        .select('id, full_name, room_number, user_id');

      if (studentError) throw studentError;
      if (!studentData) return;

      const [
        { data: attendanceData, error: attendanceError },
        { data: complaintsData, error: complaintsError },
        { data: pendingPayments, error: paymentsError }
      ] = await Promise.all([
        supabase.from('attendance').select('student_id, status'),
        supabase.from('complaints').select('student_id').eq('status', 'pending'),
        supabase.from('transactions').select('student_id').eq('status', 'pending')
      ]);

      if (attendanceError) throw attendanceError;
      if (complaintsError) throw complaintsError;
      if (paymentsError) throw paymentsError;

      const formattedStudents = studentData.map(student => {
        const studentAttendance = attendanceData?.filter(a => a.student_id === student.user_id) || [];
        const presentCount = studentAttendance.filter(a => a.status === 'present').length;
        const attendancePercentage = studentAttendance.length > 0 
          ? Math.round((presentCount / studentAttendance.length) * 100)
          : 0;

        const pendingComplaints = complaintsData?.filter(c => c.student_id === student.user_id).length || 0;
        const pendingPaymentCount = pendingPayments?.filter(p => p.student_id === student.user_id).length || 0;

        return {
          id: student.id,
          user_id: student.user_id,
          full_name: student.full_name,
          room_number: student.room_number,
          attendance_percentage: attendancePercentage,
          pending_complaints: pendingComplaints,
          pending_payments: pendingPaymentCount,
        };
      });

      setStudents(formattedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      Alert.alert('Error', 'Failed to load student data');
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const [
        { count: studentsCount },
        { count: complaintsCount },
        { count: paymentsCount }
      ] = await Promise.all([
        supabase.from('student_profiles').select('*', { count: 'exact' }),
        supabase.from('complaints').select('*', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('transactions').select('*', { count: 'exact' }).eq('status', 'pending')
      ]);

      setStats({
        totalStudents: studentsCount || 0,
        totalComplaints: complaintsCount || 0,
        pendingPayments: paymentsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      Alert.alert('Error', 'Failed to load dashboard statistics');
    }
  };

  const fetchRooms = async () => {
    try {
      // Ensure adminProfile is loaded and has hostel_name
      if (!adminProfile || !adminProfile.hostel_name) {
        console.log('Admin profile not loaded or missing hostel_name, fetching...');
        const profile = await fetchAdminData();
        if (!profile || !profile.hostel_name) {
          console.error('Failed to load admin profile with hostel_name');
          Alert.alert('Error', 'Unable to load hostel information. Please try again.');
          setRooms([]);
          return;
        }
      }

      console.log('Fetching room numbers from student_profiles for hostel:', adminProfile.hostel_name);
      const { data: studentRooms, error: studentError } = await supabase
        .from('student_profiles')
        .select('room_number')
        .neq('room_number', null);

      if (studentError) throw studentError;
      if (!studentRooms || studentRooms.length === 0) {
        console.log('No rooms assigned to students in student_profiles');
        setRooms([]);
        return;
      }

      const roomNumbers = [...new Set(studentRooms.map(r => r.room_number))];
      console.log('Distinct room numbers from student_profiles:', roomNumbers);

      const { data: occupancyData, error: occupancyError } = await supabase
        .from('student_profiles')
        .select('room_number', { count: 'exact' })
        .neq('room_number', null)
        .in('room_number', roomNumbers);

      if (occupancyError) throw occupancyError;

      const occupancyMap = new Map<string, number>();
      occupancyData.forEach(row => {
        occupancyMap.set(row.room_number, (occupancyMap.get(row.room_number) || 0) + 1);
      });
      console.log('Occupancy per room:', Object.fromEntries(occupancyMap));

      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('hostel_name', adminProfile.hostel_name)
        .in('room_number', roomNumbers);

      if (roomError) throw roomError;
      console.log('Existing rooms from rooms table:', roomData);

      const allRooms: Room[] = roomNumbers.map(roomNumber => {
        const existingRoom = roomData?.find(r => r.room_number === roomNumber);
        if (existingRoom) {
          return existingRoom;
        }
        return {
          id: `temp-${roomNumber}`,
          room_number: roomNumber,
          capacity: 2, // Default capacity
          current_occupancy: occupancyMap.get(roomNumber) || 0,
          hostel_name: adminProfile.hostel_name,
        };
      });

      console.log('Combined room details:', allRooms);
      setRooms(allRooms);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      Alert.alert('Error', 'Failed to load room data from student profiles');
      setRooms([]);
    }
  };

  const refreshRooms = useCallback(async () => {
    setRoomLoading(true);
    try {
      await fetchRooms();
    } finally {
      setRoomLoading(false);
    }
  }, [adminProfile?.hostel_name]);

  const sendReminder = async () => {
    if (!selectedStudent || !reminderAmount || !reminderDescription || !reminderDueDate) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (!adminProfile?.user_id) {
      Alert.alert('Error', 'Admin profile not loaded');
      return;
    }

    if (isNaN(parseFloat(reminderAmount)) || parseFloat(reminderAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const dueDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dueDateRegex.test(reminderDueDate)) {
      Alert.alert('Error', 'Due date must be in YYYY-MM-DD format');
      return;
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .insert([{
          description: reminderDescription,
          amount: parseFloat(reminderAmount),
          date: new Date().toISOString().split('T')[0],
          due_date: reminderDueDate,
          student_id: selectedStudent.user_id,
          is_reminder: true,
          status: 'pending',
          admin_id: adminProfile.user_id
        }]);

      if (error) throw error;

      Alert.alert('Success', 'Reminder sent successfully');
      setReminderModalVisible(false);
      setSelectedStudent(null);
      setReminderAmount('');
      setReminderDescription('');
      setReminderDueDate('');
      fetchDashboardStats();
      fetchStudents();
    } catch (error) {
      console.error('Error sending reminder:', error);
      Alert.alert('Error', 'Failed to send reminder');
    }
  };

  const allotRoom = async () => {
    if (!selectedStudent || !selectedRoomId) {
      Alert.alert('Error', 'Please select a student and room');
      return;
    }
  
    try {
      let selectedRoomData = rooms.find(r => r.id === selectedRoomId);
      if (!selectedRoomData) {
        throw new Error('Selected room not found in local state');
      }
  
      // Check room capacity
      if (selectedRoomData.current_occupancy >= selectedRoomData.capacity) {
        Alert.alert('Error', `Room ${selectedRoomData.room_number} is full`);
        await fetchRooms();
        return;
      }
  
      // Rest of your function remains the same...
      const currentRoomNumber = selectedStudent.room_number;
      let currentRoom: Room | null = null;
      if (currentRoomNumber) {
        const existingRoom = rooms.find(r => r.room_number === currentRoomNumber);
        if (existingRoom) {
          currentRoom = existingRoom;
        } else {
          const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('room_number', currentRoomNumber)
            .eq('hostel_name', adminProfile.hostel_name)
            .single();
          if (!error && data) currentRoom = data;
        }
      }
  
      const { error: updateStudentError } = await supabase
        .from('student_profiles')
        .update({ room_number: selectedRoomData.room_number })
        .eq('user_id', selectedStudent.user_id);
  
      if (updateStudentError) throw updateStudentError;
  
      if (!selectedRoomData.id.startsWith('temp-')) {
        const { error: newRoomError } = await supabase
          .from('rooms')
          .update({ current_occupancy: selectedRoomData.current_occupancy + 1 })
          .eq('id', selectedRoomId)
          .eq('current_occupancy', selectedRoomData.current_occupancy);
  
        if (newRoomError) throw newRoomError;
      }
  
      if (currentRoom && currentRoom.room_number !== selectedRoomData.room_number && currentRoom.current_occupancy > 0) {
        if (!currentRoom.id.startsWith('temp-')) {
          const { error: oldRoomError } = await supabase
            .from('rooms')
            .update({ current_occupancy: currentRoom.current_occupancy - 1 })
            .eq('id', currentRoom.id);
  
          if (oldRoomError) throw oldRoomError;
        }
      }
  
      Alert.alert('Success', `Room ${selectedRoomData.room_number} allotted successfully`);
      setRoomModalVisible(false);
      setSelectedStudent(null);
      setSelectedRoomId('');
      await Promise.all([fetchStudents(), fetchRooms()]);
    } catch (error) {
      console.error('Error allotting room:', error);
      Alert.alert('Error', 'Failed to allot room. Please try again.');
      await fetchRooms();
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/(auth)/admin');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A7043" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.scrollView}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          colors={['#4A7043']}
        />
      }
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>
            Welcome, {adminProfile?.full_name || 'Admin'}
          </Text>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <Ionicons name="log-out-outline" size={24} color="#4A7043" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          {(['hostel-dashboard', 'attendance', 'complaints', 'transactions', 'profile'] as AdminTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                isTabActive(tab) && styles.activeTab,
                (tab === 'complaints' && stats.totalComplaints > 0) && styles.tabButtonAlert,
                (tab === 'transactions' && stats.pendingPayments > 0) && styles.tabButtonAlert
              ]}
              onPress={() => {
                if (tab === 'attendance' || tab === 'complaints' || tab === 'transactions') {
                  router.push(`/(admin)/${tab}`);
                } else {
                  setActiveTab(tab);
                }
              }}
            >
              <Text style={styles.tabText}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {(tab === 'complaints' && stats.totalComplaints > 0) && ` (${stats.totalComplaints})`}
                {(tab === 'transactions' && stats.pendingPayments > 0) && ` (${stats.pendingPayments})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'profile' ? (
          <View style={styles.profileCard}>
            <Text style={styles.sectionTitle}>Profile Details</Text>
            {[
              { label: 'Full Name', value: adminProfile?.full_name },
              { label: 'Hostel Name', value: adminProfile?.hostel_name },
              { label: 'Phone Number', value: adminProfile?.phone_number },
              { 
                label: 'Birth Date', 
                value: adminProfile?.birth_date ? new Date(adminProfile.birth_date).toLocaleDateString() : undefined 
              },
              { label: 'Address', value: adminProfile?.address }
            ].map((item, index) => (
              <View key={index} style={styles.profileItem}>
                <Text style={styles.label}>{item.label}:</Text>
                <Text style={styles.value}>{item.value || 'Not provided'}</Text>
              </View>
            ))}
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => router.push('/(admin)/edit-profile')}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.statsContainer}>
              {[
                { value: stats.totalStudents, label: 'Total Students' },
                { value: stats.totalComplaints, label: 'Pending Complaints' },
                { value: stats.pendingPayments, label: 'Pending Payments' }
              ].map((stat, index) => (
                <View key={index} style={styles.statCard}>
                  <Text style={styles.statNumber}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Student Overview</Text>
            {students.length > 0 ? (
              students.map((student) => (
                <View key={student.id} style={styles.studentCard}>
                  <View style={styles.studentHeader}>
                    <Text style={styles.studentName}>{student.full_name}</Text>
                    <Text style={styles.roomNumber}>
                      Room {student.room_number || 'Not Assigned'}
                    </Text>
                  </View>
                  <View style={styles.studentStats}>
                    {[
                      { value: `${student.attendance_percentage}%`, label: 'Attendance' },
                      { value: student.pending_complaints, label: 'Complaints' },
                      { value: student.pending_payments, label: 'Payments' }
                    ].map((stat, index) => (
                      <View key={index} style={styles.statItem}>
                        <Text style={styles.statValue}>{stat.value}</Text>
                        <Text style={styles.statLabel}>{stat.label}</Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity 
                    style={styles.reminderButton}
                    onPress={() => {
                      setSelectedStudent(student);
                      setReminderModalVisible(true);
                    }}
                  >
                    <Text style={styles.reminderButtonText}>Send Fee Reminder</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.roomButton}
                    onPress={async () => {
                      console.log('Selected student:', student);
                      setSelectedStudent(student);
                      await refreshRooms();
                      console.log('Current rooms state:', rooms);
                      setRoomModalVisible(true);
                    }}
                  >
                    <Text style={styles.roomButtonText}>
                      {student.room_number ? 'Change Room' : 'Allot Room'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No students found</Text>
            )}
          </>
        )}
      </View>

      <Modal
        visible={isReminderModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReminderModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Send Fee Reminder to {selectedStudent?.full_name}
              </Text>
              <TouchableOpacity 
                onPress={() => setReminderModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Amount"
              value={reminderAmount}
              onChangeText={setReminderAmount}
              keyboardType="numeric"
              placeholderTextColor="#888"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Description"
              value={reminderDescription}
              onChangeText={setReminderDescription}
              placeholderTextColor="#888"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Due Date (YYYY-MM-DD)"
              value={reminderDueDate}
              onChangeText={setReminderDueDate}
              placeholderTextColor="#888"
            />
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setReminderModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.sendButton}
                onPress={sendReminder}
              >
                <Text style={styles.sendButtonText}>Send Reminder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isRoomModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRoomModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedStudent?.room_number ? 'Change Room' : 'Allot Room'} for {selectedStudent?.full_name}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  console.log('Closing modal. Current rooms:', rooms);
                  setRoomModalVisible(false);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {roomLoading ? (
              <ActivityIndicator size="large" color="#4A7043" style={{ marginVertical: 20 }} />
            ) : rooms.length > 0 ? (
              <>
                {(() => {
                  const availableRooms = rooms.filter(room => 
                    room.current_occupancy < room.capacity || 
                    (selectedStudent?.room_number === room.room_number && room.current_occupancy <= room.capacity)
                  );
                  console.log('Available rooms for Picker:', availableRooms);
                  return (
                    <>
                      <Picker
                        selectedValue={selectedRoomId}
                        onValueChange={(itemValue: string) => setSelectedRoomId(itemValue)}
                        style={styles.picker}
                      >
                        <Picker.Item label="Select a room" value="" />
                        {availableRooms.map((room) => (
                          <Picker.Item 
                            key={room.id}
                            label={`${room.room_number} (${room.current_occupancy}/${room.capacity}) - ${room.hostel_name}`}
                            value={room.id}
                          />
                        ))}
                      </Picker>
                      
                      <Text style={styles.roomStatusTitle}>
                        Existing Rooms in {adminProfile?.hostel_name} (from Student Profiles):
                      </Text>
                      <ScrollView style={{ maxHeight: 150, marginBottom: 10 }}>
                        {availableRooms.length > 0 ? (
                          availableRooms.map((room) => (
                            <Text key={room.id} style={styles.roomStatusText}>
                              • {room.room_number}: {room.current_occupancy}/{room.capacity} beds 
                              {selectedStudent?.room_number === room.room_number ? ' (Current)' : ''}
                            </Text>
                          ))
                        ) : (
                          <Text style={styles.noRoomsText}>No available rooms</Text>
                        )}
                      </ScrollView>
                      
                      <View style={styles.modalButtonContainer}>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => setRoomModalVisible(false)}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.sendButton, { opacity: selectedRoomId ? 1 : 0.5 }]}
                          onPress={allotRoom}
                          disabled={!selectedRoomId}
                        >
                          <Text style={styles.sendButtonText}>
                            {selectedStudent?.room_number ? 'Change Room' : 'Allot Room'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  );
                })()}
              </>
            ) : (
              <View style={styles.noRoomsContainer}>
                <Text style={styles.noRoomsText}>No rooms assigned in student profiles</Text>
                <Text style={styles.noRoomsSubtext}>
                  {adminProfile?.hostel_name 
                    ? `No students registered to rooms in ${adminProfile.hostel_name}`
                    : 'Hostel information not loaded'}
                </Text>
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={refreshRooms}
                >
                  <Text style={styles.refreshButtonText}>
                    <Ionicons name="refresh" size={16} /> Refresh Rooms
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Aeonik-Regular',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F7F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F7F5',
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  welcomeText: {
    fontSize: 22,
    fontFamily: 'Aeonik-Bold',
    color: '#2F4F2F',
    flex: 1,
  },
  signOutButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  tabButton: {
    backgroundColor: '#E0E8DF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 110,
  },
  activeTab: {
    backgroundColor: '#4A7043',
  },
  tabButtonAlert: {
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  tabText: {
    color: '#333',
    fontSize: 14,
    fontFamily: 'Aeonik-Medium',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Aeonik-Bold',
    color: '#4A7043',
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Aeonik-Bold',
    color: '#2F4F2F',
    marginBottom: 16,
  },
  studentCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  studentName: {
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
    color: '#333',
    flex: 1,
  },
  roomNumber: {
    fontSize: 14,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
    marginLeft: 8,
  },
  studentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Aeonik-Bold',
    color: '#4A7043',
  },
  reminderButton: {
    backgroundColor: '#4A7043',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  reminderButtonText: {
    color: '#fff',
    fontFamily: 'Aeonik-Medium',
    fontSize: 14,
  },
  roomButton: {
    backgroundColor: '#4A7043',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  roomButtonText: {
    color: '#fff',
    fontFamily: 'Aeonik-Medium',
    fontSize: 14,
  },
  profileCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileItem: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
    color: '#333',
  },
  editButton: {
    backgroundColor: '#4A7043',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Aeonik-Bold',
    color: '#2F4F2F',
    flex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  picker: {
    width: '100%',
    marginBottom: 16,
  },
  noRoomsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noRoomsText: {
    fontSize: 16,
    fontFamily: 'Aeonik-Bold',
    color: '#666',
    marginBottom: 8,
  },
  noRoomsSubtext: {
    fontSize: 14,
    fontFamily: 'Aeonik-Regular',
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: '#E0E8DF',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonText: {
    color: '#4A7043',
    fontFamily: 'Aeonik-Medium',
    fontSize: 14,
    marginLeft: 5,
  },
  roomStatusTitle: {
    fontSize: 16,
    fontFamily: 'Aeonik-Bold',
    color: '#2F4F2F',
    marginTop: 10,
    marginBottom: 5,
  },
  roomStatusText: {
    fontSize: 14,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
    marginBottom: 5,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  sendButton: {
    backgroundColor: '#4A7043',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
  },
  cancelButton: {
    backgroundColor: '#E0E8DF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#2F4F2F',
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
  },
});