import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminProfile() {
  const router = useRouter();
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
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
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
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
        <Text style={styles.text}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Profile</Text>
          <TouchableOpacity onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileItem}>
            <Text style={styles.label}>Full Name:</Text>
            <Text style={styles.value}>{adminProfile?.full_name || 'Not provided'}</Text>
          </View>

          <View style={styles.profileItem}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{adminProfile?.user_id || 'Not provided'}</Text>
          </View>

          <View style={styles.profileItem}>
            <Text style={styles.label}>Hostel Name:</Text>
            <Text style={styles.value}>{adminProfile?.hostel_name || 'Not provided'}</Text>
          </View>

          <View style={styles.profileItem}>
            <Text style={styles.label}>Phone Number:</Text>
            <Text style={styles.value}>{adminProfile?.phone_number || 'Not provided'}</Text>
          </View>

          <View style={styles.profileItem}>
            <Text style={styles.label}>Birth Date:</Text>
            <Text style={styles.value}>
              {adminProfile?.birth_date ? new Date(adminProfile.birth_date).toLocaleDateString() : 'Not provided'}
            </Text>
          </View>

          <View style={styles.profileItem}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{adminProfile?.address || 'Not provided'}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => router.push('/(admin)/edit-profile')}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Aeonik-Bold',
    color: '#333',
  },
  signOutText: {
    color: '#B3D8A8',
    fontFamily: 'Aeonik-Medium',
  },
  profileCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profileItem: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
    color: '#333',
  },
  editButton: {
    backgroundColor: '#4A7043',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
  },
  text: {
    fontFamily: 'Aeonik-Regular',
    fontSize: 16,
    color: '#666',
  },
});