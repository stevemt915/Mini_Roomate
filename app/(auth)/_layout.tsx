import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="admin-login" />
      <Stack.Screen name="admin-signup" />
      <Stack.Screen name="student-login" />
      <Stack.Screen name="student-signup" />
      <Stack.Screen name="select-role" />
    </Stack>
  );
}