import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

type Complaint = {
  id: string;
  student_id: string;
  student_name: string;
  room_number: string;
  description: string;
  status: 'pending' | 'resolved';
  created_at: string;
};

export default function ComplaintsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  useEffect(() => {
    fetchComplaints();
  }, [filter]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('complaints')
        .select(`
          id,
          description,
          status,
          created_at,
          student_profiles:student_id (user_id, full_name, room_number)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedComplaints = data.map((complaint: any) => ({
        id: complaint.id,
        student_id: complaint.student_id,
        student_name: complaint.student_profiles?.full_name || 'Unknown',
        room_number: complaint.student_profiles?.room_number || 'N/A',
        description: complaint.description,
        status: complaint.status,
        created_at: new Date(complaint.created_at).toLocaleDateString(),
      }));

      setComplaints(formattedComplaints);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch complaints');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateComplaintStatus = async (id: string, status: 'pending' | 'resolved') => {
    try {
      const updates = {
        status,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null
      };

      const { error } = await supabase
        .from('complaints')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      fetchComplaints();
      Alert.alert('Success', `Complaint marked as ${status}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update complaint');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading complaints...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <Text style={styles.title}>Complaints Management</Text>
        
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
            onPress={() => setFilter('all')}
          >
            <Text style={styles.filterText}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'pending' && styles.activeFilter]}
            onPress={() => setFilter('pending')}
          >
            <Text style={styles.filterText}>Pending</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'resolved' && styles.activeFilter]}
            onPress={() => setFilter('resolved')}
          >
            <Text style={styles.filterText}>Resolved</Text>
          </TouchableOpacity>
        </View>

        {complaints.length === 0 ? (
          <Text style={styles.noComplaints}>No complaints found</Text>
        ) : (
          complaints.map((complaint) => (
            <View key={complaint.id} style={styles.complaintCard}>
              <View style={styles.complaintHeader}>
                <Text style={styles.complaintTitle}>{complaint.student_name} (Room {complaint.room_number})</Text>
                <Text style={[
                  styles.statusBadge,
                  complaint.status === 'pending' ? styles.statusPending : styles.statusResolved
                ]}>
                  {complaint.status}
                </Text>
              </View>
              
              <Text style={styles.complaintDescription}>{complaint.description}</Text>
              
              <View style={styles.complaintFooter}>
                <Text style={styles.complaintDate}>Submitted: {complaint.created_at}</Text>
                
                <View style={styles.actionButtons}>
                  {complaint.status === 'pending' && (
                    <TouchableOpacity
                      style={[styles.statusButton, styles.resolveButton]}
                      onPress={() => updateComplaintStatus(complaint.id, 'resolved')}
                    >
                      <Text style={styles.buttonText}>Mark Resolved</Text>
                    </TouchableOpacity>
                  )}
                  {complaint.status === 'resolved' && (
                    <TouchableOpacity
                      style={[styles.statusButton, styles.pendingButton]}
                      onPress={() => updateComplaintStatus(complaint.id, 'pending')}
                    >
                      <Text style={styles.buttonText}>Reopen</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))
        )}
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
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  filterButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  activeFilter: {
    backgroundColor: '#B3D8A8',
  },
  filterText: {
    fontSize: 14,
    color: '#333',
  },
  noComplaints: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  complaintCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  complaintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  complaintTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  statusPending: {
    backgroundColor: '#ffecb3',
    color: '#ff9800',
  },
  statusResolved: {
    backgroundColor: '#c8e6c9',
    color: '#4caf50',
  },
  complaintDescription: {
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  complaintFooter: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  complaintDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statusButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  resolveButton: {
    backgroundColor: '#B3D8A8',
  },
  pendingButton: {
    backgroundColor: '#bbdefb',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});