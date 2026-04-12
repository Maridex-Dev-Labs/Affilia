# Deployment Guide

- Frontend: Vercel
- Admin: Vercel
- Backend: Render

## Supabase Storage (S3-compatible)

Run `database/migrations/006_storage.sql` in the Supabase SQL editor to create buckets and policies:
- `merchant-docs` (private)
- `product-images` (public)
- `avatars` (public)
- `receipts` (private)

## Environment Variables

Use the `.env.local` files in each app and set the same values in Vercel/Render.
