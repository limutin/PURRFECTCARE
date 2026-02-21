# Connecting to your Supabase

To connect this project to your own Supabase instance, follow these steps:

## 1. Create a New Supabase Project
Go to [Supabase](https://supabase.com/) and create a new project.

## 2. Update Credentials
Open `src/utils/supabase/info.tsx` and replace the following values with your project credentials:
- `projectId`: Your Project ID (found in Project Settings > API)
- `publicAnonKey`: Your `anon` public key (found in Project Settings > API)

## 3. Set up the Database
Go to the **SQL Editor** in your Supabase dashboard and run the contents of the `supabase_setup.sql` file provided in this project. This will create the necessary `kv_store_b53d76e4` table.

## 4. Deploy Edge Functions
This project uses a Supabase Edge Function as a backend. You need to deploy it using the Supabase CLI:

1.  **Install Supabase CLI**:
    ```bash
    npm install supabase --save-dev
    ```
2.  **Login to Supabase**:
    ```bash
    npx supabase login
    ```
3.  **Initialize Supabase (if not already)**:
    ```bash
    npx supabase init
    ```
4.  **Link to your project**:
    ```bash
    npx supabase link --project-ref your-project-id
    ```
5.  **Deploy the function**:
    ```bash
    npx supabase functions deploy make-server-b53d76e4 --project-ref your-project-id
    ```

## 5. Set Environment Variables
The edge function requires some secrets to be set in Supabase:
```bash
npx supabase secrets set SUPABASE_URL=https://your-project-id.supabase.co
npx supabase secrets set SUPABASE_ANON_KEY=your-anon-key
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 6. Update functionName (Optional)
If you renamed your function during deployment, update the `functionName` in `src/utils/supabase/info.tsx`.
