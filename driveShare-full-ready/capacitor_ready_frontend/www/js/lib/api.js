import { getApiBaseUrl } from './config.js';
import { clearSession, getToken, parseJwt, getCurrentUser, saveSession } from './session.js';

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401) clearSession();
    throw new Error(data?.error || data?.message || 'Erro ao comunicar com o servidor.');
  }

  return data;
}

export async function registerUser(payload) {
  const data = await apiFetch('/users/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return data;
}

export async function loginUser({ email, password }) {
  const data = await apiFetch('/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  const jwtData = parseJwt(data.token) || {};
  const cached = getCurrentUser();
  const sessionUser = {
    id: jwtData.userId || cached.id || '',
    email: email || jwtData.email || cached.email || '',
    name: cached.name || email?.split('@')[0] || 'Utilizador',
    phone: cached.phone || ''
  };

  saveSession(data.token, sessionUser);
  return { ...data, user: sessionUser };
}

export async function createRide({ from, to, date, totalSeats }) {
  return apiFetch('/rides', {
    method: 'POST',
    body: JSON.stringify({ from, to, date, totalSeats })
  });
}

export async function getRides() {
  return apiFetch('/rides');
}

export async function getMyRides() {
  return apiFetch('/rides/my-rides');
}

export async function getJoinedRides() {
  return apiFetch('/rides/joined-rides');
}

export async function getRideById(rideId) {
  const rides = await getRides();
  return rides.find((ride) => String(ride._id) === String(rideId)) || null;
}

export async function requestRide(rideId, payload) {
  return apiFetch(`/rides/${rideId}/request`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getRideRequests(rideId) {
  return apiFetch(`/rides/${rideId}/requests`);
}

export async function acceptRideRequest(rideId, requestId) {
  return apiFetch(`/rides/${rideId}/requests/${requestId}/accept`, { method: 'POST' });
}

export async function rejectRideRequest(rideId, requestId) {
  return apiFetch(`/rides/${rideId}/requests/${requestId}/reject`, { method: 'POST' });
}

export async function cancelRideParticipation(rideId) {
  return apiFetch(`/rides/${rideId}/cancel`, { method: 'POST' });
}

export async function deleteRide(rideId) {
  return apiFetch(`/rides/${rideId}`, { method: 'DELETE' });
}
