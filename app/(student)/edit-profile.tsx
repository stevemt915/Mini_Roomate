import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';

type ProfileData = {
  full_name: string;
  room_number: string;
  batch: string;
  hostel_name: string;
  phone_number: string;
  date_of_birth: string;
  address: string;
};

export default function EditProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    room_number: '',
    batch: '',
    hostel_name: '',
    phone_number: '',
    date_of_birth: new Date().toISOString(),
    address: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: profileData, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setProfile({
        full_name: profileData.full_name,
        room_number: profileData.room_number,
        batch: profileData.batch,
        hostel_name: profileData.hostel_name,
        phone_number: profileData.phone_number,
        date_of_birth: profileData.date_of_birth,
        address: profileData.address,
      });

    } catch (error: any) {
      console.error('Error fetching profile:', error.message);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setProfile({ ...profile, date_of_birth: selectedDate.toISOString() });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('student_profiles')
        .update({
          full_name: profile.full_name,
          room_number: profile.room_number,
          batch: profile.batch,
          hostel_name: profile.hostel_name,
          phone_number: profile.phone_number,
          date_of_birth: profile.date_of_birth,
          address: profile.address,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully');
      router.back();

    } catch (error: any) {
      console.error('Error updating profile:', error.message);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4A7043" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <Text style={styles.title}>Edit Profile</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={profile.full_name}
            onChangeText={(text) => setProfile({ ...profile, full_name: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Room Number</Text>
          <TextInput
            style={styles.input}
            value={profile.room_number}
            onChangeText={(text) => setProfile({ ...profile, room_number: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Batch</Text>
          <TextInput
            style={styles.input}
            value={profile.batch}
            onChangeText={(text) => setProfile({ ...profile, batch: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hostel Name</Text>
          <TextInput
            style={styles.input}
            value={profile.hostel_name}
            onChangeText={(text) => setProfile({ ...profile, hostel_name: text })}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={profile.phone_number}
            onChangeText={(text) => setProfile({ ...profile, phone_number: text })}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowDatePicker(true)}
          >
            <Text>{new Date(profile.date_of_birth).toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={new Date(profile.date_of_birth)}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
            value={profile.address}
            onChangeText={(text) => setProfile({ ...profile, address: text })}
            multiline
          />
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
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
  title: {
    fontSize: 24,
    fontFamily: 'Aeonik-Bold',
    color: '#2F4F2F',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
    color: '#666',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    fontFamily: 'Aeonik-Regular',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#4A7043',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontFamily: 'Aeonik-Medium',
    fontSize: 16,
  },
});