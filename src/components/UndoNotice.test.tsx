// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UndoNotice, type UndoMessage } from './UndoNotice';

const message = (id: number): UndoMessage => ({ id, text: `Notice ${id}`, undo: vi.fn() });
const advance = (milliseconds: number) =>
  act(() => {
    vi.advanceTimersByTime(milliseconds);
  });

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Undo notice dismissal', () => {
  it('dismisses automatically after 5 seconds without a reload', () => {
    const dismiss = vi.fn();
    render(<UndoNotice notice={message(1)} onDismiss={dismiss} />);
    advance(4999);
    expect(dismiss).not.toHaveBeenCalled();
    advance(1);
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it('pauses while hovered and starts a fresh timer when the pointer leaves', () => {
    const dismiss = vi.fn();
    render(<UndoNotice notice={message(1)} onDismiss={dismiss} />);
    const notice = screen.getByRole('status').parentElement!;
    advance(2500);
    fireEvent.mouseEnter(notice);
    advance(40000);
    expect(dismiss).not.toHaveBeenCalled();
    fireEvent.mouseLeave(notice);
    advance(4999);
    expect(dismiss).not.toHaveBeenCalled();
    advance(1);
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it('does not keep a later message paused after using Undo on a focused message', () => {
    const dismiss = vi.fn();
    const first = message(1);
    const view = render(<UndoNotice notice={first} onDismiss={dismiss} />);
    const undo = screen.getByRole('button', { name: 'Undo' });
    fireEvent.focus(undo);
    fireEvent.click(undo);
    expect(first.undo).toHaveBeenCalledOnce();
    view.rerender(<UndoNotice notice={null} onDismiss={dismiss} />);
    view.rerender(<UndoNotice notice={message(2)} onDismiss={dismiss} />);
    advance(5000);
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it('continues pausing for keyboard focus after the mouse leaves', () => {
    const dismiss = vi.fn();
    render(<UndoNotice notice={message(1)} onDismiss={dismiss} />);
    const notice = screen.getByRole('status').parentElement!;
    const undo = screen.getByRole('button', { name: 'Undo' });
    fireEvent.focus(undo);
    fireEvent.mouseEnter(notice);
    fireEvent.mouseLeave(notice);
    advance(20000);
    expect(dismiss).not.toHaveBeenCalled();
    fireEvent.blur(undo, { relatedTarget: document.body });
    advance(5000);
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it('does not restart the countdown when its parent rerenders', () => {
    const firstDismiss = vi.fn();
    const latestDismiss = vi.fn();
    const view = render(<UndoNotice notice={message(1)} onDismiss={firstDismiss} />);
    advance(2500);
    view.rerender(<UndoNotice notice={message(1)} onDismiss={latestDismiss} />);
    advance(2500);
    expect(firstDismiss).not.toHaveBeenCalled();
    expect(latestDismiss).toHaveBeenCalledOnce();
  });
});
