import { supabaseAdmin } from '../../lib/supabase';

export const dynamic = 'force-dynamic';

type UserRow = {
  id: string;
  name: string | null;
  phone: string | null;
  telegram_username: string | null;
  points: number;
  tickets: number;
  created_at: string;
};

type LeadRow = {
  id: string;
  name: string | null;
  phone: string | null;
  interest: string | null;
  room_type: string | null;
  budget: string | null;
  comment: string | null;
  status: string;
  created_at: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    new: 'Новая',
    contacted: 'В работе',
    visited: 'Был в салоне',
    won: 'Купил',
    lost: 'Отказ',
    profile_draft: 'Квиз не завершён',
  };
  return labels[status] || status;
}

function profileFromComment(comment?: string | null) {
  if (!comment) return null;
  try {
    return JSON.parse(comment) as { style?: string; timeline?: string; source?: string };
  } catch {
    return null;
  }
}

function leadProfileText(lead: LeadRow) {
  const profile = profileFromComment(lead.comment);
  const parts = [
    lead.room_type ? `Комната: ${lead.room_type}` : null,
    profile?.style ? `Стиль: ${profile.style}` : null,
    lead.budget ? `Бюджет: ${lead.budget}` : null,
    profile?.timeline ? `Срок: ${profile.timeline}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(' / ') : lead.interest || '-';
}

async function getData(secret?: string) {
  if (!secret || secret !== process.env.ADMIN_SECRET) return null;

  try {
    const date = today();

    const usersCountQuery = supabaseAdmin.from('users').select('*', { count: 'exact', head: true });
    const leadsCountQuery = supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).neq('status', 'profile_draft');
    const boxesCountQuery = supabaseAdmin.from('daily_boxes').select('*', { count: 'exact', head: true }).eq('opened_date', date);
    const usersQuery = supabaseAdmin.from('users').select('id,name,phone,telegram_username,points,tickets,created_at').order('created_at', { ascending: false }).limit(20);
    const leadsQuery = supabaseAdmin.from('leads').select('id,name,phone,interest,room_type,budget,comment,status,created_at').neq('status', 'profile_draft').order('created_at', { ascending: false }).limit(30);
    const drawQuery = supabaseAdmin.from('draws').select('id,winner_user_id,prize_title').eq('draw_date', date).eq('draw_type', 'daily').maybeSingle();

    const [usersCount, leadsCount, todayBoxesCount, users, leads, draw] = await Promise.all([
      usersCountQuery,
      leadsCountQuery,
      boxesCountQuery,
      usersQuery,
      leadsQuery,
      drawQuery,
    ]);

    const errors = [usersCount.error, leadsCount.error, todayBoxesCount.error, users.error, leads.error, draw.error].filter(Boolean);
    if (errors.length) {
      return { error: errors.map((item: any) => item.message).join('; ') };
    }

    let drawResult = null;
    if (draw.data?.winner_user_id) {
      const winner = await supabaseAdmin
        .from('users')
        .select('name,phone,telegram_username,tickets')
        .eq('id', draw.data.winner_user_id)
        .maybeSingle();

      drawResult = {
        name: winner.data?.name || winner.data?.telegram_username || null,
        phone: winner.data?.phone || null,
        telegram: winner.data?.telegram_username || null,
        tickets: winner.data?.tickets || 0,
        prize: draw.data.prize_title,
      };
    }

    return {
      usersCount: usersCount.count || 0,
      leadsCount: leadsCount.count || 0,
      todayBoxesCount: todayBoxesCount.count || 0,
      users: users.data || [],
      leads: leads.data || [],
      drawResult,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown admin error' };
  }
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div style={{ border: '1px solid rgba(200,161,90,.35)', borderRadius: 20, padding: 22, background: 'rgba(255,255,255,.04)' }}>
      <div style={{ color: '#c8a15a', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</div>
      <div style={{ fontSize: 42, fontWeight: 800, marginTop: 10 }}>{value}</div>
    </div>
  );
}

function StatusActions({ lead, secret }: { lead: LeadRow; secret: string }) {
  const statuses = [
    ['contacted', 'В работе'],
    ['visited', 'Был в салоне'],
    ['won', 'Купил'],
    ['lost', 'Отказ'],
  ];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {statuses.map(([status, label]) => (
        <a
          key={status}
          href={`/api/admin/lead-status?secret=${secret}&id=${lead.id}&status=${status}`}
          style={{
            border: '1px solid rgba(200,161,90,.35)',
            borderRadius: 999,
            padding: '6px 10px',
            fontSize: 12,
            color: lead.status === status ? '#15100c' : '#c8a15a',
            background: lead.status === status ? '#c8a15a' : 'transparent',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </a>
      ))}
    </div>
  );
}

function Table({ rows, type, secret }: { rows: Array<UserRow | LeadRow>; type: 'users' | 'leads'; secret: string }) {
  if (!rows.length) {
    return <div style={{ color: '#b9aa91', padding: 18, border: '1px solid rgba(255,255,255,.08)', borderRadius: 16 }}>Пока пусто</div>;
  }

  return (
    <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: '#c8a15a', textAlign: 'left' }}>
            <th style={{ padding: 14 }}>Имя</th>
            <th style={{ padding: 14 }}>Телефон</th>
            {type === 'users' ? <th style={{ padding: 14 }}>Баллы</th> : <th style={{ padding: 14 }}>Потребность</th>}
            {type === 'users' ? <th style={{ padding: 14 }}>Билеты</th> : <th style={{ padding: 14 }}>Статус</th>}
            <th style={{ padding: 14 }}>Дата</th>
            {type === 'leads' ? <th style={{ padding: 14 }}>Действия</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
              <td style={{ padding: 14 }}>{row.name || '-'}</td>
              <td style={{ padding: 14 }}>{row.phone || ('telegram_username' in row && row.telegram_username ? '@' + row.telegram_username : '-')}</td>
              {'points' in row ? <td style={{ padding: 14 }}>{row.points}</td> : <td style={{ padding: 14, minWidth: 340 }}>{leadProfileText(row)}</td>}
              {'tickets' in row ? <td style={{ padding: 14 }}>{row.tickets}</td> : <td style={{ padding: 14 }}>{statusLabel(row.status)}</td>}
              <td style={{ padding: 14 }}>{new Date(row.created_at).toLocaleDateString('ru-RU')}</td>
              {'status' in row ? <td style={{ padding: 14 }}><StatusActions lead={row} secret={secret} /></td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ secret?: string }> }) {
  const params = await searchParams;
  const secret = params.secret || '';
  const data = await getData(secret);

  if (!data) {
    return (
      <main style={{ padding: 40 }}>
        <h1>Админка RichHouse Game</h1>
        <p>Добавь к ссылке секрет: /admin?secret=...</p>
      </main>
    );
  }

  if ('error' in data) {
    return (
      <main style={{ padding: 40, maxWidth: 900, margin: '0 auto' }}>
        <h1>Админка RichHouse Game</h1>
        <div style={{ border: '1px solid #c8a15a', borderRadius: 16, padding: 20, color: '#f5efe5' }}>
          <b>Ошибка админки:</b>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{data.error}</pre>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 40, maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'center', marginBottom: 30 }}>
        <div>
          <div style={{ color: '#c8a15a', letterSpacing: 2, textTransform: 'uppercase' }}>RichHouse CRM</div>
          <h1 style={{ margin: '8px 0 0', fontSize: 42 }}>Панель продаж</h1>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href={`/admin/bonuses?secret=${secret}`} style={{ border: '1px solid #c8a15a', color: '#c8a15a', padding: '14px 18px', borderRadius: 14, fontWeight: 800 }}>Бонусы клиентам</a>
          <a href={`/api/admin/export?secret=${secret}`} style={{ border: '1px solid #c8a15a', color: '#c8a15a', padding: '14px 18px', borderRadius: 14, fontWeight: 800 }}>Скачать заявки CSV</a>
          <a href={`/api/admin/draw?secret=${secret}`} style={{ background: '#c8a15a', color: '#15100c', padding: '14px 18px', borderRadius: 14, fontWeight: 800 }}>Провести розыгрыш дня</a>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 34 }}>
        <Card title="Участники" value={data.usersCount} />
        <Card title="Заявки" value={data.leadsCount} />
        <Card title="Открыли сегодня" value={data.todayBoxesCount} />
      </div>

      {data.drawResult ? (
        <div style={{ border: '1px solid rgba(200,161,90,.45)', borderRadius: 20, padding: 20, marginBottom: 28, background: 'rgba(200,161,90,.08)' }}>
          <b>Победитель дня:</b> {data.drawResult.name || 'Участник'} — билетов: {data.drawResult.tickets}
        </div>
      ) : null}

      <h2>Последние заявки</h2>
      <Table rows={data.leads} type="leads" secret={secret} />
      <h2 style={{ marginTop: 34 }}>Последние участники</h2>
      <Table rows={data.users} type="users" secret={secret} />
    </main>
  );
}
