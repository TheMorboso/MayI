// app/index.tsx
import { Redirect } from 'expo-router';
import React from 'react';

export default function IndexScreen() {
  return <Redirect href="/(tabs)/matches" />;
}
