import { renderHook, act } from '@testing-library/react';
import { useStatusPoller } from '@/hooks/use-status-poller';

// Mock next/navigation
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/readings/test-id',
}));

// Helper: make fetch resolve with a given JSON body and optional status code
function mockFetch(body: unknown, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockReplace.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('useStatusPoller', () => {
  it('does not call navigate or set failed before the first interval fires', () => {
    mockFetch({ status: 'generating' });
    const { result } = renderHook(() => useStatusPoller('/api/test/123', 1000));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.failed).toBe(false);
  });

  it('navigates via replace when { status: "ready" }', async () => {
    mockFetch({ status: 'ready' });
    renderHook(() => useStatusPoller('/api/test/123', 1000));

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/test/123');
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/readings/test-id');
  });

  it('sets failed when { status: "error" }', async () => {
    mockFetch({ status: 'error' });
    const { result } = renderHook(() => useStatusPoller('/api/test/123', 1000));

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.failed).toBe(true);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does nothing for intermediate statuses', async () => {
    mockFetch({ status: 'generating' });
    const { result } = renderHook(() => useStatusPoller('/api/test/123', 1000));

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.failed).toBe(false);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('handles nested { report: { status: "ready" } } response shape', async () => {
    mockFetch({ report: { status: 'ready' } });
    renderHook(() => useStatusPoller('/api/compatibility/123', 1000));

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('handles nested { report: { status: "error" } } response shape', async () => {
    mockFetch({ report: { status: 'error' } });
    const { result } = renderHook(() => useStatusPoller('/api/compatibility/123', 1000));

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.failed).toBe(true);
  });

  it('silently ignores non-ok HTTP responses', async () => {
    mockFetch({ status: 'ready' }, 500);
    const { result } = renderHook(() => useStatusPoller('/api/test/123', 1000));

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.failed).toBe(false);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('silently ignores network errors and retries on next tick', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useStatusPoller('/api/test/123', 1000));

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.failed).toBe(false);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('polls at the given interval', async () => {
    mockFetch({ status: 'generating' });
    renderHook(() => useStatusPoller('/api/test/123', 500));

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it('clears the interval on unmount', async () => {
    mockFetch({ status: 'generating' });
    const { unmount } = renderHook(() => useStatusPoller('/api/test/123', 1000));

    unmount();

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
