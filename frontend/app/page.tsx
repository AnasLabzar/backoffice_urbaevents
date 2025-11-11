import { redirect } from 'next/navigation';


export default function Home() {
  // Automatically redirect to the login page
  redirect('/login');

  // Had l-code l-te7tani ma ghadi y-t-executa 7it redirect 7bess kolchi
  return null;
}