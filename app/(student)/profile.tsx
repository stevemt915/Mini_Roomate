import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

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
  email?: string;
};

export default function StudentProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: profileData, error: profileError } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      setProfile({
        ...profileData,
        email: authUser?.email
      });
    } catch (error: any) {
      console.error('Error fetching profile:', error.message);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleEditProfile = () => {
    router.push('/(student)/edit-profile');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4A7043" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No profile data found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Profile</Text>
          <TouchableOpacity onPress={handleEditProfile}>
            <Text style={styles.editButton}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Text style={styles.label}>Full Name:</Text>
            <Text style={styles.value}>{profile.full_name || 'N/A'}</Text>
          </View>

          <View style={styles.profileRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{profile.email || 'N/A'}</Text>
          </View>

          <View style={styles.profileRow}>
            <Text style={styles.label}>Student ID:</Text>
            <Text style={styles.value}>{profile.id || 'N/A'}</Text>
          </View>

          <View style={styles.profileRow}>
            <Text style={styles.label}>Room Number:</Text>
            <Text style={styles.value}>{profile.room_number || 'Not Assigned'}</Text>
          </View>

          <View style={styles.profileRow}>
            <Text style={styles.label}>Batch:</Text>
            <Text style={styles.value}>{profile.batch || 'N/A'}</Text>
          </View>

          <View style={styles.profileRow}>
            <Text style={styles.label}>Hostel:</Text>
            <Text style={styles.value}>{profile.hostel_name || 'N/A'}</Text>
          </View>

          <View style={styles.profileRow}>
            <Text style={styles.label}>Phone Number:</Text>
            <Text style={styles.value}>{profile.phone_number || 'N/A'}</Text>
          </View>

          <View style={styles.profileRow}>
            <Text style={styles.label}>Date of Birth:</Text>
            <Text style={styles.value}>{formatDate(profile.date_of_birth)}</Text>
          </View>

          <View style={[styles.profileRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.label}>Address:</Text>
            <Text style={[styles.value, { textAlign: 'right', flex: 1 }]}>{profile.address || 'N/A'}</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Aeonik-Bold',
    color: '#2F4F2F',
  },
  editButton: {
    color: '#4A7043',
    fontFamily: 'Aeonik-Medium',
    fontSize: 16,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 16,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
    color: '#333',
  },
  errorText: {
    fontFamily: 'Aeonik-Regular',
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginTop: 20,
  },
});