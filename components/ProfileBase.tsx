import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';

type ProfileBaseProps = {
  roleSpecificContent: React.ReactNode;
};

export function ProfileBase({ roleSpecificContent }: ProfileBaseProps) {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profile Information</Text>
      
      <View style={styles.profileItem}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user?.email}</Text>
      </View>

      {roleSpecificContent}

      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={logout}
      >
        <Text style={styles.logoutButtonText}>Logout</Text>
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
  header: {
    fontSize: 24,
    fontFamily: 'Aeonik-Bold',
    marginBottom: 30,
    color: '#4A7043',
    textAlign: 'center',
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  label: {
    fontFamily: 'Aeonik-Medium',
    fontSize: 16,
    color: '#555',
  },
  value: {
    fontFamily: 'Aeonik-Regular',
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#F5F7F5',
    padding: 15,
    borderRadius: 8,
    marginTop: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4A7043',
  },
  logoutButtonText: {
    color: '#4A7043',
    fontFamily: 'Aeonik-Medium',
    fontSize: 16,
  },
});