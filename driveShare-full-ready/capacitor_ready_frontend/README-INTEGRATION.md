# Frontend wired to the current backend

## Backend contract used
- `POST /api/users/register`
- `POST /api/users/login`
- `POST /api/rides`
- `GET /api/rides`
- `GET /api/rides/my-rides`
- `GET /api/rides/joined-rides`
- `POST /api/rides/:rideId/request`
- `GET /api/rides/:rideId/requests`
- `POST /api/rides/:rideId/requests/:requestId/accept`
- `POST /api/rides/:rideId/requests/:requestId/reject`
- `DELETE /api/rides/:rideId`

## Important backend limitations that still affect the UI
The current backend does **not** expose:
- `GET /api/users/me`
- `GET /api/rides/:id`
- joined user profile details for driver/request cards
- ride origin coordinates in the ride model

Because of that, the frontend now:
- fetches all rides and filters one by id client-side
- shows driver/request ids where full profile data is unavailable
- keeps a small local session cache for name/phone after register/login
- uses the map mainly to pick passenger pickup location

## API base URL
The frontend computes the API base URL automatically:
- browser localhost -> `http://localhost:5000/api`
- Android emulator fallback -> `http://10.0.2.2:5000/api`
- LAN fallback -> `http://<current-host>:5000/api`

You can override it manually from the browser console:
```js
localStorage.setItem('api_base_url', 'http://YOUR-IP:5000/api')
```

## Capacitor
```bash
npm install
npx cap add android
npx cap sync
```
