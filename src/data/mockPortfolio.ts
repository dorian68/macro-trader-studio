export interface MockTrade {
  id: string;
  instrument: string;
  size: number;
  direction: 'long' | 'short';
  entry: number;
  exit: number;
  pnl: number;
  duration: string;
  timestamp: string;
  leverage: number;
}

export const mockTrades: MockTrade[] = [
  {
    id: "1",
    instrument: "EUR/USD",
    size: 1.0,
    direction: "long",
    entry: 1.1050,
    exit: 1.1150,
    pnl: 150,
    duration: "2h",
    timestamp: "2025-09-28T10:00:00Z",
    leverage: 50
  },
  {
    id: "2",
    instrument: "BTC/USD",
    size: 0.2,
    direction: "short",
    entry: 30000,
    exit: 30500,
    pnl: -100,
    duration: "1d",
    timestamp: "2025-09-27T08:00:00Z",
    leverage: 100
  },
  {
    id: "3",
    instrument: "GBP/USD",
    size: 0.5,
    direction: "long",
    entry: 1.2500,
    exit: 1.2580,
    pnl: 200,
    duration: "3h",
    timestamp: "2025-09-26T14:00:00Z",
    leverage: 30
  },
  {
    id: "4",
    instrument: "GOLD",
    size: 0.3,
    direction: "long",
    entry: 2050,
    exit: 2080,
    pnl: 450,
    duration: "5d",
    timestamp: "2025-09-25T09:00:00Z",
    leverage: 20
  },
  {
    id: "5",
    instrument: "EUR/USD",
    size: 1.5,
    direction: "short",
    entry: 1.1200,
    exit: 1.1100,
    pnl: 300,
    duration: "4h",
    timestamp: "2025-09-24T11:00:00Z",
    leverage: 50
  },
  {
    id: "6",
    instrument: "ETH/USD",
    size: 0.5,
    direction: "long",
    entry: 2000,
    exit: 1950,
    pnl: -250,
    duration: "2d",
    timestamp: "2025-09-23T16:00:00Z",
    leverage: 75
  },
  {
    id: "7",
    instrument: "USD/JPY",
    size: 1.2,
    direction: "long",
    entry: 150.50,
    exit: 151.20,
    pnl: 280,
    duration: "6h",
    timestamp: "2025-09-22T13:00:00Z",
    leverage: 40
  },
  {
    id: "8",
    instrument: "BTC/USD",
    size: 0.1,
    direction: "long",
    entry: 29500,
    exit: 30200,
    pnl: 70,
    duration: "3d",
    timestamp: "2025-09-21T10:00:00Z",
    leverage: 100
  },
  {
    id: "9",
    instrument: "GOLD",
    size: 0.4,
    direction: "short",
    entry: 2100,
    exit: 2120,
    pnl: -400,
    duration: "2d",
    timestamp: "2025-09-20T15:00:00Z",
    leverage: 20
  },
  {
    id: "10",
    instrument: "EUR/USD",
    size: 2.0,
    direction: "long",
    entry: 1.1000,
    exit: 1.1100,
    pnl: 400,
    duration: "1h",
    timestamp: "2025-09-19T09:00:00Z",
    leverage: 50
  },
  {
    id: "11",
    instrument: "GBP/USD",
    size: 0.8,
    direction: "short",
    entry: 1.2700,
    exit: 1.2650,
    pnl: 200,
    duration: "5h",
    timestamp: "2025-09-18T12:00:00Z",
    leverage: 30
  },
  {
    id: "12",
    instrument: "ETH/USD",
    size: 0.3,
    direction: "long",
    entry: 1900,
    exit: 1980,
    pnl: 120,
    duration: "4d",
    timestamp: "2025-09-17T08:00:00Z",
    leverage: 75
  },
  {
    id: "13",
    instrument: "USD/JPY",
    size: 1.0,
    direction: "short",
    entry: 152.00,
    exit: 151.50,
    pnl: 165,
    duration: "3h",
    timestamp: "2025-09-16T14:00:00Z",
    leverage: 40
  },
  {
    id: "14",
    instrument: "BTC/USD",
    size: 0.25,
    direction: "short",
    entry: 31000,
    exit: 31500,
    pnl: -125,
    duration: "1d",
    timestamp: "2025-09-15T11:00:00Z",
    leverage: 100
  },
  {
    id: "15",
    instrument: "GOLD",
    size: 0.6,
    direction: "long",
    entry: 2030,
    exit: 2070,
    pnl: 600,
    duration: "6d",
    timestamp: "2025-09-14T10:00:00Z",
    leverage: 20
  },
  {
    id: "16",
    instrument: "EUR/USD",
    size: 1.8,
    direction: "short",
    entry: 1.1300,
    exit: 1.1450,
    pnl: -540,
    duration: "2h",
    timestamp: "2025-09-13T15:00:00Z",
    leverage: 50
  },
  {
    id: "17",
    instrument: "GBP/USD",
    size: 0.6,
    direction: "long",
    entry: 1.2400,
    exit: 1.2470,
    pnl: 210,
    duration: "7h",
    timestamp: "2025-09-12T09:00:00Z",
    leverage: 30
  },
  {
    id: "18",
    instrument: "ETH/USD",
    size: 0.4,
    direction: "short",
    entry: 2050,
    exit: 2020,
    pnl: 60,
    duration: "3d",
    timestamp: "2025-09-11T13:00:00Z",
    leverage: 75
  }
];
