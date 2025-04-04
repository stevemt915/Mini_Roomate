import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  student_id: string;
  status: 'pending' | 'approved' | 'rejected';
  payment_date: string | null;
  is_reminder: boolean;
  student?: { full_name: string };
};

export default function AdminTransactions() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved'>('all');

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('transactions')
        .select(`
          id,
          date,
          description,
          amount,
          student_id,
          status,
          payment_date,
          is_reminder,
          student_profiles (full_name)
        `)
        .order('date', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = data.map((item: any) => ({
        ...item,
        student: item.student_profiles,
      }));

      setTransactions(formattedData);
      setFilteredTransactions(formattedData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredTransactions(transactions);
      return;
    }

    const filtered = transactions.filter(
      (txn) =>
        (txn.student?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.student_id.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredTransactions(filtered);
  }, [searchQuery, transactions]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/(auth)/admin');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'approved': return '#4CAF50';
      case 'rejected': return '#F44336';
      default: return '#666';
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <Text style={styles.studentName}>{item.student?.full_name || 'Unknown Student'}</Text>
        <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
      
      <View style={styles.transactionDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Student ID:</Text>
          <Text style={styles.detailValue}>{item.student_id}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount:</Text>
          <Text style={styles.amountText}>${item.amount.toFixed(2)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Description:</Text>
          <Text style={styles.detailValue} numberOfLines={2}>{item.description}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        
        {item.payment_date && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Paid on:</Text>
            <Text style={styles.detailValue}>
              {new Date(item.payment_date).toLocaleDateString()}
            </Text>
          </View>
        )}
        
        {item.is_reminder && (
          <View style={styles.reminderBadge}>
            <Text style={styles.reminderBadgeText}>REMINDER</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A7043" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2F4F2F" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Transaction Management</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={24} color="#4A7043" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, ID or description"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#888"
        />
        
        <View style={styles.statusFilterContainer}>
          {['all', 'pending', 'approved'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusFilterButton,
                statusFilter === status && styles.activeStatusFilter
              ]}
              onPress={() => setStatusFilter(status as 'all' | 'pending' | 'approved')}
            >
              <Text style={styles.statusFilterText}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Transactions List */}
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {transactions.length === 0 
              ? 'No transactions found' 
              : 'No transactions match your search'}
          </Text>
        }
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#4A7043']}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F5',
  },
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerText: {
    fontSize: 20,
    fontFamily: 'Aeonik-Bold',
    color: '#2F4F2F',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  signOutButton: {
    padding: 4,
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  statusFilterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statusFilterButton: {
    flex: 1,
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#E0E8DF',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  activeStatusFilter: {
    backgroundColor: '#4A7043',
  },
  statusFilterText: {
    fontSize: 14,
    fontFamily: 'Aeonik-Medium',
    color: '#333',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  transactionCard: {
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
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  studentName: {
    fontSize: 16,
    fontFamily: 'Aeonik-Bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginLeft: 8,
  },
  transactionDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Aeonik-Medium',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  amountText: {
    fontSize: 16,
    fontFamily: 'Aeonik-Bold',
    color: '#4A7043',
    textAlign: 'right',
    flex: 1,
  },
  reminderBadge: {
    backgroundColor: '#FFECB3',
    padding: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  reminderBadgeText: {
    fontSize: 12,
    fontFamily: 'Aeonik-Medium',
    color: '#FFA000',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 32,
  },
});