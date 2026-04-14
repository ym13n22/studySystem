import axios from 'axios';

// Backend URL from environment variable
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// Get the backend URL
function getBackendUrl() {
  return BACKEND_URL;
}

const apiClient = axios.create({
  baseURL: BACKEND_URL,
});

// Export the api client and utility function
export { apiClient, getBackendUrl };
