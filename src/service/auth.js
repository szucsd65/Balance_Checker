import { supabase } from "../config/supabase.js";

export async function register(name, email, password) {
    const {data, error} = await supabase.auth.signUp({
        email, password, options: {
            data: {
                name: name
            }
        }
    });

    if (error) {
        throw error
    }
    return data
}

export async function login(email, password) {
    const {data, error} = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        throw error;
    }
    return data;
}

export async function logout() {
    const {error} = await supabase.auth.signOut();

    if (error) {
        throw error;
    }
}

export async function getUser() {
    const {data, error} = await supabase.auth.getUser();

    if (error) {
        throw error;
    }

    return data.user;
}

export function authChangeListener(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
} 