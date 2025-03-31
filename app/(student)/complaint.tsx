import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

export default function Complaint() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const submitComplaint = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a complaint');
      return;
    }

    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('complaints')
        .insert({
          student_id: user.id,
          description,
          status: 'pending',
        });

      if (error) throw error;

      Alert.alert('Success', 'Complaint submitted successfully!', [
        { text: 'OK', onPress: () => router.push('/(student)/dashboard') },
      ]);
      setDescription('');
    } catch (error: any) {
      console.error('Submit Complaint Error:', error);
      Alert.alert('Error', `Failed to submit complaint: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Submit a Complaint</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Describe your concern..."
        placeholderTextColor="#999"
        multiline
        numberOfLines={5}
        value={description}
        onChangeText={setDescription}
      />
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.buttonDisabled]}
        onPress={submitComplaint}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Submitting...' : 'Submit Complaint'}
        </Text>
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
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D3E0D3',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    fontFamily: 'Aeonik-Regular',
    color: '#333', // Ensures text is visible
    textAlignVertical: 'top',
    marginBottom: 20,
    minHeight: 150,
  },
  submitButton: {
    padding: 15,
    backgroundColor: '#4A7043',
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
    color: '#fff',
  },
});