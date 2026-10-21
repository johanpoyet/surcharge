import { Redirect, useLocalSearchParams } from 'expo-router';

/** Lien de secours surcharge://add/{code}. */
export default function InviteScheme() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <Redirect href={{ pathname: '/friends/add', params: { code } }} />;
}
