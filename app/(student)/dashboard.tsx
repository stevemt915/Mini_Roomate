import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

type StudentProfile = {
  id: string;
  full_name: string;
  room_number: string;
  user_id: string;
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
        { event: '*', schema: 'public', table: 'notifications' },
        () => fetchStudentStats()
      )
      .subscribe();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchStudentData(), fetchStudentStats()]);
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
    } catch (error: any) {
      console.error('Error fetching student data:', error.message);
    }
  };

  const fetchStudentStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Get attendance stats
      const { count: presentCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact' })
        .eq('student_id', user.id)
        .eq('status', 'present');

      const { count: totalCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact' })
        .eq('student_id', user.id);

      // Get complaint stats
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

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.scrollView}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.container}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Text style={styles.welcomeText}>
            Welcome, {studentProfile?.full_name || 'Student'}
          </Text>
          <TouchableOpacity onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, styles.activeTab]}
            onPress={() => router.push('/(student)/dashboard')}
          >
            <Text style={styles.tabText}>Home</Text>
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
            onPress={() => router.push('/(student)/notifications')}
          >
            <Text style={styles.tabText}>Notifications</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalAttendance}%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
            {stats.totalAttendance < 75 && (
              <Text style={styles.warningText}>Low attendance!</Text>
            )}
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.activeComplaints}</Text>
            <Text style={styles.statLabel}>Active Complaints</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.resolvedComplaints}</Text>
            <Text style={styles.statLabel}>Resolved Complaints</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/(student)/complaint')}
          >
            <Text style={styles.actionButtonText}>Submit Complaint</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/(student)/attendance')}
          >
            <Text style={styles.actionButtonText}>View Attendance</Text>
          </TouchableOpacity>
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
        </View>
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
  },
  profileSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 40,
  },
  welcomeText: {
    fontSize: 24,
    fontFamily: 'Aeonik-Bold',
    color: '#2F4F2F',
  },
  signOutText: {
    color: '#4A7043',
    fontFamily: 'Aeonik-Medium',
    fontSize: 16,
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
    paddingHorizontal: 15,
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
  text: {
    fontFamily: 'Aeonik-Regular',
    fontSize: 16,
    color: '#666',
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
    padding: 15,
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
  actionsContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 25,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4A7043',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontFamily: 'Aeonik-Medium',
    fontSize: 14,
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
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    fontSize: 16,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
    color: '#333',
  },
});
