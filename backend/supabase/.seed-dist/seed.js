"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const supabase_js_1 = require("@supabase/supabase-js");
const ws_1 = __importDefault(require("ws"));
function loadLocalEnv() {
    const envPath = (0, node_path_1.resolve)(process.cwd(), '.env.local');
    if (!(0, node_fs_1.existsSync)(envPath))
        return;
    const lines = (0, node_fs_1.readFileSync)(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('='))
            continue;
        const [key, ...valueParts] = trimmed.split('=');
        process.env[key.trim()] ??= valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
}
function getRequiredEnv(name) {
    const value = process.env[name]?.trim();
    if (!value || value.includes('your-')) {
        throw new Error(`Missing ${name}. Add a real value to .env.local before seeding.`);
    }
    return value;
}
async function main() {
    loadLocalEnv();
    const supabaseUrl = getRequiredEnv('SUPABASE_URL');
    const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const ownerEmail = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase() || 'demo@example.com';
    const supabase = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
        realtime: {
            transport: ws_1.default,
        },
    });
    const { error } = await supabase
        .from('notes')
        .upsert({
        owner_email: ownerEmail,
        title: 'Welcome note',
        body: 'Your Supabase notes backend is ready.',
        color: 'mint',
        pinned: true,
    }, {
        onConflict: 'owner_email,title',
        ignoreDuplicates: false,
    });
    if (error)
        throw error;
    console.log(`Seeded notes for ${ownerEmail}`);
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
