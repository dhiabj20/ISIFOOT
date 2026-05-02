import { createClient } from 'npm:@supabase/supabase-js@2';

type Payload = {
  reservationId?: string;
  confirmationToken?: string;
  email?: string;
  fullName?: string;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
const fromEmail = Deno.env.get('RESERVATION_FROM_EMAIL') || 'ISIFOOT <no-reply@isifoot.app>';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: 'Missing Supabase server env vars.' }, { status: 500 });
  }

  if (!resendApiKey) {
    return Response.json({ error: 'Missing RESEND_API_KEY secret.' }, { status: 500 });
  }

  const payload = (await req.json()) as Payload;
  if (!payload.reservationId || !payload.confirmationToken || !payload.email) {
    return Response.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: reservation } = await admin
    .from('reservations')
    .select('id, user_id, status, confirmation_token, confirmation_deadline, date, start_time')
    .eq('id', payload.reservationId)
    .single();

  if (!reservation) {
    return Response.json({ error: 'Reservation not found.' }, { status: 404 });
  }

  if (
    reservation.status !== 'pending_confirmation' ||
    reservation.confirmation_token !== payload.confirmationToken
  ) {
    return Response.json({ error: 'Reservation is no longer confirmable.' }, { status: 400 });
  }

  const confirmUrl =
    `${supabaseUrl}/functions/v1/confirm-reservation` +
    `?reservationId=${encodeURIComponent(payload.reservationId)}` +
    `&token=${encodeURIComponent(payload.confirmationToken)}`;

  const deadlineLabel = reservation.confirmation_deadline
    ? new Date(reservation.confirmation_deadline).toLocaleString('fr-FR')
    : '15 minutes';

  const emailBody = {
    from: fromEmail,
    to: payload.email,
    subject: 'ISIFOOT - Confirmez votre reservation',
    html: `
      <p>Bonjour ${payload.fullName || 'joueur'},</p>
      <p>Votre reservation ISIFOOT est en attente de confirmation.</p>
      <p><strong>Date:</strong> ${reservation.date} - ${String(reservation.start_time).slice(0, 5)}</p>
      <p>Confirmez avant <strong>${deadlineLabel}</strong> sinon la reservation sera annulee automatiquement.</p>
      <p><a href="${confirmUrl}">Confirmer ma reservation</a></p>
      <p>ISIFOOT Team</p>
    `,
  };

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailBody),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text();
    return Response.json({ error: `Email send failed: ${errText}` }, { status: 502 });
  }

  return Response.json({ ok: true });
});
