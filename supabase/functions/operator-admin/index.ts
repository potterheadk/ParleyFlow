import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const authHeader = req.headers.get("Authorization");

        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing Authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Client using logged-in admin token
        const userClient = createClient(supabaseUrl, anonKey, {
            global: {
                headers: {
                    Authorization: authHeader,
                },
            },
        });

        // Admin client using service role key
        const adminClient = createClient(supabaseUrl, serviceRoleKey);

        // Verify logged-in user
        const {
            data: { user },
            error: userError,
        } = await userClient.auth.getUser();

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Invalid logged-in user" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check if logged-in user is admin
        const { data: profile, error: profileError } = await adminClient
            .from("profiles")
            .select("id, role, active")
            .eq("id", user.id)
            .single();

        if (profileError || !profile || profile.role !== "admin" || profile.active !== true) {
            return new Response(
                JSON.stringify({ error: "Only active admin can manage operators" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const body = await req.json();
        const { action } = body;

        // ==============================
        // CREATE OPERATOR
        // ==============================
        if (action === "create") {
            const { email, password, username, full_name } = body;

            if (!email || !password || !username || !full_name) {
                return new Response(
                    JSON.stringify({
                        error: "email, password, username, and full_name are required",
                    }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Create Supabase Auth user
            const { data: authData, error: authError } =
                await adminClient.auth.admin.createUser({
                    email,
                    password,
                    email_confirm: true,
                    user_metadata: {
                        username,
                        full_name,
                        role: "operator",
                    },
                });

            if (authError || !authData.user) {
                return new Response(
                    JSON.stringify({ error: authError?.message || "Failed to create auth user" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const operatorId = authData.user.id;

            // Insert profile row
            const { error: insertError } = await adminClient.from("profiles").insert({
                id: operatorId,
                username,
                full_name,
                role: "operator",
                active: true,
            });

            if (insertError) {
                // Rollback auth user if profile insert fails
                await adminClient.auth.admin.deleteUser(operatorId);

                return new Response(
                    JSON.stringify({ error: insertError.message }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    message: "Operator created successfully",
                    operator: {
                        id: operatorId,
                        email,
                        username,
                        full_name,
                        role: "operator",
                        active: true,
                    },
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ==============================
        // DISABLE OPERATOR
        // ==============================
        if (action === "disable") {
            const { operator_id } = body;

            if (!operator_id) {
                return new Response(
                    JSON.stringify({ error: "operator_id is required" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const { error: updateError } = await adminClient
                .from("profiles")
                .update({ active: false })
                .eq("id", operator_id)
                .eq("role", "operator");

            if (updateError) {
                return new Response(
                    JSON.stringify({ error: updateError.message }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    message: "Operator disabled successfully",
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ==============================
        // ENABLE OPERATOR
        // ==============================
        if (action === "enable") {
            const { operator_id } = body;

            if (!operator_id) {
                return new Response(
                    JSON.stringify({ error: "operator_id is required" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            const { error: updateError } = await adminClient
                .from("profiles")
                .update({ active: true })
                .eq("id", operator_id)
                .eq("role", "operator");

            if (updateError) {
                return new Response(
                    JSON.stringify({ error: updateError.message }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    message: "Operator enabled successfully",
                }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ error: "Invalid action" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        return new Response(
            JSON.stringify({ error: err.message || "Unexpected server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
