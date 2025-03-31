import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

type Student = {
  id: string;
  full_name: string;
  room_number?: string;
  attendance_percentage: number;
  pending_complaints: number;
};

type AdminTab = 'hostel-dashboard' | 'attendance' | 'complaints';

export default function AdminDashboard() {
  const router = useRouter();
  const segments = useSegments() as string[];
  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalComplaints: 0,
  });

  const isTabActive = (tabName: AdminTab) => {
    return segments.includes(tabName);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchAdminData(), fetchDashboardStats(), fetchStudents()]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: profile, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setAdminProfile(profile);
    } catch (error: any) {
      console.error('Error fetching admin data:', error.message);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data: studentData, error: studentError } = await supabase
        .from('student_profiles')
        .select('id, full_name, room_number, user_id');

      if (studentError) throw studentError;
      if (!studentData) return;

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('student_id, status');

      if (attendanceError) throw attendanceError;

      const { data: complaintsData, error: complaintsError } = await supabase
        .from('complaints')
        .select('student_id')
        .eq('status', 'pending');

      if (complaintsError) throw complaintsError;

      const formattedStudents = studentData.map(student => {
        const studentAttendance = attendanceData?.filter(a => a.student_id === student.user_id) || [];
        const presentCount = studentAttendance.filter(a => a.status === 'present').length;
        const attendancePercentage = studentAttendance.length > 0 
          ? Math.round((presentCount / studentAttendance.length) * 100)
          : 0;

        const pendingComplaints = complaintsData?.filter(c => c.student_id === student.user_id).length || 0;

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
      Alert.alert('Error', 'Failed to load student data');
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const { count: studentsCount } = await supabase
        .from('student_profiles')
        .select('*', { count: 'exact' });

      const { count: complaintsCount } = await supabase
        .from('complaints')
        .select('*', { count: 'exact' })
        .eq('status', 'pending');

      setStats({
        totalStudents: studentsCount || 0,
        totalComplaints: complaintsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      Alert.alert('Error', 'Failed to load dashboard statistics');
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

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <View style={styles.profileSection}>
          <Text style={styles.welcomeText}>
            Welcome, {adminProfile?.full_name || 'Admin'}
          </Text>
          <TouchableOpacity onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, isTabActive('hostel-dashboard') && styles.activeTab]}
            onPress={() => router.push('/(admin)/hostel-dashboard')}
          >
            <Text style={styles.tabText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, isTabActive('attendance') && styles.activeTab]}
            onPress={() => router.push('/(admin)/attendance')}
          >
            <Text style={styles.tabText}>Attendance</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton, 
              isTabActive('complaints') && styles.activeTab,
              stats.totalComplaints > 0 && styles.tabButtonAlert
            ]}
            onPress={() => router.push('/(admin)/complaints')}
          >
            <Text style={styles.tabText}>
              Complaints {stats.totalComplaints > 0 && `(${stats.totalComplaints})`}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalStudents}</Text>
            <Text style={styles.statLabel}>Total Students</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalComplaints}</Text>
            <Text style={styles.statLabel}>Pending Complaints</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Student Overview</Text>
        {students.map((student) => (
          <View key={student.id} style={styles.studentCard}>
            <View style={styles.studentHeader}>
              <Text style={styles.studentName}>{student.full_name}</Text>
              <Text style={styles.roomNumber}>
                Room {student.room_number || 'Not Assigned'}
              </Text>
            </View>
            <View style={styles.studentStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{student.attendance_percentage}%</Text>
                <Text style={styles.statLabel}>Attendance</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{student.pending_complaints}</Text>
                <Text style={styles.statLabel}>Complaints</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 40,
  },
  welcomeText: {
    fontSize: 24,
    fontFamily: 'Aeonik-Bold',
    color: '#333',
  },
  signOutText: {
    color: '#B3D8A8',
    fontFamily: 'Aeonik-Medium',
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  tabButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#B3D8A8',
    borderBottomWidth: 2,
    borderBottomColor: '#4a8c5e',
  },
  tabButtonAlert: {
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  tabText: {
    color: '#333',
    fontSize: 14,
    fontFamily: 'Aeonik-Medium',
  },
  text: {
    fontFamily: 'Aeonik-Regular',
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Aeonik-Bold',
    color: '#B3D8A8',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Aeonik-Bold',
    marginBottom: 15,
    color: '#333',
  },
  studentCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  studentName: {
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
    color: '#333',
  },
  roomNumber: {
    fontSize: 14,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
  },
  studentStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Aeonik-Bold',
    color: '#B3D8A8',
  },
});