import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';

type Notification = {
  id: string;
  message: string;
  created_at: string;
  is_read: boolean;
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('id, message, created_at, is_read')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      console.error('Fetch Notifications Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <View style={styles.notificationRow}>
      <Text style={styles.message}>{item.message}</Text>
      <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>No notifications</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F7F5', // Light background
  },
  title: {
    fontSize: 28,
    fontFamily: 'Aeonik-Bold',
    color: '#4A7043',
    marginBottom: 20,
    textAlign: 'center',
  },
  notificationRow: {
    padding: 15,
    backgroundColor: '#fff', // White background for cards
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  message: {
    fontSize: 16,
    fontFamily: 'Aeonik-Regular',
    color: '#333', // Dark text for visibility
  },
  date: {
    fontSize: 12,
    fontFamily: 'Aeonik-Regular',
    color: '#666', // Slightly lighter for date
    marginTop: 5,
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