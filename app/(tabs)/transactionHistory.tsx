import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // For the back arrow icon
import { supabase } from '../../lib/supabase';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
}

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error.message);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionRow}>
      <Text style={styles.date}>{item.date || 'N/A'}</Text>
      <Text style={styles.description}>{item.description || 'No Description'}</Text>
      <Text style={styles.amount}>${item.amount ? item.amount.toFixed(2) : '0.00'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Backward Action Arrow */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(student)/dashboard')}>
        <Ionicons name="arrow-back" size={24} color="#2F4F2F" />
      </TouchableOpacity>

      {/* Title */}
      <Text style={styles.title}>Transaction History</Text>

      {/* Transaction List */}
      {loading ? (
        <ActivityIndicator size="large" color="#2F4F2F" />
      ) : transactions.length > 0 ? (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={styles.list}
        />
      ) : (
        <Text style={styles.noTransactionsText}>No transactions found.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 10,
    zIndex: 10,
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Aeonik-Bold',
    color: '#2F4F2F',
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 50, // Adjusted to fit below the back button
  },
  list: {
    paddingBottom: 20,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  date: {
    fontSize: 14,
    fontFamily: 'Aeonik-Regular',
    color: '#888',
    flex: 1,
    textAlign: 'left',
  },
  description: {
    fontSize: 16,
    fontFamily: 'Aeonik-Regular',
    flex: 2,
    textAlign: 'left',
  },
  amount: {
    fontSize: 16,
    fontFamily: 'Aeonik-Bold',
    flex: 1,
    textAlign: 'right',
    color: '#4CAF50',
  },
  noTransactionsText: {
    fontSize: 16,
    fontFamily: 'Aeonik-Regular',
    textAlign: 'center',
    color: '#888',
    marginTop: 20,
  },
});