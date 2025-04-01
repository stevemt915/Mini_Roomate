import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
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

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.error('User not authenticated');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('id, description, amount, date')
      .eq('user_id', userData.user.id)
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
      <Text style={styles.description}>{item.description}</Text>
      <Text style={styles.amount}>${item.amount.toFixed(2)}</Text>
      <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transaction History</Text>
      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={styles.list}
        />
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
  title: {
    fontSize: 24,
    fontFamily: 'Aeonik-Bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  list: {
    width: '100%',
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  description: {
    fontSize: 16,
    fontFamily: 'Aeonik-Regular',
    flex: 2,
  },
  amount: {
    fontSize: 16,
    fontFamily: 'Aeonik-Bold',
    flex: 1,
    textAlign: 'right',
    color: '#4CAF50',
  },
  date: {
    fontSize: 14,
    fontFamily: 'Aeonik-Regular',
    flex: 1,
    textAlign: 'right',
    color: '#888',
  },
});