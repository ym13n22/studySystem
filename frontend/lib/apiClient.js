import axios from 'axios';

// Backend URLs
const DEPLOYED_BACKEND_URL = 'https://studysystem-hbcw.onrender.com';
const LOCAL_BACKEND_URL = 'http://localhost:3001';
const LOCALHOST_API_URL = 'http://localhost:3001/api';

// Storage key for backend URL preference
const BACKEND_URL_KEY = 'backend_url';

// Get the preferred backend URL
function getBackendUrl() {
  const storedUrl = localStorage.getItem(BACKEND_URL_KEY);
  if (storedUrl) {
    return storedUrl;
  }
  return DEPLOYED_BACKEND_URL;
}

// Set the preferred backend URL
function setBackendUrl(url) {
  localStorage.setItem(BACKEND_URL_KEY, url);
}

// Test if a backend URL is reachable
async function testBackendUrl(url) {
  try {
    const response = await axios.get(`${url}/health`, { timeout: 3000 });
    return response.data.status === 'ok';
  } catch (error) {
    return false;
  }
}

// Get the working backend URL with fallback
async function getWorkingBackendUrl() {
  const storedUrl = localStorage.getItem(BACKEND_URL_KEY);
  
  // If we have a stored URL, use it
  if (storedUrl) {
    return storedUrl;
  }
  
  // Try deployed backend first
  const deployedWorks = await testBackendUrl(DEPLOYED_BACKEND_URL);
  if (deployedWorks) {
    setBackendUrl(DEPLOYED_BACKEND_URL);
    return DEPLOYED_BACKEND_URL;
  }
  
  // Fall back to localhost
  setBackendUrl(LOCAL_BACKEND_URL);
  return LOCAL_BACKEND_URL;
}

// Create axios instance with automatic fallback
const apiClient = axios.create({
  timeout: 10000,
});

// Request interceptor to add the correct base URL
apiClient.interceptors.request.use(async (config) => {
  const backendUrl = await getWorkingBackendUrl();
  config.baseURL = backendUrl;
  return config;
});

// Response interceptor to handle errors and fallback
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is a network error and we haven't retried yet
    if (!error.response && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Try falling back to localhost
      const currentBackend = localStorage.getItem(BACKEND_URL_KEY);
      if (currentBackend === DEPLOYED_BACKEND_URL) {
        console.log('Deployed backend failed, falling back to localhost');
        setBackendUrl(LOCAL_BACKEND_URL);
        
        // Retry the request with localhost
        originalRequest.baseURL = LOCAL_BACKEND_URL;
        return apiClient(originalRequest);
      }
    }
    
    return Promise.reject(error);
  }
);

// Export the api client and utility functions
export { apiClient, getBackendUrl, setBackendUrl, getWorkingBackendUrl };
