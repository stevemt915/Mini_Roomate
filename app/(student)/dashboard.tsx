import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  RefreshControl, 
  Modal, 
  TextInput,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  is_reminder: boolean;
  due_date?: string;
  payment_date?: string;
}

type StudentProfile = {
  id: string;
  full_name: string;
  room_number: string;
  user_id: string;
  batch: string;
  hostel_name: string;
  phone_number: string;
  date_of_birth: string;
  address: string;
};

const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

export default function StudentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [stats, setStats] = useState({
    totalAttendance: 0,
    activeComplaints: 0,
    resolvedComplaints: 0,
  });
  const [pendingReminders, setPendingReminders] = useState<Transaction[]>([]);
  const [isPaymentModalVisible, setPaymentModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [userId, setUserId] = useState('');
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    setupRealtime();
    return () => {
      supabase.removeAllChannels();
    };
  }, []);

  const setupRealtime = () => {
    const channel = supabase
      .channel('student_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance' },
        () => fetchStudentStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'complaints' },
        () => fetchStudentStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => fetchPendingReminders()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'student_profiles' },
        (payload) => {
          if (payload.new.room_number !== studentProfile?.room_number) {
            setStudentProfile(prev => prev ? { ...prev, room_number: payload.new.room_number } : null);
            Alert.alert('Room Update', `Your room has been changed to ${payload.new.room_number}`);
          }
        }
      )
      .subscribe();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStudentData(), 
        fetchStudentStats(), 
        fetchPendingReminders()
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: profile, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setStudentProfile(profile);
      setUserId(user.id);
    } catch (error: any) {
      console.error('Error fetching student data:', error.message);
    }
  };

  const fetchStudentStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { count: presentCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact' })
        .eq('student_id', user.id)
        .eq('status', 'present');

      const { count: totalCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact' })
        .eq('student_id', user.id);

      const { count: activeComplaints } = await supabase
        .from('complaints')
        .select('*', { count: 'exact' })
        .eq('student_id', user.id)
        .eq('status', 'pending');

      const { count: resolvedComplaints } = await supabase
        .from('complaints')
        .select('*', { count: 'exact' })
        .eq('student_id', user.id)
        .eq('status', 'resolved');

      const attendancePercentage = totalCount && totalCount > 0
        ? Math.round(((presentCount || 0) / totalCount) * 100)
        : 0;

      setStats({
        totalAttendance: attendancePercentage,
        activeComplaints: activeComplaints || 0,
        resolvedComplaints: resolvedComplaints || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPendingReminders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('student_id', user.id)
        .eq('is_reminder', true)
        .eq('status', 'pending');

      if (error) throw error;
      setPendingReminders(data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/(auth)/student');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handlePayment = async () => {
    if (!amount || isNaN(parseFloat(amount))) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    if (!selectedReminderId) {
      Alert.alert('Error', 'No reminder selected for payment.');
      return;
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'approved',
          payment_date: new Date().toISOString(),
          amount: parseFloat(amount),
          description: description || undefined,
        })
        .eq('id', selectedReminderId)
        .eq('student_id', userId);

      if (error) throw error;

      Alert.alert('Success', 'Payment approved successfully!');
      setAmount('');
      setDescription('');
      setSelectedReminderId(null);
      setPaymentModalVisible(false);
      fetchPendingReminders();
    } catch (error) {
      console.error('Error approving payment:', error);
      Alert.alert('Error', 'Failed to approve payment.');
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A7043" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
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
          tintColor="#4A7043"
        />
      }
    >
      <View style={styles.container}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View>
            <Text style={styles.welcomeText}>
              Welcome back,
            </Text>
            <Text style={styles.userNameText}>
              {studentProfile?.full_name || 'Student'}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={handleSignOut}
            style={styles.signOutButton}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, styles.activeTab]}
            onPress={() => router.push('/(student)/dashboard')}
          >
            <Text style={styles.tabTextActive}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => router.push('/(student)/attendance')}
          >
            <Text style={styles.tabText}>Attendance</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => router.push('/(student)/complaint')}
          >
            <Text style={styles.tabText}>Complaints</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => router.push('/(student)/profile')}
          >
            <Text style={styles.tabText}>Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalAttendance}%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
            {stats.totalAttendance < 75 && (
              <Text style={styles.warningText}>Improve needed</Text>
            )}
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.activeComplaints}</Text>
            <Text style={styles.statLabel}>Active Issues</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.resolvedComplaints}</Text>
            <Text style={styles.statLabel}>Resolved Issues</Text>
          </View>
        </View>

        {/* Student Info */}
        <Text style={styles.sectionTitle}>Your Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Room Number:</Text>
            <Text style={styles.infoValue}>{studentProfile?.room_number || 'Not Assigned'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Student ID:</Text>
            <Text style={styles.infoValue}>{studentProfile?.id || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Batch:</Text>
            <Text style={styles.infoValue}>{studentProfile?.batch || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Hostel:</Text>
            <Text style={styles.infoValue}>{studentProfile?.hostel_name || 'N/A'}</Text>
          </View>
        </View>

        {/* Pending Reminders */}
        <Text style={styles.sectionTitle}>Pending Payments</Text>
        {pendingReminders.length > 0 ? (
          <View style={styles.remindersContainer}>
            {pendingReminders.map((reminder) => (
              <View key={reminder.id} style={styles.reminderCard}>
                <View style={styles.reminderHeader}>
                  <Text style={styles.reminderDescription}>{reminder.description}</Text>
                  <Text style={styles.reminderAmount}>${reminder.amount.toFixed(2)}</Text>
                </View>
                {reminder.due_date && (
                  <Text style={styles.reminderDueDate}>
                    Due: {formatDate(reminder.due_date)}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.payReminderButton}
                  onPress={() => {
                    setAmount(reminder.amount.toString());
                    setDescription(reminder.description);
                    setSelectedReminderId(reminder.id);
                    setPaymentModalVisible(true);
                  }}
                >
                  <Text style={styles.payReminderButtonText}>Pay Now</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noRemindersContainer}>
            <Text style={styles.noRemindersText}>No pending payments</Text>
          </View>
        )}

        {/* Payment Modal */}
        <Modal
          visible={isPaymentModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setPaymentModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Confirm Payment</Text>
              
              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholderTextColor="#888"
              />
              
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter description"
                value={description}
                onChangeText={setDescription}
                placeholderTextColor="#888"
              />
              
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setPaymentModalVisible(false);
                    setSelectedReminderId(null);
                  }}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handlePayment}
                >
                  <Text style={styles.modalButtonText}>Confirm Payment</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F7F5',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F7F5',
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7F5',
  },
  loadingText: {
    fontFamily: 'Aeonik-Regular',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 15,
  },
  welcomeText: {
    fontSize: 18,
    fontFamily: 'Aeonik-Regular',
    color: '#555',
  },
  userNameText: {
    fontSize: 24,
    fontFamily: 'Aeonik-Bold',
    color: '#2F4F2F',
    marginTop: 4,
  },
  signOutButton: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  signOutText: {
    color: '#4A7043',
    fontFamily: 'Aeonik-Medium',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 25,
  },
  tabButton: {
    backgroundColor: '#E0E8DF',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#4A7043',
  },
  tabText: {
    color: '#333',
    fontSize: 14,
    fontFamily: 'Aeonik-Medium',
  },
  tabTextActive: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Aeonik-Medium',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
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
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
  },
  warningText: {
    fontSize: 12,
    fontFamily: 'Aeonik-Medium',
    color: '#F44336',
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Aeonik-Bold',
    color: '#2F4F2F',
    marginBottom: 15,
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 25,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    fontSize: 15,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
  },
  infoValue: {
    fontSize: 15,
    fontFamily: 'Aeonik-Medium',
    color: '#333',
  },
  remindersContainer: {
    marginBottom: 20,
  },
  reminderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reminderDescription: {
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
    color: '#333',
    flex: 1,
  },
  reminderAmount: {
    fontSize: 18,
    fontFamily: 'Aeonik-Bold',
    color: '#FFA500',
    marginLeft: 10,
  },
  reminderDueDate: {
    fontSize: 14,
    fontFamily: 'Aeonik-Regular',
    color: '#FF6B6B',
    marginBottom: 12,
  },
  payReminderButton: {
    backgroundColor: '#4A7043',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  payReminderButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Aeonik-Medium',
  },
  noRemindersContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noRemindersText: {
    fontSize: 16,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    padding: 20,
    backgroundColor: '#F5F7F5',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Aeonik-Bold',
    color: '#2F4F2F',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Aeonik-Medium',
    color: '#555',
    marginBottom: 8,
    marginLeft: 5,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 20,
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    fontFamily: 'Aeonik-Regular',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  confirmButton: {
    backgroundColor: '#4A7043',
  },
  modalButtonText: {
    fontFamily: 'Aeonik-Medium',
    fontSize: 15,
    color: '#fff',
  },
});