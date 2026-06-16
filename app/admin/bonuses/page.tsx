import { supabaseAdmin } from '../../../lib/supabase';

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

async function getUsers(secret?: string) {
  if (!secret || secret !== process.env.ADMIN_SECRET) return null;

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id,name,phone,telegram_username,points,tickets,created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return { error: error.message };
  return { users: data || [] };
}

function BonusLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} style={{ border: '1px solid rgba(200,161,90,.45)', borderRadius: 999, padding: '7px 11px', color: '#c8a15a', fontSize: 12, whiteSpace: 'nowrap' }}>
      {label}
    </a>
  );
}

export default async function BonusesPage({ searchParams }: { searchParams: Promise<{ secret?: string }> }) {
  const params = await searchParams;
  const secret = params.secret || '';
  const result = await getUsers(secret);

  if (!result) {
    return (
      <main style={{ padding: 40 }}>
        <h1>Начисление бонусов</h1>
        <p>Добавь к ссылке секрет: /admin/bonuses?secret=...</p>
      </main>
    );
  }

  if ('error' in result) {
    return <main style={{ padding: 40 }}><h1>Ошибка</h1><pre>{result.error}</pre></main>;
  }

  const users = result.users as UserRow[];

  return (
    <main style={{ padding: 40, maxWidth: 1180, margin: '0 auto' }}>
      <a href={`/admin?secret=${secret}`} style={{ color: '#c8a15a' }}>Назад в админку</a>
      <h1 style={{ fontSize: 42 }}>Начисление бонусов</h1>
      <p style={{ color: '#d7c7ad' }}>Кнопки начисляют баллы и билеты участнику. Использовать только после реального действия клиента.</p>

      <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, marginTop: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: '#c8a15a', textAlign: 'left' }}>
              <th style={{ padding: 14 }}>Имя</th>
              <th style={{ padding: 14 }}>Телефон</th>
              <th style={{ padding: 14 }}>Баллы</th>
              <th style={{ padding: 14 }}>Билеты</th>
              <th style={{ padding: 14 }}>Начислить</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
                <td style={{ padding: 14 }}>{user.name || user.telegram_username || '-'}</td>
                <td style={{ padding: 14 }}>{user.phone || '-'}</td>
                <td style={{ padding: 14 }}>{user.points}</td>
                <td style={{ padding: 14 }}>{user.tickets}</td>
                <td style={{ padding: 14 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <BonusLink href={`/api/admin/user-bonus?secret=${secret}&id=${user.id}&type=salon`} label="+20 000 салон" />
                    <BonusLink href={`/api/admin/user-bonus?secret=${secret}&id=${user.id}&type=purchase`} label="+50 000 покупка" />
                    <BonusLink href={`/api/admin/user-bonus?secret=${secret}&id=${user.id}&type=vip`} label="+100 000 VIP" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
