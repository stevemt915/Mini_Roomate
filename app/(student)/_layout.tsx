import { Stack } from 'expo-router';

export default function StudentLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#4A7043' }, headerTintColor: '#fff' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="attendance" options={{ title: 'Attendance' }} />
    </Stack>
  );
}