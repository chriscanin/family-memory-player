import { useLocalSearchParams } from 'expo-router';

import { MemoryDetailScreen } from '@/features/detail/MemoryDetailScreen';

export default function MemoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MemoryDetailScreen id={id} />;
}
