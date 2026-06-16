export type Reward = {
  type: 'points' | 'tickets' | 'gift';
  title: string;
  points: number;
  tickets: number;
  gift: string | null;
};

const rewards: Reward[] = [
  { type: 'points', title: '100 баллов', points: 100, tickets: 1, gift: null },
  { type: 'points', title: '300 баллов', points: 300, tickets: 1, gift: null },
  { type: 'points', title: '500 баллов', points: 500, tickets: 1, gift: null },
  { type: 'tickets', title: '2 билета', points: 100, tickets: 2, gift: null },
  { type: 'gift', title: 'Подарок к покупке', points: 100, tickets: 1, gift: 'Подарок к покупке мебели' },
  { type: 'gift', title: 'Бонус на доставку', points: 100, tickets: 1, gift: 'Спецусловие на доставку' },
];

export function getRandomReward(): Reward {
  return rewards[Math.floor(Math.random() * rewards.length)];
}
