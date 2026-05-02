import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
const fromEmail = Deno.env.get('RESERVATION_FROM_EMAIL') || 'ISIFOOT <no-reply@isifoot.app>';

type ReservationRow = {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  visibility: 'public' | 'private';
};

function toDateTime(date: string, time: string) {
  return new Date(`${date}T${String(time).slice(0, 8)}`);
}

async function sendEmailReminder(email: string, matchLabel: string, startAt: string) {
  if (!resendApiKey) {
    return false;
  }

  const html = `
    <p>Rappel ISIFOOT:</p>
    <p>Votre reservation (${matchLabel}) commence dans 2 heures.</p>
    <p><strong>Debut:</strong> ${startAt}</p>
    <p>Bon match!</p>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: email,
      subject: 'ISIFOOT - Rappel match dans 2 heures',
      html,
    }),
  });

  return res.ok;
}

async function sendExpoPushIfToken(token: string, title: string, body: string) {
  // This path supports Expo push tokens only.
  if (!token.startsWith('ExponentPushToken[')) {
    return false;
  }

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      title,
      body,
      sound: 'default',
    }),
  });

  return res.ok;
}

Deno.serve(async () => {
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: 'Missing Supabase server env vars.' }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const now = new Date();
  const from = new Date(now.getTime() + (115 * 60 * 1000)); // 1h55
  const to = new Date(now.getTime() + (125 * 60 * 1000)); // 2h05

  const { data: reservations, error } = await admin
    .from('reservations')
    .select('id, user_id, date, start_time, visibility')
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  let remindersSent = 0;
  const matches = (reservations || []).filter((row: ReservationRow) => {
    const dt = toDateTime(row.date, row.start_time);
    return dt >= from && dt <= to;
  });

  for (const row of matches as ReservationRow[]) {
    const userRes = await admin.auth.admin.getUserById(row.user_id);
    const email = userRes.data.user?.email;
    const startAt = `${row.date} ${String(row.start_time).slice(0, 5)}`;
    const matchLabel = row.visibility === 'public' ? 'public' : 'prive';

    let ok = false;
    if (email) {
      ok = await sendEmailReminder(email, matchLabel, startAt);
    }

    const { data: tokens } = await admin
      .from('push_tokens')
      .select('device_token')
      .eq('user_id', row.user_id);

    if (tokens?.length) {
      for (const tokenRow of tokens) {
        const pushOk = await sendExpoPushIfToken(
          tokenRow.device_token,
          'ISIFOOT - Rappel',
          `Votre reservation commence a ${String(row.start_time).slice(0, 5)}`
        );
        ok = ok || pushOk;
      }
    }

    if (ok) {
      remindersSent += 1;
      await admin
        .from('reservations')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', row.id);
    }
  }

  return Response.json({
    ok: true,
    scanned: reservations?.length || 0,
    remindersSent,
  });
});
