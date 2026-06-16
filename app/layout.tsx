import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'RichHouse Деньги в Дом',
  description: 'Ежедневная игра RichHouse с баллами, билетами и розыгрышами для обновления интерьера.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
