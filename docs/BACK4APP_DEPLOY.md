# Back4App Containers Deployment

This repo should be deployed to Back4App as **three separate container apps**:

1. `affilia-api` -> root directory `apps/backend`
2. `affilia-frontend` -> root directory `apps/frontend`
3. `affilia-admin` -> root directory `apps/admin`

Back4App Containers requires a `Dockerfile` inside the selected app root. See Back4App docs:
- https://www.back4app.com/docs-containers
- https://www.back4app.com/docs-containers/prepare-your-deployment
- https://www.back4app.com/docs-containers/troubleshooting

## 1. Backend

Root directory:
```text
apps/backend
```

Required environment variables:
```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SECRET_KEY=
APP_URL=https://<your-frontend-domain>
ADMIN_URL=https://<your-admin-domain>
ENVIRONMENT=production
CORS_ALLOW_ORIGINS=https://<your-frontend-domain>,https://<your-admin-domain>
TRUSTED_HOSTS=<your-backend-domain>
MPESA_WEBHOOK_SECRET=
INTERNAL_WEBHOOK_SECRET=
OCR_SPACE_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
SENDGRID_API_KEY=
BACKEND_TIMEOUT_SECONDS=10
```

## 2. Frontend

Root directory:
```text
apps/frontend
```

Required environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_API_URL=https://<your-backend-domain>
NEXT_PUBLIC_APP_URL=https://<your-frontend-domain>
NEXT_PUBLIC_ADMIN_URL=https://<your-admin-domain>
```

## 3. Admin

Root directory:
```text
apps/admin
```

Required environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_API_URL=https://<your-backend-domain>
NEXT_PUBLIC_APP_URL=https://<your-frontend-domain>
NEXT_PUBLIC_ADMIN_URL=https://<your-admin-domain>
```

## Order

Deploy in this order:

1. backend
2. frontend
3. admin

Then update the frontend/admin `NEXT_PUBLIC_API_URL` to the actual backend URL if Back4App assigns a different hostname than expected.

## Notes

- Back4App routes traffic to the container port you expose. These Dockerfiles start Next.js on `PORT`.
- Do not commit real secrets to the repo.
- Rotate any secret that was pasted into chat or local files.
