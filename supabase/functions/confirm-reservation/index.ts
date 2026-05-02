import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response('Missing Supabase server env vars.', { status: 500 });
  }

  const url = new URL(req.url);
  const reservationId = url.searchParams.get('reservationId');
  const token = url.searchParams.get('token');

  if (!reservationId || !token) {
    return new Response('Invalid confirmation link.', { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await admin.rpc('confirm_reservation_by_token', {
    _reservation_id: reservationId,
    _token: token,
  });

  if (error || !data) {
    return new Response(
      'This confirmation link is invalid, expired, or already used.',
      { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  return new Response(
    'Reservation confirmed successfully. You can return to the ISIFOOT app.',
    { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
});
