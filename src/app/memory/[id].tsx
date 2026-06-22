import { useLocalSearchParams } from 'expo-router';

import { MemoryDetailScreen } from '@/screens/MemoryDetailScreen';

export default function MemoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MemoryDetailScreen id={id} />;
}
