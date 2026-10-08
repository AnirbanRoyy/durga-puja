function required(name: string, value: string | undefined): string {
    if (!value) {
        throw new Error(`Missing environment variable ${name}. See .env.example.`);
    }
    return value;
}

// NEXT_PUBLIC_* values must be referenced literally so Next.js can inline them in client bundles.
export const publicEnv = {
    supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: () =>
        required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
};

export const serverEnv = {
    supabaseServiceRoleKey: () =>
        required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
    cloudinaryApiSecret: () => required("CLOUDINARY_API_SECRET", process.env.CLOUDINARY_API_SECRET),
    adminPassword: () => required("ADMIN_PASSWORD", process.env.ADMIN_PASSWORD),
    voterHashSecret: () => required("VOTER_HASH_SECRET", process.env.VOTER_HASH_SECRET),
};
