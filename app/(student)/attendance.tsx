// app/(student)/attendance.tsx
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';

interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent';
  marked_by: string;
}

interface MonthSummary {
  month: string;
  present: number;
  total: number;
  percentage: number;
}

export default function StudentAttendance() {
  const router = useRouter();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthSummaries, setMonthSummaries] = useState<MonthSummary[]>([]);
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('attendance')
        .select('date, status, marked_by')
        .eq('student_id', userData.user.id)
        .order('date', { ascending: false });

      if (error) throw error;

      setAttendance(data || []);
      calculateMonthSummaries(data || []);
    } catch (error: any) {
      console.error('Error fetching attendance:', error.message);
      Alert.alert('Error', 'Failed to load attendance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateMonthSummaries = (records: AttendanceRecord[]) => {
    const summaries: Record<string, MonthSummary> = {};

    records.forEach(record => {
      const date = new Date(record.date);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!summaries[monthYear]) {
        summaries[monthYear] = {
          month: new Date(date.getFullYear(), date.getMonth(), 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          present: 0,
          total: 0,
          percentage: 0
        };
      }

      summaries[monthYear].total++;
      if (record.status === 'present') {
        summaries[monthYear].present++;
      }
    });

    Object.keys(summaries).forEach(key => {
      summaries[key].percentage = Math.round((summaries[key].present / summaries[key].total) * 100);
    });

    setMonthSummaries(Object.values(summaries).sort((a, b) => 
      new Date(b.month).getTime() - new Date(a.month).getTime()
    ));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAttendance();
  };

  const renderDailyItem = ({ item }: { item: AttendanceRecord }) => (
    <View style={styles.attendanceRow}>
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>
          {new Date(item.date).toLocaleDateString('en-US', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}
        </Text>
        <Text style={styles.markedByText}>
          {item.marked_by ? `Marked by: ${item.marked_by}` : 'Marked by: Admin'}
        </Text>
      </View>
      <View style={[
        styles.statusBadge,
        item.status === 'present' ? styles.presentBadge : styles.absentBadge
      ]}>
        <Text style={styles.statusText}>
          {item.status?.toUpperCase() || ''}
        </Text>
      </View>
    </View>
  );

  const renderMonthlyItem = ({ item }: { item: MonthSummary }) => (
    <View style={styles.monthRow}>
      <Text style={styles.monthText}>{item.month}</Text>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { 
                width: `${item.percentage}%`,
                backgroundColor: item.percentage >= 75 ? '#4CAF50' : '#F44336'
              }
            ]}
          />
        </View>
        <Text style={styles.percentageText}>
          {item.present}/{item.total} ({item.percentage}%)
        </Text>
      </View>
    </View>
  );

  const getOverallPercentage = () => {
    if (monthSummaries.length === 0) return 0;
    const totalPresent = monthSummaries.reduce((sum, month) => sum + month.present, 0);
    const totalDays = monthSummaries.reduce((sum, month) => sum + month.total, 0);
    return totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0;
  };

  const renderItem = ({ item }: { item: AttendanceRecord | MonthSummary }) => {
    if (activeTab === 'daily') {
      return renderDailyItem({ item: item as AttendanceRecord });
    }
    return renderMonthlyItem({ item: item as MonthSummary });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(student)/dashboard')}>
          <MaterialIcons name="arrow-back" size={24} color="#4A7043" />
        </TouchableOpacity>
        <Text style={styles.title}>My Attendance</Text>
        <View style={{ width: 24 }}>{null}</View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'daily' && styles.activeTab]}
          onPress={() => setActiveTab('daily')}
        >
          <Text style={[styles.tabText, activeTab === 'daily' && styles.activeTabText]}>
            Daily Records
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'monthly' && styles.activeTab]}
          onPress={() => setActiveTab('monthly')}
        >
          <Text style={[styles.tabText, activeTab === 'monthly' && styles.activeTabText]}>
            Monthly Summary
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'monthly' && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Overall Attendance</Text>
          <Text style={[
            styles.summaryPercentage,
            { color: getOverallPercentage() >= 75 ? '#4CAF50' : '#F44336' }
          ]}>
            {getOverallPercentage()}%
          </Text>
          <Text style={styles.summarySubtitle}>
            {getOverallPercentage() >= 75 ? 'Good attendance!' : 'Needs improvement'}
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#4A7043" style={styles.loader} />
      ) : (
        <FlatList<AttendanceRecord | MonthSummary>
          data={activeTab === 'daily' ? attendance : monthSummaries}
          renderItem={renderItem}
          keyExtractor={(item, index) => 
            activeTab === 'daily' 
              ? (item as AttendanceRecord).date 
              : `month-${(item as MonthSummary).month}-${index}`
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4A7043']}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No attendance records found
            </Text>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F5',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Aeonik-Bold',
    color: '#2F4F2F',
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#4A7043',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Aeonik-Medium',
    color: '#666',
  },
  activeTabText: {
    color: '#FFF',
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
    color: '#666',
    marginBottom: 8,
  },
  summaryPercentage: {
    fontSize: 36,
    fontFamily: 'Aeonik-Bold',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 14,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
  },
  listContent: {
    paddingBottom: 20,
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
    color: '#333',
    marginBottom: 4,
  },
  markedByText: {
    fontSize: 12,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  presentBadge: {
    backgroundColor: '#E8F5E9',
  },
  absentBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Aeonik-Medium',
  },
  monthRow: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  monthText: {
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
    color: '#333',
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#EEE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 14,
    fontFamily: 'Aeonik-Medium',
    color: '#666',
    minWidth: 100,
    textAlign: 'right',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Aeonik-Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
  loader: {
    marginTop: 40,
  },
});