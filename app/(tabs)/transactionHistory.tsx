import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchTransactions();
    }
  }, [userId]);

  const fetchUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('student_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error.message);
      Alert.alert('Error', 'Failed to load transactions');
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  const approvePayment = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ 
          status: 'approved',
          payment_date: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (error) throw error;

      await fetchTransactions();
      Alert.alert('Success', 'Payment approved successfully');
    } catch (error) {
      console.error('Error approving payment:', error);
      Alert.alert('Error', 'Failed to approve payment');
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={[
      styles.transactionCard,
      item.status === 'approved' && styles.approvedCard,
      item.status === 'pending' && styles.pendingCard
    ]}>
      <View style={styles.transactionInfo}>
        <Text style={styles.description}>{item.description}</Text>
        <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
        
        {item.due_date && (
          <Text style={styles.dueDate}>Due: {new Date(item.due_date).toLocaleDateString()}</Text>
        )}
        
        {item.status === 'approved' && item.payment_date && (
          <Text style={styles.paidDate}>Paid on: {new Date(item.payment_date).toLocaleDateString()}</Text>
        )}
      </View>
      
      <View style={styles.amountContainer}>
        <Text style={[
          styles.amount,
          item.status === 'approved' ? styles.amountPaid : styles.amountPending
        ]}>
          ${item.amount.toFixed(2)}
        </Text>
        
        {item.status === 'pending' && item.is_reminder && (
          <TouchableOpacity 
            style={styles.approveButton}
            onPress={() => approvePayment(item.id)}
          >
            <Text style={styles.approveButtonText}>Approve</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(student)/dashboard')}>
        <Ionicons name="arrow-back" size={24} color="#2F4F2F" />
      </TouchableOpacity>

      <Text style={styles.title}>Transaction History</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#2F4F2F" style={styles.loader} />
      ) : transactions.length > 0 ? (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <Text style={styles.noTransactionsText}>No transactions found</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F5',
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Aeonik-Bold',
    color: '#2F4F2F',
    marginBottom: 20,
    marginTop: 60,
    textAlign: 'center',
  },
  loader: {
    marginTop: 50,
  },
  list: {
    paddingBottom: 20,
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  approvedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  transactionInfo: {
    flex: 1,
    marginRight: 10,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
    color: '#333',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
    marginBottom: 4,
  },
  dueDate: {
    fontSize: 13,
    fontFamily: 'Aeonik-Regular',
    color: '#FF6B6B',
    marginTop: 4,
  },
  paidDate: {
    fontSize: 13,
    fontFamily: 'Aeonik-Regular',
    color: '#4CAF50',
    marginTop: 4,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontFamily: 'Aeonik-Bold',
    marginBottom: 8,
  },
  amountPaid: {
    color: '#4CAF50',
  },
  amountPending: {
    color: '#FFA500',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  approveButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Aeonik-Medium',
  },
  noTransactionsText: {
    fontSize: 16,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
});