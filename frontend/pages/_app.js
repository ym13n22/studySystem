import '../styles/globals.css';
import Header from '../components/Header';
import { UserProvider } from '../context/UserContext';

function MyApp({ Component, pageProps }) {
  return (
    <UserProvider>
      <Header />
      <Component {...pageProps} />
    </UserProvider>
  );
}

export default MyApp;
