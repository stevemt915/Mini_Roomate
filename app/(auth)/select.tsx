import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

interface Role {
  id: string;
  title: string;
  route: '/admin' | '/student'; // Updated to login routes
}

export default function SelectRole() {
  const router = useRouter();

  const roles: Role[] = [
    { id: 'admin', title: 'Hostel Admin/Warden', route: '/admin' },
    { id: 'student', title: 'Hostel Student', route: '/student' },
  ] as const; // `as const` ensures literal types

  const handleRoleSelect = (route: Role['route']) => {
    router.push(route);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your Role</Text>
      <View style={styles.inputContainer}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role.id}
            style={styles.button}
            onPress={() => handleRoleSelect(role.route)}
          >
            <Text style={styles.buttonText}>{role.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F5',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Aeonik-Bold',
    marginBottom: 30,
    color: '#4A7043',
  },
  inputContainer: {
    width: '100%',
    gap: 15,
    marginBottom: 25,
  },
  button: {
    backgroundColor: '#4A7043',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Aeonik-Medium',
  },
});