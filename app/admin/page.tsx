async function getData(secret?: string) {
  if (!secret) return null;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/admin/dashboard?secret=${secret}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ secret?: string }> }) {
  const params = await searchParams;
  const data = await getData(params.secret);

  if (!data) {
    return (
      <main style={{ padding: 40 }}>
        <h1>Админка RichHouse Game</h1>
        <p>Добавь к ссылке секрет: /admin?secret=...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Админка RichHouse Game</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div><b>Участники</b><br />{data.usersCount}</div>
        <div><b>Заявки</b><br />{data.leadsCount}</div>
        <div><b>Открыли сегодня</b><br />{data.todayBoxesCount}</div>
      </div>
      <h2>Последние заявки</h2>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(data.leads, null, 2)}</pre>
      <h2>Последние участники</h2>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(data.users, null, 2)}</pre>
    </main>
  );
}
