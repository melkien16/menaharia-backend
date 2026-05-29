import { AdminService } from './admin.service';

describe('AdminService', () => {
  const prisma = {
    user: { count: jest.fn() },
    operator: { count: jest.fn() },
    bus: { count: jest.fn() },
    route: { count: jest.fn() },
    trip: { count: jest.fn() },
    booking: { count: jest.fn() },
    payment: { count: jest.fn() },
    tripSeat: { count: jest.fn() },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('aggregates dashboard metrics', async () => {
    prisma.user.count.mockResolvedValue(10);
    prisma.operator.count.mockResolvedValue(2);
    prisma.bus.count.mockResolvedValue(3);
    prisma.route.count.mockResolvedValue(4);
    prisma.trip.count.mockResolvedValue(5);
    prisma.booking.count.mockResolvedValueOnce(6).mockResolvedValueOnce(7);
    prisma.payment.count.mockResolvedValue(8);
    prisma.tripSeat.count.mockResolvedValueOnce(9).mockResolvedValueOnce(10);

    const service = new AdminService(prisma);
    const result = await service.dashboard({ from: '2026-01-01', to: '2026-01-31' } as any);

    expect(result).toEqual({
      users: 10,
      operators: 2,
      buses: 3,
      routes: 4,
      trips: 5,
      bookings: {
        pending: 6,
        confirmed: 7,
      },
      payments: {
        successful: 8,
      },
      seats: {
        reserved: 9,
        booked: 10,
      },
    });
  });
});
