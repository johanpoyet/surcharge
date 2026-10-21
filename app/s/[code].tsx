import { Redirect, useLocalSearchParams } from 'expo-router';

/** Lien d'invitation https://johanpoyet.fr/s/{code} (universal link / App Link). */
export default function InviteLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <Redirect href={{ pathname: '/friends/add', params: { code } }} />;
}
